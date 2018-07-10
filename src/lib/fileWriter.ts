import fs = require('fs');
import shell = require('shelljs');
export class FileWriter {
    
    private static homedir = require('os').homedir();

    public static createFolder(folderName: string): string {
        let actualFolder = folderName;
        if (folderName.charAt(folderName.length - 1) !== '/') {
            actualFolder = folderName + '/';
        }
        if (actualFolder.match('/^~'))  {
            actualFolder.replace("~", FileWriter.homedir);
        }
        if (!fs.existsSync(actualFolder)) {
            shell.mkdir('-p', actualFolder);
        }
        return actualFolder;
    }

    public static writeFile(folderName, fileName, text): void {
        let actualFolder = FileWriter.createFolder(folderName);
        let completeFile = actualFolder + fileName;
        fs.writeFileSync(completeFile, text);
    }

    public static createTempFolder(): string {
        let tempFolder = 'tmp';
        while (fs.existsSync(tempFolder)) {
            tempFolder = tempFolder + '1f3'; // Doesn't really matter what we add, just want to make folder unique
        }
        shell.mkdir('-p', tempFolder);
        return tempFolder + '/';
    }


}