import {Node} from './NodeDefs'
export abstract class AbstractGraph {
    public abstract getEdges(Node): IterableIterator<Node>;
    public abstract get nodes(): IterableIterator<Node>;
}