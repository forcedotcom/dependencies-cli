// TODO: Merge dependencyGraph and componentGraph
import assert = require('assert');
import { FieldDefinition, Node, NodeImpl, ScalarNode, NodeGroup } from './Nodedefs';
import {FindCycles} from './DFSLib';
import {AbstractGraph} from './abstractGraph';

export class ComponentGraph extends AbstractGraph {
    private _groupMap: Map<ScalarNode, NodeGroup> = new Map<ScalarNode, NodeGroup>();

    public removeCycles(): void {
        let remover: FindCycles;
        let cycles: Node[][];
        do {
           remover = new FindCycles(this);
           remover.run();
           cycles = remover.cycles;
           for (const backEdge of cycles) {
               // Since we're removing multiple cycles we might have already
               // combined one of the nodes.  "get" the node again which will
               // map it to the correct NodeGroup before combining.
               if (backEdge[1]) {
                const src: Node = this.getNode(backEdge[0].name);
                const dst: Node = this.getNode(backEdge[1].name);
                if (src && dst) { // May have been deleted so check if they exist
                    this.combineNodes(src, dst);
                }
               }
            }
        } while (cycles.length > 0);
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

    public combineNodes(node1: Node, node2: Node): Node {
        assert.ok(this.nodesMap.has(node1.name), node1.name + ' doesn\'t exist');
        assert.ok(this.nodesMap.has(node2.name), node2.name + ' doesn\'t exist');
        if (node1 === node2) {
            // already the same node, so nothing to do.
            return;
        }
        // combining nodes changes the name of the node, so we have to remove node1 and node2 from the
        // nodesMap map first, then put the maybe new node back.
        this.nodesMap.delete(node1.name);
        this.nodesMap.delete(node2.name);
        const ng: NodeGroup = (node1 as NodeImpl).combineWith(node2 as NodeImpl);
        if (node1 instanceof ScalarNode) {
            this._groupMap.set(node1, ng);
        }
        if (node2 instanceof ScalarNode) {
            this._groupMap.set(node2, ng);
        }
        this.nodesMap.set(ng.name, ng);
        return ng;
    }

}
