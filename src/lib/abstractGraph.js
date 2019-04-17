"use strict";
exports.__esModule = true;
// @ts-nocheck
var NodeDefs_1 = require("./NodeDefs");
var AbstractGraph = /** @class */ (function () {
    function AbstractGraph() {
        this.nodesMap = new Map();
    }
    Object.defineProperty(AbstractGraph.prototype, "nodes", {
        get: function () {
            return this.nodesMap.values();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractGraph.prototype, "nodeNames", {
        get: function () {
            return this.nodesMap.keys();
        },
        enumerable: true,
        configurable: true
    });
    AbstractGraph.prototype.addEdge = function (src, dst) {
        src.addEdge(dst);
    };
    AbstractGraph.prototype.getNode = function (name) {
        return this.nodesMap.get(name);
    };
    AbstractGraph.prototype.getOrAddNode = function (name, details) {
        var n = this.nodesMap.get(name);
        if (n) {
            return n;
        }
        n = new NodeDefs_1.ScalarNode(name, details);
        this.nodesMap.set(name, n);
        return n;
    };
    AbstractGraph.prototype.getNodeFromName = function (name) {
        var found;
        Array.from(this.nodes).forEach(function (node) {
            if (node.details.get('name').startsWith(name) && node.details.get('type') === 'CustomObject') {
                found = node; // Returning node here does not work and I don't know why
            }
        });
        return found;
    };
    AbstractGraph.prototype.getNodeShortId = function (name) {
        var found;
        Array.from(this.nodes).forEach(function (node) {
            if (node.name.startsWith(name)) {
                found = node; // Returning node here does not work and I don't know why
            }
        });
        return found;
    };
    return AbstractGraph;
}());
exports.AbstractGraph = AbstractGraph;
