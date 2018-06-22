// import {flags} from '@oclif/command';
import assert = require('assert');
import {join} from 'path';
import {ClusterPackager } from '../../../lib/clusterPackager';
import {FindCycles} from '../../../lib/DFSLib';
import {core, SfdxCommand} from '@salesforce/command';
import {Graph, Node, NodeGroup, ScalarNode} from '../../../lib/componentGraph';

core.Messages.importMessagesDirectory(join(__dirname, '..', '..', '..'));
const messages = core.Messages.loadMessages('dependencies-cli', 'analyze');

export default class Analyze extends SfdxCommand {
    public static outputFolder = 'lib/';

    public static description = messages.getMessage('commandDescription');

    public static examples = [
    `$ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
    Hello world! Your org id is: 00Dxx000000004321 and your hub org id is: 00Dxx0000000001234
    `,
    `$ sfdx hello:org --name myname --targetusername myOrg@example.com
    Hello myname! Your org id is: 00Dxx000000004321
    `
    ];

    public static args = [{name: 'file'}];

    // tslint:disable-next-line:no-any
    public static buildGraph(results: any): Graph {
        const graph: Graph = new Graph();
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
            graph.addEdge(srcNode, dstNode);
        }

        return graph;
    }

    public static removeCycles(graph: Graph): void {
        let remover: FindCycles;
        let cycles: Node[][];
        do {
           remover = new FindCycles(graph);
           remover.run();
           cycles = remover.cycles;
           for (const backEdge of cycles) {
               // Since we're removing multiple cycles we might have already
               // combined one of the nodes.  "get" the node again which will
               // map it to the correct NodeGroup before combining.
               const src: Node = graph.getNode(backEdge[0].name);
               const dst: Node = graph.getNode(backEdge[1].name);
               graph.combineNodes(src, dst);
            }
        } while (cycles.length > 0);
    }

    // protected static flagsConfig = {
      // flag with a value (-n, --name=VALUE)
      // name: flags.string({char: 'n', description: messages.getMessage('nameFlagDescription')}),
      // force: flags.boolean({char: 'f'})
    // };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = true;

    // Comment this out if your command does not support a hub org username
    // protected static supportsDevhubUsername = true;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

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
        const xmlWriter = new ClusterPackager(Analyze.outputFolder);
        const anyConn = this.org.getConnection();
        anyConn.version = '43.0';
        const conn = anyConn.tooling;
        const queryResults =
            await conn.query('SELECT MetadataComponentId, MetadataComponentNamespace, ' +
                                    'MetadataComponentName, MetadataComponentType, ' +
                                    'RefMetadataComponentId, RefMetadataComponentNamespace, ' +
                                    'RefMetadataComponentName, RefMetadataComponentType ' +
                                    'FROM MetadataComponentDependency');
        const g = Analyze.buildGraph(queryResults.records);
        Analyze.removeCycles(g);

        const leafNodes: Map<string, Node[]> = new Map<string, Node[]>();
        // Find all the leaf nodes
        for (const node of g.nodes) {
            const edges: Set<Node> = new Set<Node>(g.getEdges(node));
            // no outgoing edges or only self edges
            if (edges.size === 0 || (edges.has(node) && edges.size === 1)) {
                let type: string;
                if (node instanceof NodeGroup) {
                    type = 'Cluster';
                    xmlWriter.writeXML((node as NodeGroup));
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
