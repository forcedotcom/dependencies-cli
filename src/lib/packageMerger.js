"use strict";
exports.__esModule = true;
var fs = require("fs");
var Member = /** @class */ (function () {
    function Member(name, type) {
        this.name = name;
        this.type = type;
    }
    Member.prototype.equals = function (other) {
        return (this.name === other.name && this.type === other.type);
    };
    return Member;
}());
exports.Member = Member;
var PackageMerger = /** @class */ (function () {
    function PackageMerger() {
    }
    PackageMerger.parseIntoMap = function (fileName) {
        var xmlOutput = fs.readFileSync(fileName);
        var outputMap = new Map();
        PackageMerger.parseXML.parseString(xmlOutput, function (err, res) {
            if (err) {
                console.log('INVALID XML FILE');
                console.log(err);
            }
            if (res.Package.types) {
                for (var _i = 0, _a = res.Package.types; _i < _a.length; _i++) {
                    var arr = _a[_i];
                    var objects = new Array();
                    var type = arr.name[0];
                    for (var _b = 0, _c = arr.members; _b < _c.length; _b++) {
                        var name_1 = _c[_b];
                        var record = new Member(name_1, type);
                        objects.push(record);
                    }
                    outputMap.set(type, objects);
                }
            }
        });
        return outputMap;
    };
    PackageMerger.containsMember = function (name, type, map, checkParent) {
        if (checkParent === void 0) { checkParent = false; }
        if (map == null) {
            return false;
        }
        var arr = map.get(type);
        if (arr) {
            for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
                var mem = arr_1[_i];
                if (mem.name === name && mem.type === type) {
                    return true;
                }
            }
        }
        if (checkParent) {
            // Check Custom Objects as well
            arr = map.get('CustomObject');
            if (arr) {
                for (var _a = 0, arr_2 = arr; _a < arr_2.length; _a++) {
                    var mem = arr_2[_a];
                    if (name.startsWith(mem.name)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    PackageMerger.parseXML = require('xml2js');
    return PackageMerger;
}());
exports.PackageMerger = PackageMerger;
