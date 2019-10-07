/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfdxProject } from "@salesforce/core";
import { SfdxCommand } from "@salesforce/command";

import {PackageGraph} from '../../../lib/packageGraph';
import { Package } from '../../../lib/PackageDefs';

import process = require('child_process');

export default class Version extends SfdxCommand {

    public static description = 'Analyze version dependencies for packages within a 2nd generation development project.'

    protected static flagsConfig = {

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
        */
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


        /*
        * 2. ADMIN EXPERIENCE
        */
        this.getForcePackageInstalledList().
        then(async (installedPackages) => {
    
            const graph = new PackageGraph(conn, installedPackages);
            await graph.init();
            graph.buildGraph();
            // console.log(graph.toJson());
            console.log(graph.toDotFormat());

        })
        .catch((error) => {
            console.log(error);
        });

        // const records = await this.getDependencyRecords(conn);

        // await packs.buildGraph(installedPackages);
    }
    

    private async getForcePackageInstalledList(): Promise<Package[]> {

        const username = this.flags.targetusername;
        let cmd = 'NODE_OPTIONS=--inspect=0 sfdx force:package:installed:list -u ' + username + ' --json ';

        await this.sh(cmd).then((stdout: string) => {

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

    private async sh(cmd: string) {
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
    private async sh(cmd: string) {
        return new Promise((resolve, reject) => {
            const child = process.spawn(cmd);
            
            child.on('error', function(code, signal) {
                reject({code, signal});
            });

            child.stdout.on('data', (data) => {
                console.log(`child stdout:\n${data}`);
                resolve(data);
              });
        });
    }
    */
}

/*
Execute
    sfdx force:package:version:list --json
Filter output for
    packageNames array
Return
    map<string, array<string>> of packageNames to list of available package versions
*/

/*
private async sfdxPackageVersionList(packageName: string) {

let cmd = "sfdx force:package:version:list --json"
const results = (await this.sh(cmd));
console.log(results);

var dependency04tIds = [];

for (const elem of results) {
    if (!isNull(elem.SubscriberPackageVersion) && (!isNull(elem.SubscriberPackageVersion.ids))) {
        for (const id of elem.SubscriberPackageVersion.ids) {
            dependency04tIds.push(id.subscriberPackageVersionId);
        }
    }
}

return dependency04tIds;
}
*/