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
var DepthFirstSearch = /** @class */ (function () {
    function DepthFirstSearch(g) {
        this.graph = g;
        this.state = new Set();
    }
    DepthFirstSearch.prototype.run = function () {
        for (var _i = 0, _a = this.graph.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            if (this.state.has(node)) {
                // this node was processed by a previous call to dfs
                return;
            }
            this.dfs(node);
        }
    };
    DepthFirstSearch.prototype.dfs = function (node) {
        this.visit(node);
        for (var _i = 0, _a = this.graph.getEdges(node); _i < _a.length; _i++) {
            var dst = _a[_i];
            this.explore(node, dst);
            if (this.state.has(dst)) {
                // already visited this node
                continue;
            }
            this.state.add(dst);
            this.dfs(dst);
        }
        this.finish(node);
    };
    return DepthFirstSearch;
}());
exports.DepthFirstSearch = DepthFirstSearch;
var FindAllDependencies = /** @class */ (function (_super) {
    __extends(FindAllDependencies, _super);
    function FindAllDependencies() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.visited = new Map();
        _this.finished = new Set();
        _this.visitedNames = new Set();
        _this.visitedEdges = new Set();
        return _this;
    }
    FindAllDependencies.prototype.visit = function (node) {
        this.visited.set(node.name, node);
        this.visitedNames.add(node.name);
    };
    FindAllDependencies.prototype.finish = function (node) {
        this.finished.add(node);
    };
    FindAllDependencies.prototype.runNode = function (node) {
        if (!this.visited.has(node.name)) {
            this.dfs(node);
        }
    };
    FindAllDependencies.prototype.explore = function (src, dst) {
        this.visitedEdges.add({ from: src.name, to: dst.name });
    };
    return FindAllDependencies;
}(DepthFirstSearch));
exports.FindAllDependencies = FindAllDependencies;
var FindCycles = /** @class */ (function (_super) {
    __extends(FindCycles, _super);
    function FindCycles() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.visited = new Set();
        _this.finished = new Set();
        _this.cycles = new Array();
        return _this;
    }
    FindCycles.prototype.visit = function (node) {
        this.visited.add(node);
    };
    FindCycles.prototype.finish = function (node) {
        this.finished.add(node);
    };
    FindCycles.prototype.explore = function (src, dst) {
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
    };
    return FindCycles;
}(DepthFirstSearch));
exports.FindCycles = FindCycles;
