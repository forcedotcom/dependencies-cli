/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import crypto = require('crypto');
import fs = require('fs');
import path = require('path');
import shell = require('shelljs');

export class FileWriter {

    public static createFolder(folderName: string): string {
        const actualFolder = folderName;
        if (actualFolder.match(/^~/))  {
            actualFolder.replace('~', FileWriter.homedir);
        }
        if (!fs.existsSync(actualFolder)) {
            shell.mkdir('-p', actualFolder);
        }
        return actualFolder;
    }

    public static writeFile(folderName, fileName, text): void {
        const actualFolder = FileWriter.createFolder(folderName);
        const completeFile = path.join(actualFolder, fileName);
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
    private static homedir = require('os').homedir();

}
