// TODO: Merge dependencyGraph and componentGraph
import assert = require('assert');
import { FieldDefinition, Node, NodeImpl, ScalarNode, NodeGroup } from './Nodedefs';

export class Graph {
    private _nodes: Map<string, Node> = new Map<string, Node>();
    private _groupMap: Map<ScalarNode, NodeGroup> = new Map<ScalarNode, NodeGroup>();

    public get nodes(): IterableIterator<Node> {
        return this._nodes.values();
    }

    public getNodeFromName(name: string): Node {
        let found: Node;
        this._nodes.forEach(node => {
            if ((node.details.get('name') as String).startsWith(name) && (node.details.get('type') as String) === 'CustomObject') {
                found = node; // Returning node here does not work and I don't know why
            }
        });
        return found;
    }

    public getNodeShortId(name: string): Node {
        let found: Node;
        this._nodes.forEach(node => {
            if (node.name.startsWith(name)) {
                found = node; // Returning node here does not work and I don't know why
            }
        });
        return found;
    }

    public addFields(fields: FieldDefinition[]) {
        fields.forEach(fielddef => {
            const n1 = this.getNodeShortId(fielddef.EntityDefinitionId);
            const objName = fielddef.DataType.slice(fielddef.DataType.indexOf('(') + 1, fielddef.DataType.lastIndexOf(')'));
            const n2: Node = this.getNodeFromName(objName);
            if (n1 != null && n2 != null) {
                this.addEdge(n1, n2);
            }
        });
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
        console.log(node1.name);
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
