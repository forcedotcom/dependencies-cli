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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var abstractGraph_1 = require("./abstractGraph");
var DFSLib_1 = require("./DFSLib");
exports.componentsWithParents = ['CustomField', 'ValidationRule', 'QuickAction'];
var DependencyGraph = /** @class */ (function (_super) {
    __extends(DependencyGraph, _super);
    function DependencyGraph(tool, conn) {
        var _this = _super.call(this) || this;
        _this.edges = new Set();
        _this.maxNumberOfIds = 10;
        _this.tooling = tool;
        _this.connection = conn;
        _this.connection.bulk.pollTimeout = 25000; // Bulk timeout can be specified globally on the connection object
        return _this;
    }
    DependencyGraph.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, customFieldEntities, _g, lookupRelationships;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.retrieveAllComponentIds()];
                    case 1:
                        _a.allComponentIds = _h.sent();
                        _b = this;
                        return [4 /*yield*/, this.retrieveCustomFields(this.allComponentIds, new Array())];
                    case 2:
                        _b.customFields = _h.sent();
                        _c = this;
                        return [4 /*yield*/, this.retrieveValidationRules(this.allComponentIds, new Array())];
                    case 3:
                        _c.validationRules = _h.sent();
                        _d = this;
                        return [4 /*yield*/, this.retrieveQuickActions(this.allComponentIds, new Array())];
                    case 4:
                        _d.quickActions = _h.sent();
                        _e = this;
                        return [4 /*yield*/, this.getObjectIds()];
                    case 5:
                        _e.allCustomObjectIds = _h.sent();
                        _f = this;
                        return [4 /*yield*/, this.retrieveCustomObjects(this.allCustomObjectIds, new Array())];
                    case 6:
                        _f.customObjects = _h.sent();
                        customFieldEntities = this.customFields.map(function (r) { return r.TableEnumOrId; });
                        _g = this;
                        return [4 /*yield*/, this.retrieveLookupRelationships(customFieldEntities, new Array())];
                    case 7:
                        _g.customFieldDefinitions = _h.sent();
                        lookupRelationships = this.customFieldDefinitions.filter(function (x) { return x.DataType.startsWith('Lookup'); });
                        lookupRelationships.forEach(function (element) {
                            element.DataType = element.DataType.slice(element.DataType.indexOf('(') + 1, element.DataType.lastIndexOf(')'));
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    DependencyGraph.prototype.buildGraph = function (records) {
        // Reset edges and nodes
        this.nodesMap = new Map();
        this.edges = new Set();
        var parentRecords = this.getParentRecords();
        for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
            var record = records_1[_i];
            var parentName = '';
            var refParentName = '';
            if (record.RefMetadataComponentName.startsWith('0')) {
                continue;
            }
            if (exports.componentsWithParents.indexOf(record.MetadataComponentType) >= 0) {
                parentName = parentRecords.get(record.MetadataComponentId) + '.';
            }
            if (exports.componentsWithParents.indexOf(record.RefMetadataComponentType) >= 0) {
                refParentName = parentRecords.get(record.RefMetadataComponentId) + '.';
            }
            var srcId = record.MetadataComponentId;
            var srcName = record.MetadataComponentName;
            var srcType = record.MetadataComponentType;
            var dstId = record.RefMetadataComponentId;
            var dstName = record.RefMetadataComponentName;
            var dstType = record.RefMetadataComponentType;
            var srcDetails = new Map();
            srcDetails.set('name', srcName);
            srcDetails.set('type', srcType);
            srcDetails.set('parent', parentName);
            var srcNode = this.getOrAddNode(srcId, srcDetails);
            var dstDetails = new Map();
            dstDetails.set('name', dstName);
            dstDetails.set('type', dstType);
            dstDetails.set('parent', refParentName);
            var dstNode = this.getOrAddNode(dstId, dstDetails);
            this.edges.add({ from: record.MetadataComponentId, to: record.RefMetadataComponentId });
            this.addEdge(srcNode, dstNode);
            if (record.MetadataComponentType === 'AuraDefinition' && record.RefMetadataComponentType === 'AuraDefinitionBundle') {
                this.edges.add({ from: record.RefMetadataComponentId, to: record.MetadataComponentId }); // Also add reverse reference
                this.addEdge(dstNode, srcNode);
            }
        }
        this.addFieldRelationships();
    };
    DependencyGraph.prototype.runDFS = function (initialNodes) {
        var _this = this;
        var dfs = new DFSLib_1.FindAllDependencies(this);
        initialNodes.forEach(function (node) {
            var graphNode = _this.getOrAddNode(node.name, node.details); // Grab node from this graph
            dfs.runNode(graphNode);
        });
        this.nodesMap = dfs.visited;
        this.edges = dfs.visitedEdges;
    };
    DependencyGraph.prototype.getEdges = function (src) {
        return src.getEdges();
    };
    DependencyGraph.prototype.addFieldRelationships = function () {
        var _this = this;
        this.customFieldDefinitions.forEach(function (fielddef) {
            var n1 = _this.getNodeShortId(fielddef.EntityDefinitionId);
            var objName = fielddef.DataType.slice(fielddef.DataType.indexOf('(') + 1, fielddef.DataType.lastIndexOf(')'));
            var n2 = _this.getNodeFromName(objName);
            if (n1 != null && n2 != null) {
                _this.addEdge(n1, n2);
            }
        });
    };
    /**
    * Render as DOT format
    */
    DependencyGraph.prototype.toDotFormat = function () {
        // TODO Depending on the size of orgs, you may not want to
        // keep all this in memory. However, you don't want to do
        // console.log in library code, and this method really belongs
        // on the graph. Instead of using ux.log on every
        // line, just return a stream that you continue to write to,
        // then the command can call ux.log from the stream events.
        var dot = 'digraph graphname {\n';
        dot += '  rankdir=RL;\n';
        dot += '  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];\n';
        dot += '  // Nodes\n';
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            dot += "  X" + node.name + " [label=<" + node.details.get('parent') + node.details.get('name') + "<BR/><FONT POINT-SIZE=\"8\">" + node.details.get('type') + "</FONT>>]\n";
        }
        dot += '  // Paths\n';
        for (var _b = 0, _c = this.edges; _b < _c.length; _b++) {
            var edge = _c[_b];
            dot += "  X" + edge.from + "->X" + edge.to + "\n";
        }
        dot += '}';
        return dot;
    };
    DependencyGraph.prototype.toJson = function () {
        var jsonRepresentation = new Array();
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            var jsonNode = {
                id: node.name, name: node.details.get('name').valueOf(),
                type: node.details.get('type').valueOf(), parent: node.details.get('parent').valueOf()
            };
            jsonRepresentation.push(jsonNode);
        }
        return { nodes: jsonRepresentation, edges: Array.from(this.edges) };
    };
    DependencyGraph.prototype.getParentRecords = function () {
        // Put all info into a Map
        var parentRecords = new Map();
        this.populateIdToDeveloperNameMap(parentRecords, this.validationRules, 'EntityDefinitionId');
        this.populateIdToDeveloperNameMap(parentRecords, this.customFields, 'TableEnumOrId');
        this.populateIdToDeveloperNameMap(parentRecords, this.quickActions, 'SobjectType');
        return parentRecords;
    };
    DependencyGraph.prototype.retrieveRecords = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.tooling.query(query)];
                    case 1: return [2 /*return*/, (_a.sent()).records];
                }
            });
        });
    };
    DependencyGraph.prototype.retrieveBulkRecords = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connection.bulk.query(query)
                            .on('record', function (rec) {
                            console.log(rec);
                            return rec;
                        })];
                    case 1: return [2 /*return*/, (_a.sent())
                            .on('error', function (err) {
                            console.error(err);
                        })];
                }
            });
        });
    };
    DependencyGraph.prototype.splitIds = function (ids, query, maxNumberOfIds) {
        if (maxNumberOfIds === void 0) { maxNumberOfIds = 0; }
        /* HKA: split potentially long lists of ids into sublists
        
        A SOQL query can only have 20K chars and a long list can potentially exceed that limit
        A SOQL query passed as URL parameter has to be limitted in size as well. Approximately 16K is the max URI length
        A few types of SOQL queries limit the number of attributes to be passed. OPTIONAL parameter.
        query.length = 58 (80 when URL encoded)
        id.length = 18 + 3 (23 when URL encoded)
        */
        var maxURIlength = 12000;
        var idNumChars = 23;
        if (maxNumberOfIds && ids.length > maxNumberOfIds) {
            var index = maxNumberOfIds;
        }
        else if (((ids.length * idNumChars) + query.length) > maxURIlength) {
            var index = Math.floor((maxURIlength - query.length) / idNumChars);
        }
        else {
            var index = ids.length;
        }
        // produce two sets of ids, the left array small enougth to run the query with
        // the right array containing the rest
        var allIds = {
            left: ids.splice(0, index),
            right: ids
        };
        // console.log(" query = " + query + " allIds.left.length = " + allIds.left.length + 
        // " allIds.right.length = " + allIds.right.length);
        return allIds;
    };
    DependencyGraph.prototype.retrieveCustomFields = function (ids, resultset) {
        return __awaiter(this, void 0, void 0, function () {
            var query, splitIds, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        query = "SELECT Id, TableEnumOrId FROM CustomField c WHERE c.Id In ";
                        splitIds = this.splitIds(ids, query, this.maxNumberOfIds);
                        query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");
                        _b = (_a = resultset).concat;
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 1:
                        // run the query
                        resultset = _b.apply(_a, [_c.sent()]);
                        // recursive call to compute the next query
                        if (splitIds.right.length > 0) {
                            this.retrieveCustomFields(splitIds.right, resultset);
                        }
                        return [2 /*return*/, resultset];
                }
            });
        });
    };
    DependencyGraph.prototype.bulkRetrieveLookupRelationships = function (ids, resultset) {
        return __awaiter(this, void 0, void 0, function () {
            var query, splitIds, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        query = "SELECT EntityDefinitionId,DataType,DurableId FROM FieldDefinition c WHERE c.EntityDefinitionId In ";
                        splitIds = this.splitIds(ids, query, this.maxNumberOfIds);
                        query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");
                        _b = (_a = resultset).concat;
                        return [4 /*yield*/, this.retrieveBulkRecords(query)];
                    case 1:
                        // run the query
                        resultset = _b.apply(_a, [_c.sent()]);
                        // recursive call to compute the next query
                        if (splitIds.right.length > 0) {
                            this.bulkRetrieveLookupRelationships(splitIds.right, resultset);
                        }
                        return [2 /*return*/, resultset];
                }
            });
        });
    };
    DependencyGraph.prototype.retrieveLookupRelationships = function (ids, resultset) {
        return __awaiter(this, void 0, void 0, function () {
            var query, splitIds, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        query = "SELECT EntityDefinitionId,DataType,DurableId FROM FieldDefinition c WHERE c.EntityDefinitionId In ";
                        splitIds = this.splitIds(ids, query, this.maxNumberOfIds);
                        query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");
                        _b = (_a = resultset).concat;
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 1:
                        // run the query
                        resultset = _b.apply(_a, [_c.sent()]);
                        // recursive call to compute the next query
                        if (splitIds.right.length > 0) {
                            this.retrieveLookupRelationships(splitIds.right, resultset);
                        }
                        return [2 /*return*/, resultset];
                }
            });
        });
    };
    DependencyGraph.prototype.retrieveValidationRules = function (ids, resultset) {
        return __awaiter(this, void 0, void 0, function () {
            var query, splitIds, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        query = "SELECT Id, EntityDefinitionId FROM ValidationRule c WHERE c.Id In ";
                        splitIds = this.splitIds(ids, query, this.maxNumberOfIds);
                        query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");
                        _b = (_a = resultset).concat;
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 1:
                        // run the query
                        resultset = _b.apply(_a, [_c.sent()]);
                        // recursive call to compute the next query
                        if (splitIds.right.length > 0) {
                            this.retrieveValidationRules(splitIds.right, resultset);
                        }
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 2: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    DependencyGraph.prototype.retrieveQuickActions = function (ids, resultset) {
        return __awaiter(this, void 0, void 0, function () {
            var query, splitIds, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        query = "SELECT Id, SobjectType FROM QuickActionDefinition c WHERE c.Id In ";
                        splitIds = this.splitIds(ids, query, this.maxNumberOfIds);
                        query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");
                        _b = (_a = resultset).concat;
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 1:
                        // run the query
                        resultset = _b.apply(_a, [_c.sent()]);
                        // recursive call to compute the next query
                        if (splitIds.right.length > 0) {
                            this.retrieveQuickActions(splitIds.right, resultset);
                        }
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 2: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    DependencyGraph.prototype.retrieveCustomObjects = function (ids, resultset) {
        return __awaiter(this, void 0, void 0, function () {
            var query, splitIds, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        query = "SELECT Id, DeveloperName FROM CustomObject c WHERE c.Id In ";
                        splitIds = this.splitIds(ids, query, this.maxNumberOfIds);
                        query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");
                        _b = (_a = resultset).concat;
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 1:
                        // run the query
                        resultset = _b.apply(_a, [_c.sent()]);
                        // recursive call to compute the next query
                        if (splitIds.right.length > 0) {
                            this.retrieveCustomObjects(splitIds.right, resultset);
                        }
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 2: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    DependencyGraph.prototype.getLookupRelationships = function () {
        return this.customFieldDefinitions;
    };
    DependencyGraph.prototype.retrieveAllComponentIds = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, customComponentIds, componentIds, refComponentIds, ids;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "SELECT MetadataComponentId,RefMetadataComponentId FROM MetadataComponentDependency \
    WHERE (MetadataComponentType = 'CustomField' OR RefMetadataComponentType = 'CustomField') \
    OR (MetadataComponentType = 'ValidationRule' OR RefMetadataComponentType = 'ValidationRule') \
    OR (MetadataComponentType = 'QuickAction' OR RefMetadataComponentType = 'QuickAction')";
                        return [4 /*yield*/, this.retrieveRecords(query)];
                    case 1:
                        customComponentIds = _a.sent();
                        componentIds = customComponentIds.map(function (r) { return r.MetadataComponentId; });
                        refComponentIds = customComponentIds.map(function (r) { return r.RefMetadataComponentId; });
                        ids = componentIds.concat(refComponentIds);
                        // Remove duplicates
                        ids = Array.from(new Set(ids));
                        return [2 /*return*/, ids];
                }
            });
        });
    };
    DependencyGraph.prototype.getObjectIds = function () {
        // Filter Ids that start with 0
        var fieldObjectIdRecords = this.customFields.filter(function (x) { return x.TableEnumOrId.startsWith('0'); });
        // Filter Ids that start with 0 from vrule
        var vruleObjectIdRecords = this.validationRules.filter(function (x) { return x.EntityDefinitionId.startsWith('0'); });
        return fieldObjectIdRecords.map(function (r) { return r.TableEnumOrId; }).concat(vruleObjectIdRecords.map(function (r) { return r.EntityDefinitionId; }));
    };
    DependencyGraph.prototype.populateIdToDeveloperNameMap = function (map, records, fieldName) {
        var _loop_1 = function (record) {
            var val = record[fieldName];
            if (val.startsWith('0')) {
                // Grab the custom object the field points to
                var customObject = this_1.customObjects.filter(function (x) { return x.Id.startsWith(val); });
                val = customObject[0].DeveloperName + '__c';
            }
            map.set(record['Id'], val);
        };
        var this_1 = this;
        for (var _i = 0, records_2 = records; _i < records_2.length; _i++) {
            var record = records_2[_i];
            _loop_1(record);
        }
    };
    DependencyGraph.prototype.arrayToInIdString = function (ids) {
        return "('" + ids.join('\',\'') + "')";
    };
    return DependencyGraph;
}(abstractGraph_1.AbstractGraph));
exports.DependencyGraph = DependencyGraph;
