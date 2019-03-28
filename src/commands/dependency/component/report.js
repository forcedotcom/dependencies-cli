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
var command_1 = require("@salesforce/command");
var process = require("child_process");
var clusterPackager_1 = require("../../../lib/clusterPackager");
var dependencyGraph_1 = require("../../../lib/dependencyGraph");
var fileWriter_1 = require("../../../lib/fileWriter");
var PackageMerger_1 = require("../../../lib/PackageMerger");
command_1.core.Messages.importMessagesDirectory(__dirname);
var messages = command_1.core.Messages.loadMessages('dependencies-cli', 'depends');
var Report = /** @class */ (function (_super) {
    __extends(Report, _super);
    function Report() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Report.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var conn, deps, records, excludeMap, nodes, allRecords, xmlTempString;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        conn = this.org.getConnection();
                        conn.version = '43.0';
                        deps = new dependencyGraph_1.DependencyGraph(conn.tooling, conn);
                        return [4 /*yield*/, deps.init()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.getDependencyRecords(conn)];
                    case 2:
                        records = _a.sent();
                        if (this.flags.excludepackagefile) {
                            excludeMap = PackageMerger_1.PackageMerger.parseIntoMap(this.flags.excludepackagefile);
                        }
                        return [4 /*yield*/, deps.buildGraph(records)];
                    case 3:
                        _a.sent();
                        nodes = Array.from(deps.nodes);
                        if (!(this.flags.includealldependencies || this.flags.includealldependents)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.getAllRecords(conn)];
                    case 4:
                        allRecords = _a.sent();
                        return [4 /*yield*/, this.buildDFSGraph(allRecords, deps)];
                    case 5:
                        nodes = _a.sent();
                        _a.label = 6;
                    case 6:
                        this.generateOutputs(deps, nodes, excludeMap);
                        if (!this.flags.validate) return [3 /*break*/, 8];
                        xmlTempString = clusterPackager_1.ClusterPackager.writeXMLNodes(nodes, excludeMap);
                        return [4 /*yield*/, this.validate(xmlTempString)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: 
                    // All commands should support --json
                    return [2 /*return*/, deps.toJson()];
                }
            });
        });
    };
    Report.prototype.getDependencyRecords = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var queryString, where, list, listArray, total_1, list, listArray, total_2, query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        queryString = 'SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency';
                        where = ' WHERE';
                        if (this.flags.includelist) {
                            list = this.flags.includelist;
                            listArray = list.split(',');
                            total_1 = '';
                            listArray.forEach(function (element) {
                                var filterArr = element.split(':');
                                var filtertype = filterArr[0];
                                var addition;
                                if (filterArr.length > 1) {
                                    var filtername = filterArr[1];
                                    addition = "((RefMetadataComponentName = '" + filtername + "' AND RefMetadataComponentType = '" + filtertype + "') OR (MetadataComponentName = '" + filtername + "' AND MetadataComponentType = '" + filtertype + "'))";
                                }
                                else {
                                    addition = "(RefMetadataComponentType = '" + filtertype + "' OR MetadataComponentType = '" + filtertype + "')";
                                }
                                if (total_1 !== '') {
                                    total_1 = total_1.concat(" OR (" + addition + ")");
                                }
                                else {
                                    total_1 = "(" + addition + ")";
                                }
                            });
                            where = where.concat(" (" + total_1 + ")");
                        }
                        if (this.flags.excludelist) {
                            list = this.flags.excludelist;
                            listArray = list.split(',');
                            total_2 = '';
                            listArray.forEach(function (element) {
                                var filterArr = element.split(':');
                                var filtertype = filterArr[0];
                                var addition;
                                if (filterArr.length > 1) {
                                    var filtername = filterArr[1];
                                    addition = "((RefMetadataComponentName = '" + filtername + "' AND RefMetadataComponentType = '" + filtertype + "') OR (MetadataComponentName = '" + filtername + "' AND MetadataComponentType = '" + filtertype + "'))";
                                }
                                else {
                                    addition = "(RefMetadataComponentType = '" + filtertype + "' OR MetadataComponentType = '" + filtertype + "')";
                                }
                                if (total_2 !== '') {
                                    total_2 = total_2.concat(" OR (" + addition + ")");
                                }
                                else {
                                    total_2 = "(" + addition + ")";
                                }
                            });
                            if (where !== ' WHERE') {
                                where = where.concat(' AND');
                            }
                            where = where.concat(" (NOT (" + total_2 + "))");
                        }
                        if (where !== ' WHERE') {
                            queryString = queryString.concat(where);
                        }
                        query = connection.tooling.autoFetchQuery(queryString);
                        return [4 /*yield*/, query];
                    case 1: return [2 /*return*/, (_a.sent()).records];
                }
            });
        });
    };
    Report.prototype.getAllRecords = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var queryString, query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        queryString = 'SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency';
                        query = connection.tooling.autoFetchQuery(queryString);
                        return [4 /*yield*/, query];
                    case 1: return [2 /*return*/, (_a.sent()).records];
                }
            });
        });
    };
    Report.prototype.buildDFSGraph = function (allRecords, deps) {
        return __awaiter(this, void 0, void 0, function () {
            var initialNodes;
            return __generator(this, function (_a) {
                initialNodes = Array.from(deps.nodes);
                deps.buildGraph(allRecords);
                deps.runDFS(initialNodes);
                return [2 /*return*/, Array.from(deps.nodes)];
            });
        });
    };
    Report.prototype.validate = function (xmlTempString) {
        return __awaiter(this, void 0, void 0, function () {
            var tempFolder, file, username, cmd, cleanupCommand;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tempFolder = fileWriter_1.FileWriter.createTempFolder() + '/';
                        file = tempFolder + 'package.xml';
                        fileWriter_1.FileWriter.writeFile(tempFolder, 'package.xml', xmlTempString);
                        username = this.flags.targetusername;
                        cmd = 'sfdx force:mdapi:retrieve -u ' + username + ' -k ' + file + ' -r ' + tempFolder;
                        return [4 /*yield*/, this.sh(cmd)];
                    case 1:
                        _a.sent();
                        cmd = 'sfdx force:mdapi:deploy -w 10 -u ' + username + ' -c -f ' + tempFolder + 'unpackaged.zip';
                        return [4 /*yield*/, this.sh(cmd)];
                    case 2:
                        _a.sent();
                        cleanupCommand = 'rm -rf ' + tempFolder;
                        return [4 /*yield*/, this.sh(cleanupCommand)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Report.prototype.generateOutputs = function (deps, nodes, excludeMap) {
        var xmlString = '';
        if (this.flags.generatemanifest) {
            xmlString = clusterPackager_1.ClusterPackager.writeXMLNodes(nodes, excludeMap);
            if (this.flags.outputdir) {
                fileWriter_1.FileWriter.writeFile(this.flags.outputdir, 'package.xml', xmlString);
            }
            else {
                fileWriter_1.FileWriter.writeFile('.', 'package.xml', xmlString);
            }
        }
        var output = '';
        var fileName = 'graph.dot';
        if (this.flags.resultformat === 'xml') {
            output = clusterPackager_1.ClusterPackager.writeXMLNodes(nodes, excludeMap);
            fileName = 'package.xml';
        }
        else {
            output = deps.toDotFormat();
        }
        if (this.flags.outputdir) {
            fileWriter_1.FileWriter.writeFile(this.flags.outputdir, fileName, output);
            if (this.flags.resultformat === 'dot') {
                this.ux.log('Created file: ' + this.flags.outputdir + '/graph.dot');
            }
            if (this.flags.resultformat === 'xml' || this.flags.generatemanifest) {
                this.ux.log('Created file: ' + this.flags.outputdir + '/package.xml');
            }
        }
        else {
            this.ux.log(output);
        }
    };
    Report.prototype.sh = function (cmd) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        process.exec(cmd, function (err, stdout, stderr) {
                            if (err) {
                                console.log(err);
                                reject({ err: err });
                            }
                            else {
                                resolve({ stdout: stdout, stderr: stderr });
                            }
                        });
                    })];
            });
        });
    };
    Report.description = messages.getMessage('description');
    Report.examples = [messages.getMessage('example1')];
    Report.flagsConfig = {
        resultformat: command_1.flags.string({ char: 'r', description: messages.getMessage('resultformatFlagDescription'), "default": 'dot', options: ['dot', 'xml'] }),
        includelist: command_1.flags.string({ char: 'i', description: messages.getMessage('includeListDescription') }),
        excludelist: command_1.flags.string({ char: 'e', description: messages.getMessage('excludeListDescription') }),
        outputdir: command_1.flags.string({ char: 'd', description: messages.getMessage('outputDirDescription') }),
        generatemanifest: command_1.flags.boolean({ char: 'm', description: messages.getMessage('generateManifestDescription') }),
        excludepackagefile: command_1.flags.string({
            char: 'x',
            description: messages.getMessage('excludePackageDescription'),
            dependsOn: ['generatemanifest']
        }),
        includealldependencies: command_1.flags.boolean({
            char: 'a',
            description: messages.getMessage('getIncludeDependencies'),
            dependsOn: ['includelist']
        }),
        includealldependents: command_1.flags.boolean({
            char: 't',
            description: messages.getMessage('getIncludeDependents'),
            dependsOn: ['includelist']
        }),
        validate: command_1.flags.boolean({
            char: 'v',
            description: messages.getMessage('validateDescription')
        })
    };
    Report.requiresUsername = true;
    return Report;
}(command_1.SfdxCommand));
exports["default"] = Report;
