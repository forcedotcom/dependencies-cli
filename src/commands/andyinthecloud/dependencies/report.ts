import {core, flags, SfdxCommand } from '@salesforce/command';
import * as Analyze from '../dependencies/componentizer';
import {ClusterPackager} from '../../../lib/clusterPackager';
import {DependencyGraph, MetadataComponentDependency } from '../../../lib/dependencyGraph';
import {FileWriter} from '../../../lib/fileWriter';
import {FindAllDependencies} from '../../../lib/DFSLib';
import {Member, PackageMerger} from '../manifests/merge';
import {Connection} from '@salesforce/core';
import shell = require('shelljs');
import process = require('child_process');

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages('dependencies-cli', 'depends');

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('description');
  public static examples = [messages.getMessage('example1')];
  private static isValid = true;

  protected static flagsConfig = {
    resultformat: flags.string({ char: 'r', description: messages.getMessage('resultformatFlagDescription'), default: 'dot', options: ['dot', 'xml'] }),
    includelist: flags.string({char: 'i', description: messages.getMessage('includeListDescription')}),
    excludelist: flags.string({char: 'e', description: messages.getMessage('excludeListDescription')}),
    outputdir: flags.string({char: 'd', description: messages.getMessage('outputDirDescription')}),
    generatemanifest: flags.boolean({char: 'm', description: messages.getMessage('generateManifestDescription')}),
    excludepackagefile: flags.string({
      char: 'x',
      description: messages.getMessage('excludePackageDescription'),
      dependsOn: ['generatemanifest']
    }),
    includealldependencies: flags.boolean({
      char: 'a',
      description: messages.getMessage('getIncludeDependencies'),
      dependsOn: ['includelist']
    }),
    includealldependents: flags.boolean({
      char: 't',
      description: messages.getMessage('getIncludeDependents'),
      dependsOn: ['includelist']
    }),
    validate: flags.boolean({
      char: 'v',
      description: messages.getMessage('validateDescription'),
    })

  };

  protected static requiresUsername = true;

  private validated = true;


  public async run(): Promise<core.AnyJson> {
    const conn = this.org.getConnection();
    conn.version = '43.0';

    const deps = new DependencyGraph(conn.tooling);
    await deps.init();
    const records = await this.getDependencyRecords();
    const initialGraph = Analyze.default.buildGraph(records, true);
    let parentRecords = deps.getParentRecords();
    initialGraph.addParents(parentRecords);

    let nodes = Array.from(initialGraph.nodes);

    let excludeMap: Map<String, Member[]>;
    if (this.flags.excludepackagefile) {
      excludeMap = PackageMerger.parseIntoMap(this.flags.excludepackagefile);
    }

    let allRecords: MetadataComponentDependency[];
    if (this.flags.includealldependencies || this.flags.includealldependents) {
      allRecords = await this.getAllRecords();
      const completeGraph = Analyze.default.buildGraph(allRecords, true, this.flags.includealldependencies === true, this.flags.includealldependents === true);
      completeGraph.addParents(parentRecords);
      Analyze.default.addLookupsToGraph(completeGraph, deps.getLookupRelationships());
      const dfs = new FindAllDependencies(completeGraph);
      nodes.forEach(element => {
        let foundNode = completeGraph.getNode(element.name);
        if (foundNode) {
          dfs.runNode(foundNode);
        }
      });
      // Get all Nodes, including dependencies
      nodes = Array.from(dfs.visited);
      // Initialize the dependency graph with a filtered list of all Records
      let initialNames = Array.from(initialGraph.nodeNames);
      if (this.flags.includealldependencies && this.flags.includealldependents) {
        initialNames = null; // Do not specify any initial nodes
      }

      await deps.buildGraph(allRecords, dfs.visitedNames, initialNames , this.flags.includealldependencies === true);
    } else {
      // Initialize with the records from query
      deps.buildGraph(records);
    }

    let xmlString = '';
    const cp = new ClusterPackager();
    if (this.flags.generatemanifest) {
      xmlString = cp.writeXMLNodes(nodes, excludeMap);
      if (this.flags.outputdir) {
        FileWriter.writeFile(this.flags.outputdir, 'package.xml', xmlString);
      } else {
        FileWriter.writeFile('.','package.xml', xmlString);
      }
    }
    let output = '';
    let fileName = 'graph.dot';
    if (this.flags.resultformat == 'xml') {
      output = cp.writeXMLNodes(nodes, excludeMap);
      fileName = 'package.xml';
    } else {
      output = deps.toDotFormat();
    }

    if (this.flags.outputdir) {
      FileWriter.writeFile(this.flags.outputdir, fileName, output);
      if (this.flags.resultformat == 'dot') {
        this.ux.log ('Created file: ' + this.flags.outputdir + '/graph.dot');
      }
      if (this.flags.resultformat == 'xml' || this.flags.generatemanifest) {
        this.ux.log('Created file: ' + this.flags.outputdir + '/package.xml');
      }
    } else {
      this.ux.log(output)
    }

    if (this.flags.validate) {
      
      let tempFolder = FileWriter.createTempFolder() + '/';

      const cp = new ClusterPackager();
      let xmlTempString = cp.writeXMLNodes(nodes, excludeMap);
      
      let file =  tempFolder + 'package.xml';
      FileWriter.writeFile(tempFolder, 'package.xml', xmlTempString);
      let username = this.flags.targetusername;
      let cmd = 'sfdx force:mdapi:retrieve -u ' + username + ' -k ' + file + ' -r ' + tempFolder;
      
      await this.sh(cmd);
          
      cmd = 'sfdx force:mdapi:deploy -w 10 -u ' + username + ' -c -f ' + tempFolder  + 'unpackaged.zip';
      
      await this.sh(cmd);

      let cleanupCommand = 'rm -rf ' + tempFolder;

      await this.sh(cleanupCommand);
    }

    // All commands should support --json
    return deps.toJson();
  }

  private async getDependencyRecords() {
    let queryString = 'SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency';
    let where = ' WHERE';

    if (this.flags.includelist) {
      const list = this.flags.includelist;
      const listArray = list.split(',');
      let total = '';
      listArray.forEach(element => {
        const filterArr = element.split(':');
        const filtertype = filterArr[0];
        let addition: string;
        if (filterArr.length > 1) {
          const filtername = filterArr[1];
          addition = `((RefMetadataComponentName = '${filtername}' AND RefMetadataComponentType = '${filtertype}') OR (MetadataComponentName = '${filtername}' AND MetadataComponentType = '${filtertype}'))`;
        } else {
          addition = `(RefMetadataComponentType = '${filtertype}' OR MetadataComponentType = '${filtertype}')`;
        }
        if (total !== '') {
          total = total.concat(` OR (${addition})`);
        } else {
          total = `(${addition})`;
        }
      });
      where = where.concat(` (${total})`);
    }

    if (this.flags.excludelist) {
      const list = this.flags.excludelist;
      const listArray = list.split(',');
      let total = '';
      listArray.forEach(element => {
        const filterArr = element.split(':');
        const filtertype = filterArr[0];
        let addition: string;
        if (filterArr.length > 1) {
          const filtername = filterArr[1];
          addition = `((RefMetadataComponentName = '${filtername}' AND RefMetadataComponentType = '${filtertype}') OR (MetadataComponentName = '${filtername}' AND MetadataComponentType = '${filtertype}'))`;
        } else {
          addition = `(RefMetadataComponentType = '${filtertype}' OR MetadataComponentType = '${filtertype}')`;
        }
        if (total !== '') {
          total = total.concat(` OR (${addition})`);
        } else {
          total = `(${addition})`;
        }
      });
      if (where !== ' WHERE') {
         where = where.concat(' AND');
      }
      where = where.concat(` (NOT (${total}))`);
    }

    if (where !== ' WHERE') {
      queryString = queryString.concat(where);
    }
    const connection: Connection = this.org.getConnection();
    const query = connection.tooling.autoFetchQuery<MetadataComponentDependency>(queryString);
    return (await query).records;
  }

  private async getAllRecords() {
    const queryString = 'SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency';
    const connection: Connection = this.org.getConnection();
    const query = connection.tooling.autoFetchQuery<MetadataComponentDependency>(queryString);
    return (await query).records;
  }


  private async sh(cmd) {
    return new Promise(function (resolve, reject) {
      process.exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          Org.isValid = false;
          reject({err});
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  
}
