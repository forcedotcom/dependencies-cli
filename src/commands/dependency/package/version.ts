import { SfdxProject } from "@salesforce/core";
import { SfdxCommand, core } from "@salesforce/command";
// import process = require('child_process');

import { isNull } from "util";

export default class Version extends SfdxCommand {

    public static description = 'List version updates available to packages in the org.'

    protected static flagsConfig = {

    }

    protected static supportsDevhubUsername = true;
    protected static supportsUsername = true;
    protected static requiresProject = true;

    public async run(): Promise<any> {

        const conn = this.org.getConnection();
        conn.version = '45.0';


        const project = await SfdxProject.resolve();
        const projectJson = await project.resolveProjectConfig();
        var subscriberPackage = [];

        if (!isNull(projectJson.packageDirectories)) {
       /*     for (const application of project.resolveProjectConfig) {
                if (!isNull(application.dependencies)) {
                    for (const dependency of application.dependencies) {
                        subscriberPackage = await this.sfdxPackageVersionList(dependency);
                    }
                }
            }
            */
        }

        console.log(subscriberPackage);

        const subscriberPackageVersions = await this.getSubscriberPackageVersions(conn);

        console.log(subscriberPackageVersions);

        return subscriberPackageVersions;
    }

    private async getSubscriberPackageVersions(connection: core.Connection) {

        let queryString = 'SELECT Dependencies FROM SubscriberPackageVersion WHERE Id=\'04t1U000003XEqdQAG\'';
        const results = (await connection.tooling.query<any>(queryString)).records;

        var dependency04tIds = [];

        for (const elem of results) {
            if (!isNull(elem.Dependencies) && (!isNull(elem.Dependencies.ids))) {
                for (const id of elem.Dependencies.ids) {
                    dependency04tIds.push(id.subscriberPackageVersionId);
                }
            }
        }

        return dependency04tIds;
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

/*
    private async sh(cmd) {
        return new Promise((resolve, reject) => {
          process.exec(cmd, (err, stdout, stderr) => {
            if (err) {
              console.log(err);
              reject({err});
            } else {
              resolve({ stdout, stderr });
              // return stdout;
            }
          });
        });
      }

      */
}
