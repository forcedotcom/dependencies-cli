import {AbstractGraph} from './abstractGraph';
import {Node, Edge} from '../lib/NodeDefs';

export abstract class DepthFirstSearch {
    protected readonly graph: AbstractGraph;
    private readonly state: Set<Node>;
    constructor(g: AbstractGraph) {
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

    protected dfs(node: Node) {
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

export class FindAllDependencies extends DepthFirstSearch {
    public visited: Map<string, Node> = new Map<string, Node>();
    public finished: Set<Node> = new Set<Node>();
    public visitedNames: Set<String> = new Set<String>();
    public visitedEdges: Set<Edge> = new Set<Edge>();

    public visit(node: Node) {
        this.visited.set(node.name, node);
        this.visitedNames.add(node.name);
    }
    public finish(node: Node) {
        this.finished.add(node);
    }

    public runNode(node: Node) {
        if (!this.visited.has(node.name)) {
            this.dfs(node);
        }
    }

    public explore(src: Node, dst: Node) {
        this.visitedEdges.add({from: src.name, to: dst.name});
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

}
