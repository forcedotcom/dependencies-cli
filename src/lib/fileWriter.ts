import fs = require('fs');
import shell = require('shelljs');
import crypto = require('crypto');
import path = require('path');

export class FileWriter {
    
    private static homedir = require('os').homedir();

    public static createFolder(folderName: string): string {
        let actualFolder = folderName;
        if (actualFolder.match(/^~/))  {
            actualFolder.replace('~', FileWriter.homedir);
        }
        if (!fs.existsSync(actualFolder)) {
            shell.mkdir('-p', actualFolder);
        }
        return actualFolder;
    }

    public static writeFile(folderName, fileName, text): void {
        let actualFolder = FileWriter.createFolder(folderName);
        let completeFile = path.join(actualFolder, fileName);
        fs.writeFileSync(completeFile, text);
    }

    public static createTempFolder(): string {
        let tempFolder = 'tmp';
        while (fs.existsSync(tempFolder)) {
            tempFolder = tempFolder + crypto.randomBytes(16).toString('hex'); 
        }
        shell.mkdir('-p', tempFolder);
        return tempFolder;
    }


}