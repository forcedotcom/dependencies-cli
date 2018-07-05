import {core, flags, SfdxCommand } from '@salesforce/command';
import * as Analyze from '../dependencies/componentizer';
import {ClusterPackager} from '../../../lib/clusterPackager';
import {DependencyGraph, MetadataComponentDependency } from '../../../lib/dependencyGraph';
import {FindAllDependencies} from '../../../lib/DFSLib';
import {Member, PackageMerger} from '../manifests/merge';
import {Connection} from '@salesforce/core';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages('dependencies-cli', 'depends');

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('description');
  public static examples = [messages.getMessage('example1')];

  protected static flagsConfig = {
    resultformat: flags.string({ char: 'r', description: messages.getMessage('resultformatFlagDescription'), default: 'dot', options: ['dot', 'xml'] }),
    // metadatacomponentname: flags.string({ char: 'm', description: messages.getMessage('metadatacomponentnameFlagDescription') }),
    // querycriteria: flags.string({ char: 'q', description: messages.getMessage('querycriteriaFlagDescription') }),
    includelist: flags.string({char: 'i', description: messages.getMessage('includeListDescription')}),
    excludelist: flags.string({char: 'e', description: messages.getMessage('excludeListDescription')}),
    packageoutputdirectory: flags.string({char: 'd', description: messages.getMessage('generatePackageDescription')}),
    excludepackagefile: flags.string({
      char: 'f',
      description: messages.getMessage('excludePackageDescription'),
      dependsOn: ['generatepackage']
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
    })
  };

  protected static requiresUsername = true;

  public async run(): Promise<core.AnyJson> {
    const conn = this.org.getConnection();
    conn.version = '43.0';

    const deps = new DependencyGraph(conn.tooling);
    await deps.init();
    const records = await this.getDependencyRecords();
    const initialGraph = Analyze.default.buildGraph(records, true);

    let nodes = Array.from(initialGraph.nodes);

    let excludeMap: Map<String, Member[]>;
    if (this.flags.excludepackagefile) {
      excludeMap = PackageMerger.parseIntoMap(this.flags.excludepackagefile);
    }

    let allRecords: MetadataComponentDependency[];
    if (this.flags.includealldependencies || this.flags.includealldependents) {
      allRecords = await this.getAllRecords();
      const completeGraph = Analyze.default.buildGraph(allRecords, true, this.flags.includealldependencies === true, this.flags.includealldependents === true);
      Analyze.default.addLookupsToGraph(completeGraph, deps.getLookupRelationships());
      const dfs = new FindAllDependencies(completeGraph);
      let initialNodes = Array.from(initialGraph.nodes);
      initialNodes.forEach(element => {
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
        initialNodes = null; // Do not specify any initial nodes
      }

      await deps.buildGraph(allRecords, dfs.visitedNames, initialNames , this.flags.includealldependencies === true);
    } else {
      // Initialize with the records from query
      deps.buildGraph(records);
    }

    let xmlString = '';
    if (this.flags.packageoutputdirectory) {
      const cp = new ClusterPackager(this.flags.packageoutputdirectory);
      xmlString = cp.writeXMLNodes(nodes, excludeMap);
    }
    // Only dot format is allowed by the flags property, but put
    // this check in case you add more later
    if (this.flags.resultformat === 'dot') {
      this.ux.log(deps.toDotFormat());
    } else if (this.flags.resultformat === 'xml' && xmlString == '') {
      const packageWriter = new ClusterPackager('');
      xmlString = packageWriter.writeXMLNodes(nodes, null, false);
      this.ux.log(xmlString);
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

}
