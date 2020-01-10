/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// import { SfdxProject } from "@salesforce/core";
import { core, flags } from '@salesforce/command';
import { SfdxCommand } from "@salesforce/command";

import { PackageGraph } from '../../../lib/packageGraph';
import { Package } from '../../../lib/PackageDefs';

import process = require('child_process');
import { join } from 'path';

core.Messages.importMessagesDirectory(join(__dirname));
const messages = core.Messages.loadMessages('dependencies-cli', 'version');

export default class Version extends SfdxCommand {

    public static description = messages.getMessage('description');
    public static examples = [messages.getMessage('example')];

    protected static flagsConfig = {
        resultformat: flags.string({ char: 'r', description: messages.getMessage('resultformatFlagDescription'), default: 'dot', options: ['dot'] }),
    }

    protected static requiresUsername = true;

    protected static supportsDevhubUsername = true;
    protected static supportsUsername = true;
    protected static requiresProject = true;

    protected subscriberPackage: Package[] = [];

    public async run(): Promise<any> {

        const conn = this.org.getConnection();
        conn.version = '45.0';

        /*
        * 1. DEVELOPER EXPERIENCE

        const project = await SfdxProject.resolve();
        const projectJson = await project.resolveProjectConfig();

        const packageAliases = new Array(projectJson.packageAliases);

        for (var application of packageAliases) {

            // retrieve the version ids from the sfdx-project.json
            // TODO: There my be versions not registered in sfdx-project.json
            // that should be added here
            for (var key in Object(application)) {
                let packageVersion: string = application[key];

                if (packageVersion.startsWith('04t')) {
                    // this.subscriberPackage.push(packageVersion);
                }
            }

            // TODO: lookup the details of a package from sfdx-project.json
        }
        */

        /*
        * 2. ADMIN EXPERIENCE
        */

        var installedPackages = await this.getForcePackageInstalledList();
        const graph = new PackageGraph(conn, installedPackages);
        await graph.init();
        await graph.buildGraph();

        // this runs only if --json flag is used exclusively (takes precendence over -r)   
        if (this.flags.json == true)  return graph.toJson();

        // this runs for -r [dot|gexf]
        if (this.flags.resultformat === 'gexf') {
            console.log(graph.toGexfFormat());
        } else {
            console.log(graph.toDotFormat());
        }

    }


    private async getForcePackageInstalledList(): Promise<Package[]> {

        const username = this.flags.targetusername;
        let cmd = 'NODE_OPTIONS=--inspect=0 sfdx force:package:installed:list -u ' + username + ' --json ';

        /*
        // This shSpawn would be preferred but does not work when using the debugger
        let cmd = "sfdx";
        let options = ["force:package:installed:list", "-u", username, "--json"];
        */
        await this.shExec(cmd).then((stdout: string) => {

            var output = JSON.parse(stdout);
            if (output.result) {
                for (var _subscriberPackage of output.result) {
                    const _package: Package = {
                        Id: _subscriberPackage.SubscriberPackageId,
                        Path: null,
                        Name: _subscriberPackage.SubscriberPackageName,
                        Namespace: _subscriberPackage.SubscriberPackageNamespace,
                        VersionId: _subscriberPackage.SubscriberPackageVersionId,
                        VersionName: _subscriberPackage.SubscriberPackageVersionName,
                        VersionNumber: _subscriberPackage.SubscriberPackageVersionNumber
                    }

                    this.subscriberPackage.push(_package);
                }
            }
        }).catch((stderr) => {
            console.log(stderr);
        });

        return this.subscriberPackage;
    }

    /*
    * Run a command with exec
    */
     private async shExec(cmd: string) {
         return new Promise((resolve, reject) => {
             process.exec(cmd, (err, stdout, stderr) => {
                 if (err) {
                     console.log(err);
                     reject({ err });
                 } else {
                     resolve(stdout);
                 }
             });
         });
     }

    /*
    * Run a command with spawn

    private async shSpawn(cmd: string, options: any) {
        return new Promise(function (resolve, reject) {
            var child = process.spawn,
                sfdx = child(cmd, options);

            sfdx.stderr.on('data', function (data) {
                console.log(cmd + `STDERR :: \n${data}`);
                reject(data);
            });

            sfdx.stdout.on('data', function (data) {
                resolve(data);
            });
        });
    } */
}
