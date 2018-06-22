// TODO: Merge dependencyGraph and componentGraph
import assert = require('assert');

export class Graph {
    private _nodes: Map<string, Node> = new Map<string, Node>();
    private _groupMap: Map<ScalarNode, NodeGroup> = new Map<ScalarNode, NodeGroup>();

    public get nodes(): IterableIterator<Node> {
        return this._nodes.values();
    }

    public getEdges(node: Node): IterableIterator<Node> {
        const edges: Set<Node> = new Set<Node>();
        (node as NodeImpl).getAdjacency().forEach(elt => {
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

export class ScalarNode extends NodeImpl {
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

export class NodeGroup extends NodeImpl {
    private readonly _nodes: Set<ScalarNode> = new Set<ScalarNode>();
    private adjacencyCache: Map<string, ScalarNode>;

    constructor() {
        super('NodeGroup', undefined);
    }

    public get name(): string {
        return Array.from(this.nodes).map(node => node.name).sort().join(', ');
    }

    get nodes(): Set<ScalarNode> {
        return this._nodes;
    }

    public get details(): Map<string, object> {
        const ret: Map<string, object> = new Map<string, object>();
        this.nodes.forEach(element => {
            Array.from(element.details.entries()).forEach(detail => {
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
        this.nodes.forEach(element => {
            element.getAdjacency().forEach(n => {
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
        (rhs as NodeGroup).nodes.forEach(element => {
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
