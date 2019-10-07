/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import assert = require('assert');
export interface Node {
    readonly name: string;
    details: Map<string, object>;
}

export abstract class NodeImpl implements Node {
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

    public getEdges() {
        return this.edges.values();
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

export type Edge = {
from: string;
to: string;
};

export interface Record {
Id?: string;
}

export interface MetadataComponentDependency extends Record {
MetadataComponentId: string;
MetadataComponentName: string;
MetadataComponentType: string;
RefMetadataComponentId: string;
RefMetadataComponentName: string;
RefMetadataComponentType: string;
}

export interface CustomField extends Record {
TableEnumOrId: string;
}

export interface ValidationRule extends Record {
EntityDefinitionId: string;
}

export interface CustomObject extends Record {
DeveloperName: string;
}

export interface QuickAction extends Record  {
    SobjectType: string;
}

export interface FieldDefinition {
DurableId: string;
DataType: string;
EntityDefinitionId: string;
}

export type ComponentNode = {
id: string;
name: string;
type: string;
parent: string;
};
