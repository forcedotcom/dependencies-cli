import {core, flags, SfdxCommand } from '@salesforce/command';
import {ClusterPackager} from '../../../lib/clusterPackager';
import {DependencyGraph} from '../../../lib/dependencyGraph';
import {MetadataComponentDependency, Node} from '../../../lib/NodeDefs';
import {FileWriter} from '../../../lib/fileWriter';
import {FindAllDependencies} from '../../../lib/DFSLib';
import {Member, PackageMerger} from '../../../lib/PackageMerger';
import {Connection} from '@salesforce/core';
import process = require('child_process');

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages('dependencies-cli', 'depends');

export default class Report extends SfdxCommand {
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


  public async run(): Promise<core.AnyJson> {
    const conn = this.org.getConnection();
    conn.version = '43.0';

    const deps = new DependencyGraph(conn.tooling);
    await deps.init();
    const records = await this.getDependencyRecords(conn);

    let excludeMap: Map<String, Member[]>;
    if (this.flags.excludepackagefile) {
      excludeMap = PackageMerger.parseIntoMap(this.flags.excludepackagefile);
    }

    await deps.buildGraph(records);

    let nodes = Array.from(deps.nodes);
    if (this.flags.includealldependencies || this.flags.includealldependents) {
        let allRecords = await this.getAllRecords(conn);
        nodes = await this.buildDFSGraph(allRecords, deps);
    }

    this.generateOutputs(deps,nodes, excludeMap);

    if (this.flags.validate) {
        let xmlTempString = ClusterPackager.writeXMLNodes(nodes, excludeMap);
        await this.validate(xmlTempString);
    }

    // All commands should support --json
    return deps.toJson();
  }

  private async getDependencyRecords(connection: core.Connection) {
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
    const query = connection.tooling.autoFetchQuery<MetadataComponentDependency>(queryString);
    return (await query).records;
  }

  private async getAllRecords(connection: core.Connection) {
    const queryString = 'SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency';
    const query = connection.tooling.autoFetchQuery<MetadataComponentDependency>(queryString);
    return (await query).records;
  }


  private async buildDFSGraph(allRecords: MetadataComponentDependency[], deps: DependencyGraph): Promise<Node[]> {
    let initialNodes = Array.from(deps.nodes);
    deps.buildGraph(allRecords);
    deps.runDFS(initialNodes);
    return Array.from(deps.nodes);
  }

  private async validate(xmlTempString: string): Promise<any> {
    let tempFolder = FileWriter.createTempFolder() + '/';

    
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

  private generateOutputs(deps: DependencyGraph, nodes: Node[], excludeMap: Map<String, Member[]>) {
    let xmlString = '';
    if (this.flags.generatemanifest) {
      xmlString = ClusterPackager.writeXMLNodes(nodes, excludeMap);
      if (this.flags.outputdir) {
        FileWriter.writeFile(this.flags.outputdir, 'package.xml', xmlString);
      } else {
        FileWriter.writeFile('.','package.xml', xmlString);
      }
    }

    let output = '';
    let fileName = 'graph.dot';
    if (this.flags.resultformat == 'xml') {
      output = ClusterPackager.writeXMLNodes(nodes, excludeMap);
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
  }

  private async sh(cmd) {
    return new Promise(function (resolve, reject) {
      process.exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          reject({err});
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  
}
