/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// @ts-nocheck
import {Node, NodeImpl, ScalarNode} from './NodeDefs';
export abstract class AbstractGraph {
    protected nodesMap: Map<string, Node> = new Map<string, Node>();
    public abstract getEdges(node: Node): IterableIterator<Node>;

    public get nodes() {
        return this.nodesMap.values();
    }

    public get nodeNames(): IterableIterator<string> {
        return this.nodesMap.keys();
    }

    public addEdge(src: Node, dst: Node): void {
        (src as NodeImpl).addEdge(dst);
     }

    public getNode(name: string): Node {
        return this.nodesMap.get(name);
    }

    public getOrAddNode(name: string, details: Map<string, object>): Node {
        let n: Node = this.nodesMap.get(name);
        if (n) {
            return n;
        }

        n = new ScalarNode(name, details);
        this.nodesMap.set(name, n);
        return n;
    }

    protected getNodeFromName(name: string): Node {
        let found: Node;
        Array.from(this.nodes).forEach(node => {
            if ((node.details.get('name') as String).startsWith(name) && (node.details.get('type') as String) === 'CustomObject') {
                found = node; // Returning node here does not work and I don't know why
            }
        });
        return found;
    }

    protected getNodeShortId(name: string): Node {
        let found: Node;
        Array.from(this.nodes).forEach(node => {
            if (node.name.startsWith(name)) {
                found = node; // Returning node here does not work and I don't know why
            }
        });
        return found;
    }
}
