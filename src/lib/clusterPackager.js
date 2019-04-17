"use strict";
exports.__esModule = true;
var dependencyGraph_1 = require("./dependencyGraph");
var packageMerger_1 = require("./packageMerger");
var TYPE_BLACKLIST = ['AuraDefinition', 'StandardEntity'];
var ClusterPackager = /** @class */ (function () {
    function ClusterPackager() {
    }
    // precondition: All nodes are Scalar Nodes
    ClusterPackager.separateIntoGroupsFromNodes = function (nodes, excludeMap) {
        if (excludeMap === void 0) { excludeMap = null; }
        var output = new Map();
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            var type = (node.details.get('type')).valueOf();
            var name_1 = node.details.get('name');
            var actualName = name_1.valueOf();
            if (type.startsWith('Custom')) {
                actualName = actualName + '__c';
            }
            else if (TYPE_BLACKLIST.indexOf(type) >= 0) {
                continue;
            }
            var hasParent = dependencyGraph_1.componentsWithParents.indexOf(type) >= 0;
            if (hasParent) {
                actualName = node.details.get('parent').valueOf() + actualName;
            }
            if (packageMerger_1.PackageMerger.containsMember(actualName, type, excludeMap, hasParent)) {
                continue;
            }
            var list = output.get(type);
            if (!list) {
                list = new Array();
                output.set(type, list);
            }
            list.push(actualName);
        }
        return output;
    };
    ClusterPackager.writeXMLNodes = function (n, excludeMap, forValidation) {
        if (excludeMap === void 0) { excludeMap = null; }
        if (forValidation === void 0) { forValidation = false; }
        return ClusterPackager.writeXML(n, excludeMap, forValidation);
    };
    ClusterPackager.writeXMLNodeGroup = function (n, forValidation) {
        if (forValidation === void 0) { forValidation = false; }
        return ClusterPackager.writeXML(Array.from(n.nodes), null, forValidation);
    };
    ClusterPackager.writeXMLMap = function (baseMap) {
        var _this = this;
        var xmlString = ClusterPackager.writeHeader();
        baseMap.forEach(function (memberList, type) {
            var typeString = _this.writeTypeMember(type, memberList);
            xmlString = xmlString.concat(typeString.valueOf());
        });
        xmlString = xmlString.concat(ClusterPackager.writeFooter());
        return xmlString;
    };
    ClusterPackager.writeXML = function (n, excludeMap, forValidation) {
        var _this = this;
        if (excludeMap === void 0) { excludeMap = null; }
        var text = ClusterPackager.writeHeader();
        var typeMap = ClusterPackager.separateIntoGroupsFromNodes(n, excludeMap);
        Array.from(typeMap.entries()).forEach(function (pair) {
            if (forValidation) {
                text = text.concat(_this.writeWildCardType(pair[0], pair[1]));
            }
            text = text.concat(_this.writeType(pair[0], pair[1]));
        });
        text = text.concat(ClusterPackager.writeFooter());
        return text;
    };
    ClusterPackager.writeTypeMember = function (type, members) {
        var nullCount = 0;
        var typeBody = '\t<types>\n';
        for (var _i = 0, members_1 = members; _i < members_1.length; _i++) {
            var member = members_1[_i];
            if (member != null) {
                typeBody = typeBody.concat('\t\t<members>');
                typeBody = typeBody.concat(member.name);
                typeBody = typeBody.concat('</members>');
                typeBody = typeBody.concat('\n');
            }
            else {
                nullCount++;
            }
        }
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(type);
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        if (nullCount === members.length) {
            return '';
        }
        return typeBody;
    };
    ClusterPackager.writeHeader = function () {
        var header = '';
        // Add XML version and encoding
        header = header.concat('<?xml version=\"1.0\" encoding=\"UTF-8\"?>');
        header = header.concat('\n');
        header = header.concat('<Package xmlns=\"http://soap.sforce.com/2006/04/metadata\">\n');
        return header;
    };
    ClusterPackager.writeFooter = function () {
        var footer = '';
        // Set version to 34.0, may be a flag that can be added later
        footer = footer.concat('\t<version>43.0</version>');
        footer = footer.concat('\n');
        footer = footer.concat('</Package>');
        return footer;
    };
    ClusterPackager.writeType = function (type, nodes) {
        var typeBody = '\t<types>\n';
        for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
            var n = nodes_2[_i];
            typeBody = typeBody.concat('\t\t<members>');
            typeBody = typeBody.concat(n);
            typeBody = typeBody.concat('</members>');
            typeBody = typeBody.concat('\n');
        }
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(type);
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        return typeBody;
    };
    ClusterPackager.writeWildCardType = function (type, nodes) {
        var typeBody = '\t<types>\n';
        typeBody = typeBody.concat('\t\t<members>*</members>');
        typeBody = typeBody.concat('\n');
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(type);
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        return typeBody;
    };
    return ClusterPackager;
}());
exports.ClusterPackager = ClusterPackager;
