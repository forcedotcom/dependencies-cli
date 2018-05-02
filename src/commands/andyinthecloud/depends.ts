import {flags} from '@oclif/command';
import {join} from 'path';
import {SfdxCommand, core} from '@salesforce/command';

core.Messages.importMessagesDirectory(join(__dirname, '..', '..', '..'));

let critera: string;
let filtername: string;
let filtertype: string;

const fullSOQL = `
SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency`;
const criteriaSOQL = `
SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency Where ${critera}`;
const filterSOQL = `
SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency WHERE RefMetadataComponentName = '${filtername}' AND RefMetadataComponentType = '${filtertype}' AND (NOT MetadataComponentName LIKE '%Test')`;
export default class Org extends SfdxCommand {

  public static description = '';

  public static examples = [
  `$ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
  Hello world! Your org id is: 00Dxx000000004321 and your hub org id is: 00Dxx0000000001234
  `,
  `$ sfdx hello:org --name myname --targetusername myOrg@example.com
  Hello myname! Your org id is: 00Dxx000000004321
  `
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    name:                   flags.string({char: 'n', description: ''}),
    force:                  flags.boolean({char: 'f'}),
    resultformat:           flags.string({char: 'r', description: 'dot graph format'}),
    metadatacomponentnames: flags.string({char: 'm', description: 'filter by components, e.g. CustomField.Thumbnail'}),
    querycriteria:          flags.string({char: 'q', description: 'query criteria'})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<any> {
    
    this.collectFlags();

    const conn: any = this.org.getConnection();

    var ux = this.ux;
    conn.version = '43.0';
    conn.tooling.query(
      critera != null ?
        criteriaSOQL : // Criteria?
      filtername != null && filtertype != null ?
        filterSOQL : // Ref filter?
        fullSOQL // Full org
    ).then(function(res) {
        // Construct the nodes and edge list
        const nodesMap = new Map();
        const nodes = [];
        const edges = [];
        for (const recordIdx in res.records) {
          if (recordIdx) {
            const record = res.records[recordIdx];
            if(record.RefMetadataComponentName.startsWith('0')) {
              continue;
            }
            nodesMap.set(record.MetadataComponentId, { name: record.MetadataComponentName, type: record.MetadataComponentType });
            nodesMap.set(record.RefMetadataComponentId, { name: record.RefMetadataComponentName, type: record.RefMetadataComponentType });
            edges.push({ from : record.MetadataComponentId, to: record.RefMetadataComponentId });
          }
        }
        for (const [key, value] of nodesMap) {
          nodes.push({ id : key, node : value});
        }
        // Render as DOT format
        ux.log('digraph graphname {');
        ux.log('  rankdir=RL;');
        ux.log('  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];');
        ux.log('  // Nodes');

        for (const nodeIdx in nodes) {
          if (nodeIdx) {
            ux.log('  X' + nodes[nodeIdx].id + ' [label=<' + nodes[nodeIdx].node.name + '<BR/><FONT POINT-SIZE="8">' + nodes[nodeIdx].node.type + '</FONT>>]');
          }
        }

        ux.log('  // Paths');
        for (const edgeIdx in edges) {
          if (edgeIdx) {
            ux.log('  X' + edges[edgeIdx].from + '->X' + edges[edgeIdx].to);
          }
        }

        ux.log('}');
      }
    ).catch(function(error) {
        ux.error(error);
      }
    );
  }

  private collectFlags(): any {
    const orgId = this.org.getOrgId();
    const filter = this.flags.metadatacomponentnames;
    critera = this.flags.querycriteria;
    filtername = filter != null ? filter.split('.')[1] : null;
    filtertype = filter != null ? filter.split('.')[0] : null;
    return this.org.getConnection();
  }

}