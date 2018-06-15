// import {flags} from '@oclif/command';
import {join} from 'path';
import {core, SfdxCommand} from '@salesforce/command';
import assert = require('assert');

core.Messages.importMessagesDirectory(join(__dirname, '..', '..', '..'));
const messages = core.Messages.loadMessages('dependencies-cli', 'analyze');

export default class Analyze extends SfdxCommand {
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
            srcDetails.set('name', new String(srcName));
            srcDetails.set('type', new String(srcType));
            const srcNode: Node = graph.getOrAddNode(srcId, srcDetails);

            const dstDetails = new Map<string, object>();
            dstDetails.set('name', new String(dstName));
            dstDetails.set('type', new String(dstType));
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
            return Array.from(ng.nodes).map((n) => { return Analyze.nodeToDisplayName(n); }).join(', ');
        }
    }

    public async run(): Promise<any> {
        // const orgId = this.org.getOrgId();

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
            if (edges.size == 0 || (edges.has(node) && edges.size == 1)) {
                let type: string;
                if (node instanceof NodeGroup) {
                    type = 'Cluster';
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
            Array.from(leafNodes.entries()).forEach((pair) => {
                const type: string = pair[0];
                const components: Node[] = pair[1];
                this.ux.log(type + ':');
                components.forEach((component) => {
                    const name = Analyze.nodeToDisplayName(component);
                    this.ux.log('\t' + name);
                });
                this.ux.log();
            });
        }
    }
}

export class Graph {
    private _nodes: Map<string, Node> = new Map<string, Node>();
    private _groupMap: Map<ScalarNode, NodeGroup> = new Map<ScalarNode, NodeGroup>();

    public get nodes(): IterableIterator<Node> {
        return this._nodes.values();
    }

    public getEdges(node: Node): IterableIterator<Node> {
        const edges: Set<Node> = new Set<Node>();
        (node as NodeImpl).getAdjacency().forEach((elt) => {
            let mapped: Node;
            if (elt instanceof ScalarNode) {
                mapped = this._groupMap.get(elt);
            }
            edges.add(mapped ? mapped : elt);
        });

        if (node instanceof ScalarNode) {
            edges.delete(this._groupMap.get(node));
        }
        return edges.values();
    }

    public addEdge(src: Node, dst: Node): void {
       (src as NodeImpl).addEdge(dst);
    }
    public getNode(name: string): Node {
        return this._nodes.get(name);
    }

    public combineNodes(node1: Node, node2: Node): Node {
        assert.ok(this._nodes.has(node1.name), node1.name + ' doesn\'t exist');
        assert.ok(this._nodes.has(node2.name), node2.name + ' doesn\'t exist');
        if (node1 === node2) {
            // already the same node, so nothing to do.
            return;
        }
        // combining nodes changes the name of the node, so we have to remove node1 and node2 from the
        // _nodes map first, then put the maybe new node back.
        this._nodes.delete(node1.name);
        this._nodes.delete(node2.name);
        const ng: NodeGroup = (node1 as NodeImpl).combineWith(node2 as NodeImpl);
        if (node1 instanceof ScalarNode) {
            this._groupMap.set(node1, ng);
        }
        if (node2 instanceof ScalarNode) {
            this._groupMap.set(node2, ng);
        }
        this._nodes.set(ng.name, ng);
        return ng;
    }

    public getOrAddNode(name: string, details: Map<string, object>): Node {
        let n: Node = this._nodes.get(name);
        if (n) {
            return n;
        }

        n = new ScalarNode(name, details);
        this._nodes.set(name, n);
        return n;
    }

}

export interface Node {
    readonly name: string;
    details: Map<string, object>;
}

abstract class NodeImpl implements Node {
    private readonly _name: string;
    private readonly _details: Map<string, object>;

    public get name(): string {
        return this._name;
    }

    public get details(): Map<string, object> {
        return this._details;
    }

    constructor(name: string, details: Map<string, object>) {
        this._name = name;
        this._details = details;
    }
    public abstract getAdjacency(): Map<string, Node>;
    public abstract addEdge(dest: Node): void;
    public abstract combineWith(rhs: NodeImpl): NodeGroup;
}

class ScalarNode extends NodeImpl {
    private edges: Map<string, Node> = new Map<string, Node>();

    constructor(name: string, details: Map<string, object>) {
        super(name, details);
    }

    public addEdge(dest: Node) {
        if (!this.edges.has(dest.name)) {
            this.edges.set(dest.name, dest);
        }
    }

    public getAdjacency(): Map<string, Node> {
        return this.edges;
    }

    public combineWith(rhs: NodeImpl): NodeGroup {
        if (rhs instanceof NodeGroup) {
            return rhs.combineWith(this);
        }

        const ng: NodeGroup = new NodeGroup();
        ng.addNode(this);
        ng.addNode(rhs);
        return ng;
    }
}

class NodeGroup extends NodeImpl {
    private readonly _nodes: Set<ScalarNode> = new Set<ScalarNode>();
    private adjacencyCache: Map<string, ScalarNode>;

    constructor() {
        super('NodeGroup', undefined);
    }

    public get name(): string {
        return Array.from(this.nodes).map((node) => node.name).sort().join(', ');
    }

    get nodes(): Set<ScalarNode> {
        return this._nodes;
    }

    public get details(): Map<string, object> {
        const ret: Map<string, object> = new Map<string, object>();
        this.nodes.forEach((element) => {
            Array.from(element.details.entries()).forEach((detail) => {
               ret.set(detail[0], detail[1]);
            });
        });
        return ret;
    }

    public addEdge(dest: Node) {
        throw new Error('Don\'t add edges to combined nodes');
    }

    public getAdjacency(): Map<string, Node> {
        if (this.adjacencyCache) {
            return this.adjacencyCache as Map<string, Node>;
        }

        this.adjacencyCache = new Map<string, ScalarNode>();
        this.nodes.forEach((element) => {
            element.getAdjacency().forEach((n) => {
                    // if a node has a cycle to itself then preserve it.  if it's an
                    // edge between two nodes in the nodegroup, skip it.
                    if (element === n || !this.nodes.has(n as ScalarNode)) {
                        this.adjacencyCache.set(n.name, n as ScalarNode);
                    }
                }
            );
        });
        return this.adjacencyCache;
    }
    public combineWith(rhs: NodeImpl): NodeGroup {
        if (rhs instanceof ScalarNode) {
            this.addNode(rhs);
            this.adjacencyCache = null;
            return this;
        }

        assert.ok(rhs instanceof NodeGroup);
        (rhs as NodeGroup).nodes.forEach((element) => {
                this.nodes.add(element);
            }
        );

        return rhs as NodeGroup;
    }

    public addNode(node: NodeImpl): void {
        assert.ok(node as ScalarNode);
        this.nodes.add(node as ScalarNode);
    }
}

export abstract class DepthFirstSearch {
    private readonly graph: Graph;
    private readonly state: Set<Node>;
    constructor(g: Graph) {
        this.graph = g;
        this.state = new Set<Node>();
    }

    public run() {
        for (const node of this.graph.nodes) {
            if (this.state.has(node)) {
                // this node was processed by a previous call to dfs
                return;
            }

            this.dfs(node);
        }
    }

    public abstract visit(node: Node);
    public abstract explore(src: Node, dst: Node);
    public abstract finish(node: Node);

    private dfs(node: Node) {
        this.visit(node);

        for (const dst of this.graph.getEdges(node)) {
            this.explore(node, dst);
            if (this.state.has(dst)) {
                // already visited this node
                continue;
            }
            this.state.add(dst);
            this.dfs(dst);
        }

        this.finish(node);
    }
}
export class FindCycles extends DepthFirstSearch {
    public visited: Set<Node> = new Set<Node>();
    public finished: Set<Node> = new Set<Node>();
    public cycles: Node[][] = new Array<Node[]>();

    public visit(node: Node) {
        this.visited.add(node);
    }
    public finish(node: Node) {
        this.finished.add(node);
    }
    public explore(src: Node, dst: Node) {
        // ignore self cycles
        if (src === dst) {
            return;
        }

        // if we have an edge to a node that is visited but not finished, then it's
        // a back edge
        if (this.visited.has(dst) && !this.finished.has(dst)) {
                // This is a cycle
                this.cycles.push([src, dst]);
        }
    }

/*
export class FindCycles extends DepthFirstSearch {
    public indices: Map<Node, number> = new Map<Node, number>();
    public cycles: Node[][] = new Array<Node[]>();

    public visit(node: Node) {
        // record the visit order for nodes
        if (!this.indices.has(node)) {
           this.indices.set(node, this.indices.size);
        }
    }

    public explore(src: Node, dst: Node) {
        const srcIdx = this.indices.get(src);
        const dstIdx = this.indices.get(dst);
        if (dstIdx !== null) {
            // allow self cycles, so only check for greater.
            if (srcIdx > dstIdx) {
                console.log('Back edge: ' + src.name + '(' + srcIdx + ') => ' + dst.name + '(' + dstIdx + ')');
                // This is a cycle
                this.cycles.push([src, dst]);
            }
        }
    }
    public finish(node: Node) {
    }
    */

}
