import {join} from 'path';
import {core, flags, SfdxCommand} from '@salesforce/command';
import { listenerCount } from 'cluster';

core.Messages.importMessagesDirectory(join(__dirname, '..', '..', '..'));

let critera: string;
let filtername: string;
let filtertype: string;

const fullSOQL = `
SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency`;
const criteriaSOQL = `
SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency Where ${critera}`;
const filterSOQL = `
SELECT  MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency WHERE RefMetadataComponentName = '${filtername}' AND RefMetadataComponentType = '${filtertype}' AND (NOT MetadataComponentName LIKE '%Test')`;
const fieldObjectSOQL = `SELECT Id,TableEnumOrId FROM CustomField c WHERE c.Id In `;
const vruleObjectSOQL = `SELECT Id,EntityDefinitionId FROM ValidationRule c WHERE c.Id In `;
const customObjectParentSOQL = `SELECT Id,DeveloperName FROM CustomObject c WHERE c.Id In `;
const customComponentsSOQL = `SELECT MetadataComponentId,RefMetadataComponentId FROM MetadataComponentDependency WHERE (MetadataComponentType = 'CustomField' OR RefMetadataComponentType = 'CustomField') OR (MetadataComponentType = 'ValidationRule' OR RefMetadataComponentType = 'ValidationRule')`;
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
    name:                   flags.string({char: 'n', description: 'name'}),
    force:                  flags.boolean({char: 'f', description: 'force'}),
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
9960590757574390
  public async run(): Promise<any> {
    
    this.collectFlags();

    const conn: any = this.org.getConnection();
    conn.version = '43.0';

    //Get all Custom Field Ids in MetadataComponent and RefMetadata Component
    const customComponentIds = await conn.tooling.query(customComponentsSOQL);

    let ids = customComponentIds.records.map(r => r.MetadataComponentId);
    let idsRef = customComponentIds.records.map(r => r.RefMetadataComponentId);

    //Concat both lists of ids
    var idsTotal = ids.concat(idsRef);
    var idSet = new Set(idsTotal); //remove duplicates
    idsTotal = Array.from(idSet);

    //Find object for Custom Fields by using TableEnumOrId class on list of ids
    const fieldObjects = await conn.tooling.query(fieldObjectSOQL + `('${idsTotal.join('\',\'')}')`);
    const fieldObjectRecords = fieldObjects.records;

    //Find object for ValidationRules using same method
    const vruleObjects = await conn.tooling.query(vruleObjectSOQL + `('${idsTotal.join('\',\'')}')`);
    const vruleObjectRecords = vruleObjects.records;


    //Filter Ids that start with 0
    let fieldObjectIdRecords = fieldObjectRecords.filter(x => x.TableEnumOrId.startsWith('0'));
    let customObjectIds = fieldObjectIdRecords.map(r => r.TableEnumOrId);

    //Filter Ids that start with 0 from vrule
    let vruleObjectIdRecords = vruleObjectRecords.filter(x => x.EntityDefinitionId.startsWith('0'));
    //Add to list
    customObjectIds = customObjectIds.concat(vruleObjectIdRecords.map(r => r.EntityDefinitionId));
    
    //Another query to get Custom Object Names from Id
    const customObjects = await conn.tooling.query(customObjectParentSOQL + `('${customObjectIds.join('\',\'')}')`);
    const customObjectRecords = customObjects.records;

    //Put all info into   a Map
    let parentRecords = new Map();

    for (const recordIdx in fieldObjectRecords) {
      let parentRecord = fieldObjectRecords[recordIdx];
      let val = parentRecord.TableEnumOrId;
      if (val.startsWith('0')) {
        //Custom Object
        let customObject= customObjectRecords.filter(x => x.Id.startsWith(val));
        val = customObject[0].DeveloperName;
      }
      parentRecords.set(parentRecord.Id, val);
    }

    for (const recordIdx in vruleObjectRecords) {
      let parentRecord = vruleObjectRecords[recordIdx];
      let val = parentRecord.EntityDefinitionId;
      if (val.startsWith('0')) {
        //Custom Object
        let customObject= customObjectRecords.filter(x => x.Id.startsWith(val));
        val = customObject[0].DeveloperName;
      }
      parentRecords.set(parentRecord.Id, val);
    }

    
    var ux = this.ux;

    try {
      const res = await conn.tooling.query(
          critera != null ? 
          criteriaSOQL : // Criteria?
          filtername != null && filtertype != null ?
          filterSOQL : // Ref filter?
          fullSOQL // Full org
          );   
      const nodesMap = new Map();
      const nodes = [];
      const edges = [];
      for (const recordIdx in res.records) {
        let parentName = '';
        let refParentName = '';
        if (recordIdx) {
          const record = res.records[recordIdx];
          if(record.RefMetadataComponentName.startsWith('0')) {
            continue;
          }
          if (record.MetadataComponentType == "CustomField" || record.MetadataComponentType == "ValidationRule") {
            parentName = parentRecords.get(record.MetadataComponentId) + ".";
          }

          if (record.RefMetadataComponentType == "CustomField" || record.RefMetadataComponentType == "ValidationRule") {
            refParentName = parentRecords.get(record.RefMetadataComponentId) + ".";
          }
          nodesMap.set(record.MetadataComponentId, { parent: parentName, name: record.MetadataComponentName, type: record.MetadataComponentType });
          nodesMap.set(record.RefMetadataComponentId, { parent: refParentName, name: record.RefMetadataComponentName, type: record.RefMetadataComponentType });
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
          ux.log('  X' + nodes[nodeIdx].id + ' [label=<' + nodes[nodeIdx].node.parent + nodes[nodeIdx].node.name + '<BR/><FONT POINT-SIZE="8">' + nodes[nodeIdx].node.type + '</FONT>>]');
        }
      }

      ux.log('  // Paths');
      for (const edgeIdx in edges) {
        if (edgeIdx) {
          ux.log('  X' + edges[edgeIdx].from + '->X' + edges[edgeIdx].to);
        }
      }

      ux.log('}');                     
    } catch (error) {
      ux.error(error);
    }


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