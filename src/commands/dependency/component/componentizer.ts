import {core, SfdxCommand} from '@salesforce/command';
import assert = require('assert');
import {join} from 'path';
import {ClusterPackager } from '../../../lib/clusterPackager';
import {ComponentGraph} from '../../../lib/componentGraph';
import {FileWriter} from '../../../lib/fileWriter';
import {Node, NodeGroup, ScalarNode } from '../../../lib/NodeDefs';
import {Connection} from '@salesforce/core';

core.Messages.importMessagesDirectory(join(__dirname));
const messages = core.Messages.loadMessages('dependencies-cli', 'componentizer');

export default class Analyze extends SfdxCommand {
    public static outputFolder = 'lib/';

    public static description = messages.getMessage('commandDescription');
    public static examples = [messages.getMessage('example')];

    public static args = [{name: 'file'}];

    protected static requiresUsername = true;

    // tslint:disable-next-line:no-any
    public static buildGraph(results: any, connectAuras: boolean = false, forwards: boolean = true, backwards: boolean = false): ComponentGraph {
        const graph: ComponentGraph = new ComponentGraph();
        for (const edge of results) {
            if (edge.RefMetadataComponentName.startsWith('0')) {
                continue;
              }
            const srcId: string = edge.MetadataComponentId;
            const srcName = Analyze.makeName(edge.MetadataComponentNamespace, edge.MetadataComponentName);
            const srcType = edge.MetadataComponentType;

            const dstId: string = edge.RefMetadataComponentId;
            const dstName = Analyze.makeName(edge.RefMetadataComponentNamespace, edge.RefMetadataComponentName);
            const dstType = edge.RefMetadataComponentType;

            // skip over any edge that points to a package in a different namespace.  We don't care about them
            // for componentization
            // consider making this an option
            if (edge.RefMetadataComponentNamespace) {
                continue;
            }

            const srcDetails = new Map<string, object>();
            srcDetails.set('name', (srcName as String));
            srcDetails.set('type', (srcType as String));
            const srcNode: Node = graph.getOrAddNode(srcId, srcDetails);

            const dstDetails = new Map<string, object>();
            dstDetails.set('name', (dstName as String));
            dstDetails.set('type', (dstType as String));
            const dstNode: Node = graph.getOrAddNode(dstId, dstDetails);
            if (forwards) {
                graph.addEdge(srcNode, dstNode);

                if (connectAuras && srcType === 'AuraDefinition' && dstType === 'AuraDefinitionBundle' || srcType === 'FlexiPage') {
                    graph.addEdge(dstNode, srcNode); // Also add reverse reference
                }
            }

            if (backwards) {
                graph.addEdge(dstNode, srcNode);

                if (connectAuras && srcType === 'AuraDefinition' && dstType === 'AuraDefinitionBundle' || srcType === 'FlexiPage') {
                    graph.addEdge(srcNode, dstNode); // Also add reverse reference
                }
            }
        }

        return graph;
    }

    private static makeName(ns: string, name: string): string {
        if (ns) {
            return ns + '.' + name;
        }

        return name;
    }

    private static nodeToDisplayName(node: Node) {
        // Name is the actual name, the node's name is the id.
        if (node instanceof ScalarNode) {
            return node.details.get('name') + '(' + node.name + ')';
        } else {
            const ng: NodeGroup = node as NodeGroup;
            return Array.from(ng.nodes).map(n => Analyze.nodeToDisplayName(n)).join(', ');
        }
    }

    public async run(): Promise<Map<string, Node[]>> {
        // const orgId = this.org.getOrgId();
        const anyConn = <Connection> this.org.getConnection();
        anyConn.version = '45.0';
        const conn = anyConn.tooling;
        const queryResults =
            await conn.query('SELECT MetadataComponentId, MetadataComponentNamespace, ' +
                                    'MetadataComponentName, MetadataComponentType, ' +
                                    'RefMetadataComponentId, RefMetadataComponentNamespace, ' +
                                    'RefMetadataComponentName, RefMetadataComponentType ' +
                                    'FROM MetadataComponentDependency');
        const g = Analyze.buildGraph(queryResults.records);
        g.removeCycles();
        const leafNodes: Map<string, Node[]> = new Map<string, Node[]>();
        // Find all the leaf nodes
        for (const node of g.nodes) {
            const edges: Set<Node> = new Set<Node>(g.getEdges(node));
            // no outgoing edges or only self edges
            if (edges.size === 0 || (edges.has(node) && edges.size === 1)) {
                let type: string;
                if (node instanceof NodeGroup) {
                    type = 'Cluster';
                    const xmlString = ClusterPackager.writeXMLNodeGroup((node as NodeGroup));
                    const folder = Analyze.outputFolder + (node as NodeGroup).name + '/';
                    FileWriter.writeFile(folder, 'package.xml', xmlString);
                } else {
                    type = ((node.details.get('type')) as String).valueOf();
                }
                let list: Node[] = leafNodes.get(type);
                if (!list) {
                    assert.ok(!leafNodes.has(type));
                    list = new Array<Node>();
                    leafNodes.set(type, list);
                }
                list.push(node);
            }
        }
        if (leafNodes.size > 0) {
            this.ux.log('Leaf components by type');
            Array.from(leafNodes.entries()).forEach(pair => {
                const type: string = pair[0];
                const components: Node[] = pair[1];
                this.ux.log(type + ':');
                components.forEach(component => {
                    const name = Analyze.nodeToDisplayName(component);
                    this.ux.log('\t' + name);
                });
                this.ux.log();
            });
        }
        return leafNodes;
    }

}
