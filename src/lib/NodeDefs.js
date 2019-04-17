"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var assert = require("assert");
var NodeImpl = /** @class */ (function () {
    function NodeImpl(name, details) {
        this._name = name;
        this._details = details;
    }
    Object.defineProperty(NodeImpl.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "details", {
        get: function () {
            return this._details;
        },
        enumerable: true,
        configurable: true
    });
    return NodeImpl;
}());
exports.NodeImpl = NodeImpl;
var ScalarNode = /** @class */ (function (_super) {
    __extends(ScalarNode, _super);
    function ScalarNode(name, details) {
        var _this = _super.call(this, name, details) || this;
        _this.edges = new Map();
        return _this;
    }
    ScalarNode.prototype.addEdge = function (dest) {
        if (!this.edges.has(dest.name)) {
            this.edges.set(dest.name, dest);
        }
    };
    ScalarNode.prototype.getEdges = function () {
        return this.edges.values();
    };
    ScalarNode.prototype.getAdjacency = function () {
        return this.edges;
    };
    ScalarNode.prototype.combineWith = function (rhs) {
        if (rhs instanceof NodeGroup) {
            return rhs.combineWith(this);
        }
        var ng = new NodeGroup();
        ng.addNode(this);
        ng.addNode(rhs);
        return ng;
    };
    return ScalarNode;
}(NodeImpl));
exports.ScalarNode = ScalarNode;
var NodeGroup = /** @class */ (function (_super) {
    __extends(NodeGroup, _super);
    function NodeGroup() {
        var _this = _super.call(this, 'NodeGroup', undefined) || this;
        _this._nodes = new Set();
        return _this;
    }
    Object.defineProperty(NodeGroup.prototype, "name", {
        get: function () {
            return Array.from(this.nodes).map(function (node) { return node.name; }).sort().join(', ');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeGroup.prototype, "nodes", {
        get: function () {
            return this._nodes;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeGroup.prototype, "details", {
        get: function () {
            var ret = new Map();
            this.nodes.forEach(function (element) {
                Array.from(element.details.entries()).forEach(function (detail) {
                    ret.set(detail[0], detail[1]);
                });
            });
            return ret;
        },
        enumerable: true,
        configurable: true
    });
    NodeGroup.prototype.addEdge = function (dest) {
        throw new Error('Don\'t add edges to combined nodes');
    };
    NodeGroup.prototype.getAdjacency = function () {
        var _this = this;
        if (this.adjacencyCache) {
            return this.adjacencyCache;
        }
        this.adjacencyCache = new Map();
        this.nodes.forEach(function (element) {
            element.getAdjacency().forEach(function (n) {
                // if a node has a cycle to itself then preserve it.  if it's an
                // edge between two nodes in the nodegroup, skip it.
                if (element === n || !_this.nodes.has(n)) {
                    _this.adjacencyCache.set(n.name, n);
                }
            });
        });
        return this.adjacencyCache;
    };
    NodeGroup.prototype.combineWith = function (rhs) {
        var _this = this;
        if (rhs instanceof ScalarNode) {
            this.addNode(rhs);
            this.adjacencyCache = null;
            return this;
        }
        assert.ok(rhs instanceof NodeGroup);
        rhs.nodes.forEach(function (element) {
            _this.nodes.add(element);
        });
        return rhs;
    };
    NodeGroup.prototype.addNode = function (node) {
        assert.ok(node);
        this.nodes.add(node);
    };
    return NodeGroup;
}(NodeImpl));
exports.NodeGroup = NodeGroup;
