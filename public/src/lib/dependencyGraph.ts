// TODO: Merge dependencyGraph and componentGraph
import { Connection } from '@salesforce/core';
import { AbstractGraph } from './abstractGraph';
import { FindAllDependencies } from './DFSLib';
import { ComponentNode, CustomField, CustomObject, Edge, FieldDefinition, MetadataComponentDependency, Node, QuickAction, ScalarNode, ValidationRule } from './NodeDefs';

export const componentsWithParents = ['CustomField', 'ValidationRule', 'QuickAction'];

export class DependencyGraph extends AbstractGraph {
  public edges: Set<Edge> = new Set<Edge>();

  private connection: Connection;
  private allComponentIds: string[];
  private allCustomObjectIds: string[];
  private customFields: CustomField[];
  private validationRules: ValidationRule[];
  private customObjects: CustomObject[];
  private customFieldDefinitions: FieldDefinition[];
  private quickActions: QuickAction[];

  private maxNumberOfIds = 10;

  constructor(conn: Connection) {
    super();
    this.connection = conn;

    this.connection.bulk.pollTimeout = 25000; // Bulk timeout can be specified globally on the connection object
  }

  public async init() {

    this.allComponentIds = await this.retrieveAllComponentIds();
    this.customFields = await this.retrieveCustomFields(this.allComponentIds, new Array<CustomField>());
    this.validationRules = await this.retrieveValidationRules(this.allComponentIds, new Array<ValidationRule>());
    this.quickActions = await this.retrieveQuickActions(this.allComponentIds, new Array<QuickAction>());
    this.allCustomObjectIds = await this.getObjectIds();
    this.customObjects = await this.retrieveCustomObjects(this.allCustomObjectIds, new Array<CustomObject>());

    const customFieldEntities = this.customFields.map(r => r.TableEnumOrId); // HKA
    this.customFieldDefinitions = await this.retrieveLookupRelationships(customFieldEntities, new Array<FieldDefinition>());
    // this.customFieldDefinitions = await this.bulkRetrieveLookupRelationships(customFieldEntities, new Array<FieldDefinition>());
    
    const lookupRelationships = this.customFieldDefinitions.filter(x => x.DataType.startsWith('Lookup'));
    lookupRelationships.forEach(element => {
      element.DataType = element.DataType.slice(element.DataType.indexOf('(') + 1, element.DataType.lastIndexOf(')'));
    });
  }

  public buildGraph(records: MetadataComponentDependency[]) {
    // Reset edges and nodes
    this.nodesMap = new Map<string, Node>();
    this.edges = new Set<Edge>();
    const parentRecords = this.getParentRecords();

    for (const record of records) {
      let parentName = '';
      let refParentName = '';

      if (record.RefMetadataComponentName.startsWith('0')) {
        continue;
      }

      if (componentsWithParents.indexOf(record.MetadataComponentType) >= 0) {
        parentName = parentRecords.get(record.MetadataComponentId) + '.';
      }

      if (componentsWithParents.indexOf(record.RefMetadataComponentType) >= 0) {
        refParentName = parentRecords.get(record.RefMetadataComponentId) + '.';
      }

      const srcId: string = record.MetadataComponentId;
      const srcName = record.MetadataComponentName;
      const srcType = record.MetadataComponentType;

      const dstId: string = record.RefMetadataComponentId;
      const dstName = record.RefMetadataComponentName;
      const dstType = record.RefMetadataComponentType;

      const srcDetails = new Map<string, object>();
      srcDetails.set('name', (srcName as String));
      srcDetails.set('type', (srcType as String));
      srcDetails.set('parent', (parentName as String))
      const srcNode: Node = this.getOrAddNode(srcId, srcDetails);

      const dstDetails = new Map<string, object>();
      dstDetails.set('name', (dstName as String));
      dstDetails.set('type', (dstType as String));
      dstDetails.set('parent', (refParentName as String))
      const dstNode: Node = this.getOrAddNode(dstId, dstDetails);

      this.edges.add({ from: record.MetadataComponentId, to: record.RefMetadataComponentId });
      this.addEdge(srcNode, dstNode);

      if (record.MetadataComponentType === 'AuraDefinition' && record.RefMetadataComponentType === 'AuraDefinitionBundle') {
        this.edges.add({ from: record.RefMetadataComponentId, to: record.MetadataComponentId }); // Also add reverse reference
        this.addEdge(dstNode, srcNode);
      }

    }
    this.addFieldRelationships();
  }

  public runDFS(initialNodes: Node[]) {
    const dfs = new FindAllDependencies(this);
    initialNodes.forEach(node => {
      const graphNode = this.getOrAddNode(node.name, node.details); // Grab node from this graph
      dfs.runNode(graphNode);
    });

    this.nodesMap = dfs.visited;
    this.edges = dfs.visitedEdges;

  }

  public getEdges(src: Node): IterableIterator<Node> {
    return (src as ScalarNode).getEdges();
  }

  public addFieldRelationships() {
    this.customFieldDefinitions.forEach(fielddef => {
      const n1 = this.getNodeShortId(fielddef.EntityDefinitionId);
      const objName = fielddef.DataType.slice(fielddef.DataType.indexOf('(') + 1, fielddef.DataType.lastIndexOf(')'));
      const n2: Node = this.getNodeFromName(objName);
      if (n1 != null && n2 != null) {
        this.addEdge(n1, n2);
      }
    });
  }

  /**
  * Render as DOT format
  */
  public toDotFormat(): string {

    // TODO Depending on the size of orgs, you may not want to
    // keep all this in memory. However, you don't want to do
    // console.log in library code, and this method really belongs
    // on the graph. Instead of using ux.log on every
    // line, just return a stream that you continue to write to,
    // then the command can call ux.log from the stream events.

    let dot = 'digraph graphname {\n';
    dot += '  rankdir=RL;\n';
    dot += '  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];\n';
    dot += '  // Nodes\n';

    for (const node of this.nodes) {
      dot += `  X${node.name} [label=<${node.details.get('parent')}${node.details.get('name')}<BR/><FONT POINT-SIZE="8">${node.details.get('type')}</FONT>>]\n`;
    }

    dot += '  // Paths\n';
    for (const edge of this.edges) {
      dot += `  X${edge.from}->X${edge.to}\n`;
    }

    dot += '}';
    return dot;
  }

  public toJson() {
    const jsonRepresentation = new Array<ComponentNode>();
    for (const node of this.nodes) {
      const jsonNode: ComponentNode = {
        id: node.name, name: (node.details.get('name') as String).valueOf(),
        type: (node.details.get('type') as String).valueOf(), parent: (node.details.get('parent') as String).valueOf()
      };
      jsonRepresentation.push(jsonNode);
    }

    return { nodes: jsonRepresentation, edges: Array.from(this.edges) };
  }

  public getParentRecords(): Map<string, string> {
    // Put all info into a Map
    const parentRecords = new Map();

    this.populateIdToDeveloperNameMap(parentRecords, this.validationRules, 'EntityDefinitionId');
    this.populateIdToDeveloperNameMap(parentRecords, this.customFields, 'TableEnumOrId');
    this.populateIdToDeveloperNameMap(parentRecords, this.quickActions, 'SobjectType');

    return parentRecords;
  }

  public async retrieveRecords<T>(query: string) {
    
    try {
      return (await this.connection.tooling.query<T>(query)).records;
    } catch (err) {
      console.error("dependencyGraph::retrieveRecords().err " + err.message);
      console.error("dependencyGraph::retrieveRecords().query " + query);
      return null;
    }
  }

  public async retrieveBulkRecords<T>(query: string) {
    return (await this.connection.bulk.query(query)
      .on('record', function (rec) {
        console.log(rec);
        return rec
      }))
      .on('error', function (err) {
        console.error(err);
      });
  }

  private splitIds(ids: string[], query: string, maxNumberOfIds = 0) {

    /* HKA: split potentially long lists of ids into sublists
    
    A SOQL query can only have 20K chars and a long list can potentially exceed that limit
    A SOQL query passed as URL parameter has to be limitted in size as well. Approximately 16K is the max URI length
    A few types of SOQL queries limit the number of attributes to be passed. OPTIONAL parameter.
    query.length = 58 (80 when URL encoded)
    id.length = 18 + 3 (23 when URL encoded)
    */
    const maxURIlength = 12000;
    const idNumChars = 23;

    if (maxNumberOfIds && ids.length > maxNumberOfIds) {
      var index = maxNumberOfIds;
    } else
      if (((ids.length * idNumChars) + query.length) > maxURIlength) {
        var index = Math.floor((maxURIlength - query.length) / idNumChars);
      } else {
        var index = ids.length;
      }

    // produce two sets of ids, the left array small enougth to run the query with
    // the right array containing the rest
    var allIds = {
      left: ids.splice(0, index),
      right: ids
    }

    // console.log(" query = " + query + " allIds.left.length = " + allIds.left.length + 
    // " allIds.right.length = " + allIds.right.length);

    return allIds;
  }

  public async retrieveCustomFields(ids: string[], resultset: CustomField[]): Promise<CustomField[]> {

    var query = `SELECT Id, TableEnumOrId FROM CustomField c WHERE c.Id In `;
    var splitIds = this.splitIds(ids, query, this.maxNumberOfIds);

    query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");

    // run the query
    resultset = resultset.concat(await this.retrieveRecords<CustomField>(query) || []);

    // recursive call to compute the next query
    if (splitIds.right.length > 0) {
      this.retrieveCustomFields(splitIds.right, resultset);
    }

    return resultset;
  }

  public async bulkRetrieveLookupRelationships(ids: string[], resultset: FieldDefinition[]): Promise<FieldDefinition[]> {

    var query = `SELECT EntityDefinitionId,DataType,DurableId FROM FieldDefinition c WHERE c.EntityDefinitionId In `;

    var splitIds = this.splitIds(ids, query, this.maxNumberOfIds);

    query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");

    // run the query
    resultset = resultset.concat(await this.retrieveBulkRecords<FieldDefinition>(query) || []);

    // recursive call to compute the next query
    if (splitIds.right.length > 0) {
      this.bulkRetrieveLookupRelationships(splitIds.right, resultset);
    }

    return resultset;
  }

  public async retrieveLookupRelationships(ids: string[], resultset: FieldDefinition[]): Promise<FieldDefinition[]> {

    var query = `SELECT EntityDefinitionId,DataType,DurableId FROM FieldDefinition c WHERE c.EntityDefinitionId In `;

    var splitIds = this.splitIds(ids, query, this.maxNumberOfIds);

    query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");

    // run the query
    resultset = resultset.concat(await this.retrieveRecords<FieldDefinition>(query) || []);

    // recursive call to compute the next query
    if (splitIds.right.length > 0) {
      this.retrieveLookupRelationships(splitIds.right, resultset);
    }

    return resultset;
  }

  public async retrieveValidationRules(ids: string[], resultset: ValidationRule[]): Promise<ValidationRule[]> {

    var query = `SELECT Id, EntityDefinitionId FROM ValidationRule c WHERE c.Id In `;

    var splitIds = this.splitIds(ids, query, this.maxNumberOfIds);

    query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");

    // run the query
    resultset = resultset.concat(await this.retrieveRecords<FieldDefinition>(query) || []);

    // recursive call to compute the next query
    if (splitIds.right.length > 0) {
      this.retrieveValidationRules(splitIds.right, resultset);
    }

    return await this.retrieveRecords<ValidationRule>(query);
  }

  public async retrieveQuickActions(ids: string[], resultset: QuickAction[]): Promise<QuickAction[]> {

    var query = `SELECT Id, SobjectType FROM QuickActionDefinition c WHERE c.Id In `;

    var splitIds = this.splitIds(ids, query, this.maxNumberOfIds);

    query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");

    // run the query
    resultset = resultset.concat(await this.retrieveRecords<QuickAction>(query) || []);

    // recursive call to compute the next query
    if (splitIds.right.length > 0) {
      this.retrieveQuickActions(splitIds.right, resultset);
    }

    return await this.retrieveRecords<QuickAction>(query);
  }

  public async retrieveCustomObjects(ids: string[], resultset: CustomObject[]): Promise<CustomObject[]> {
    var query = `SELECT Id, DeveloperName FROM CustomObject c WHERE c.Id In `;

    var splitIds = this.splitIds(ids, query, this.maxNumberOfIds);

    query = query.concat(this.arrayToInIdString(splitIds.left)).concat(" limit 2000");

    // run the query
    resultset = resultset.concat(await this.retrieveRecords<CustomObject>(query) || []);

    // recursive call to compute the next query
    if (splitIds.right.length > 0) {
      this.retrieveCustomObjects(splitIds.right, resultset);
    }

    return await this.retrieveRecords<CustomObject>(query);
  }

  public getLookupRelationships(): FieldDefinition[] {
    return this.customFieldDefinitions;
  }

  private async retrieveAllComponentIds(): Promise<string[]> {
    const query = "SELECT MetadataComponentId,RefMetadataComponentId FROM MetadataComponentDependency \
    WHERE (MetadataComponentType = 'CustomField' OR RefMetadataComponentType = 'CustomField') \
    OR (MetadataComponentType = 'ValidationRule' OR RefMetadataComponentType = 'ValidationRule') \
    OR (MetadataComponentType = 'QuickAction' OR RefMetadataComponentType = 'QuickAction')";

    // Get all Custom Field Ids in MetadataComponent and RefMetadata Component
    const customComponentIds = await this.retrieveRecords<MetadataComponentDependency>(query);

    const componentIds = customComponentIds.map(r => r.MetadataComponentId);
    const refComponentIds = customComponentIds.map(r => r.RefMetadataComponentId);

    // Concat both lists of ids
    let ids = componentIds.concat(refComponentIds);
    // Remove duplicates
    ids = Array.from(new Set(ids));

    return ids;
  }

  private getObjectIds() {

    // Filter Ids that start with 0
    const fieldObjectIdRecords = this.customFields.filter(x => {if (x != null) x.TableEnumOrId.startsWith('0')}); // HKA
    // Filter Ids that start with 0 from vrule
    const vruleObjectIdRecords = this.validationRules.filter(x => {if (x != null) x.EntityDefinitionId.startsWith('0')}); // HKA

    return [
      ...fieldObjectIdRecords.map(r => r.TableEnumOrId),
      ...vruleObjectIdRecords.map(r => r.EntityDefinitionId)
    ];
  }

  private populateIdToDeveloperNameMap<T>(map: Map<string, string>, records: T[], fieldName: string): void {
    for (const record of records) {
      let val = record[fieldName];
      if (val.startsWith('0')) {
        // Grab the custom object the field points to
        const customObject = this.customObjects.filter(x => {if (x != null) x.Id.startsWith(val)});
        val = customObject[0].DeveloperName + '__c';
      }
      map.set(record['Id'], val);
    }
  }

  private arrayToInIdString(ids) {
    return `('${ids.join('\',\'')}')`;
  }
}
