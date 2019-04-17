"use strict";
exports.__esModule = true;
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var FileWriter = /** @class */ (function () {
    function FileWriter() {
    }
    FileWriter.createFolder = function (folderName) {
        var actualFolder = folderName;
        if (actualFolder.match(/^~/)) {
            actualFolder.replace('~', FileWriter.homedir);
        }
        if (!fs.existsSync(actualFolder)) {
            shell.mkdir('-p', actualFolder);
        }
        return actualFolder;
    };
    FileWriter.writeFile = function (folderName, fileName, text) {
        var actualFolder = FileWriter.createFolder(folderName);
        var completeFile = path.join(actualFolder, fileName);
        fs.writeFileSync(completeFile, text);
    };
    FileWriter.createTempFolder = function () {
        var tempFolder = 'tmp';
        while (fs.existsSync(tempFolder)) {
            tempFolder = tempFolder + crypto.randomBytes(16).toString('hex');
        }
        shell.mkdir('-p', tempFolder);
        return tempFolder;
    };
    FileWriter.homedir = require('os').homedir();
    return FileWriter;
}());
exports.FileWriter = FileWriter;
