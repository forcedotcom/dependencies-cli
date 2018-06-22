import * as Analyze from '../dependencies/componentizer';
import {core, flags, SfdxCommand } from '@salesforce/command';
import {ClusterPackager} from '../../../lib/clusterPackager';
import { DependencyGraph, MetadataComponentDependency } from '../../../lib/dependencyGraph';
import {FindAllDependencies} from '../../../lib/DFSLib';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages('dependencies-cli', 'depends');

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('description');
  public static examples = [messages.getMessage('example1')];

  protected static flagsConfig = {
    resultformat: flags.string({ char: 'r', description: messages.getMessage('resultformatFlagDescription'), default: 'dot', options: ['dot'] }),
    // metadatacomponentname: flags.string({ char: 'm', description: messages.getMessage('metadatacomponentnameFlagDescription') }),
    // querycriteria: flags.string({ char: 'q', description: messages.getMessage('querycriteriaFlagDescription') }),
    includelist: flags.string({char: 'i', description: messages.getMessage('includeListDescription')}),
    excludelist: flags.string({char: 'e', description: messages.getMessage('excludeListDescription')}),
    generatepackage: flags.string({char: 'o', description: messages.getMessage('generatePackageDescription')}),
    getincludedependencies: flags.boolean({
      char: 't',
      description: messages.getMessage('getIncludeDependencies'),
      dependsOn: ['includelist']
    })
  };

  protected static requiresUsername = true;

  public async run(): Promise<core.AnyJson> {
    const conn = this.org.getConnection();
    conn.version = '43.0';

    const deps = new DependencyGraph(conn.tooling);
    const records = await this.getDependencyRecords();
    const initialGraph = Analyze.default.buildGraph(records);

    let nodes = Array.from(initialGraph.nodes);

    if (this.flags.getincludedependencies) {
       const allRecords = await this.getAllRecords();
       const completeGraph = Analyze.default.buildGraph(allRecords);
       const dfs = new FindAllDependencies(completeGraph);
       const initialNodes = Array.from(initialGraph.nodes);
       initialNodes.forEach(element => {
          dfs.runNode(completeGraph.getNode(element.name));
       });
       // Get all Nodes, including dependencies
       nodes = Array.from(dfs.visited);
       // Initialize the dependency graph with a filtered list of all Records
       await deps.initWithFilter(allRecords, dfs.visitedNames);
    } else {
      // Initialize with the records from query
      await deps.init(records);
    }

    if (this.flags.generatepackage) {
      const cp = new ClusterPackager(this.flags.generatepackage);
      cp.writeXMLNodes(nodes);
    }
    // Only dot format is allowed by the flags property, but put
    // this check in case you add more later
    if (this.flags.resultformat === 'dot') {
      this.ux.log(deps.toDotFormat());
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
    const query = this.org.getConnection().tooling.query<MetadataComponentDependency>(queryString);
    return (await query).records;
  }

  private async getAllRecords() {
    const queryString = 'SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency';
    const query = this.org.getConnection().tooling.query<MetadataComponentDependency>(queryString);
    return (await query).records;
  }

}
