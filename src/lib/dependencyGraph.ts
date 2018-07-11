// TODO: Merge dependencyGraph and componentGraph
import { Tooling } from 'jsforce';
import {Node, NodeImpl, Edge, ScalarNode, CustomField, ValidationRule, CustomObject, FieldDefinition, MetadataComponentDependency} from './NodeDefs';

export class DependencyGraph {
  public nodesMap: Map<string, Node> = new Map<string, Node>();
  public edges: Edge[] = [];

  private allComponentIds: string[];
  private customFields: CustomField[];
  private validationRules: ValidationRule[];
  private customObjects: CustomObject[];
  private customFieldDefinitions: FieldDefinition[];

  constructor(private tooling: Tooling) { }

  public get nodes() {
      return this.nodesMap.values();
  }

  public async init() {
    this.allComponentIds = await this.retrieveAllComponentIds();
    this.customFields = await this.retrieveCustomFields(this.allComponentIds);
    this.validationRules = await this.retrieveValidationRules(this.allComponentIds);
    this.customObjects = await this.retrieveCustomObjects(this.getObjectIds());
    const customFieldEntities = this.customFields.map(r => r.TableEnumOrId);
    this.customFieldDefinitions = await this.retrieveLookupRelationships(customFieldEntities);
    const lookupRelationships = this.customFieldDefinitions.filter(x => x.DataType.startsWith('Lookup'));
    lookupRelationships.forEach(element => {
      element.DataType = element.DataType.slice(element.DataType.indexOf('(') + 1, element.DataType.lastIndexOf(')'));
    });
  }

  public buildGraph(records: MetadataComponentDependency[], idSetFilter: Set<String> = null) {

    const parentRecords = this.getParentRecords();

    for (const record of records) {
      let parentName = '';
      let refParentName = '';

      if (idSetFilter && !idSetFilter.has(record.MetadataComponentId)) {
        continue;
      }

      if (record.RefMetadataComponentName.startsWith('0')) {
        continue;
      }
      if (record.MetadataComponentType === 'CustomField' || record.MetadataComponentType === 'ValidationRule') {
        parentName = parentRecords.get(record.MetadataComponentId) + '.';
      }

      if (record.RefMetadataComponentType === 'CustomField' || record.RefMetadataComponentType === 'ValidationRule') {
        refParentName = parentRecords.get(record.RefMetadataComponentId) + '.';
      }

      const srcId: string = record.MetadataComponentId;
      const srcName = record.MetadataComponentName;
      const srcType = record.MetadataComponentType;

      const dstId: string = record.RefMetadataComponentId;
      const dstName = record.RefMetadataComponentName
      const dstType = record.RefMetadataComponentType;

      const srcDetails = new Map<string, object>();
      srcDetails.set('name', (srcName as String));
      srcDetails.set('type', (srcType as String));
      srcDetails.set('parent', (parentName as String))
      const srcNode: Node = this.getOrAddNode(srcId, srcDetails);

      const dstDetails = new Map<string, object>();
      dstDetails.set('name', (dstName as String));
      dstDetails.set('type', (dstType as String));
      srcDetails.set('parent', (refParentName as String))
      const dstNode: Node = this.getOrAddNode(dstId, dstDetails);

      this.edges.push({ from: record.MetadataComponentId, to: record.RefMetadataComponentId });
      this.addEdge(srcNode, dstNode);

    }
  }

  public getOrAddNode(name: string, details: Map<string, object>): Node {
    let n: Node = this.nodesMap.get(name);
    if (n) {
        return n;   
    }

    n = new ScalarNode(name, details);
    this.nodesMap.set(name, n);
    return n;
}

public addEdge(src: Node, dst: Node): void {
    (src as NodeImpl).addEdge(dst);
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
    return { nodes: this.nodes, edges: this.edges };
  }

  public getParentRecords(): Map<string, string> {
    // Put all info into a Map
    const parentRecords = new Map();

    this.populateIdToDeveloperNameMap(parentRecords, this.validationRules, 'EntityDefinitionId');
    this.populateIdToDeveloperNameMap(parentRecords, this.customFields, 'TableEnumOrId');

    return parentRecords;
  }

  public async retrieveRecords<T>(query: string) {
    return (await this.tooling.query<T>(query)).records;
  }

  public async retrieveCustomFields(ids: string[]): Promise<CustomField[]> {
    const query = `SELECT Id, TableEnumOrId FROM CustomField c WHERE c.Id In ${this.arrayToInIdString(ids)}`;
    return await this.retrieveRecords<CustomField>(query);
  }

  public async retrieveLookupRelationships(ids: string[]): Promise<FieldDefinition[]> {
    const query = `SELECT EntityDefinitionId,DataType,DurableId FROM FieldDefinition c WHERE c.EntityDefinitionId In ${this.arrayToInIdString(ids)}`;
    return await this.retrieveRecords<FieldDefinition>(query);
  }

  public async retrieveValidationRules(ids: string[]): Promise<ValidationRule[]> {
    const query = `SELECT Id, EntityDefinitionId FROM ValidationRule c WHERE c.Id In ${this.arrayToInIdString(ids)}`;
    return await this.retrieveRecords<ValidationRule>(query);
  }

  public async retrieveCustomObjects(ids: string[]): Promise<CustomObject[]> {
    const query = `SELECT Id, DeveloperName FROM CustomObject c WHERE c.Id In ${this.arrayToInIdString(this.getObjectIds())}`;
    return await this.retrieveRecords<CustomObject>(query);
  }

  public getLookupRelationships(): FieldDefinition[] {
    return this.customFieldDefinitions;
  }

  private async retrieveAllComponentIds(): Promise<string[]> {
    const query = "SELECT MetadataComponentId,RefMetadataComponentId FROM MetadataComponentDependency WHERE (MetadataComponentType = 'CustomField' OR RefMetadataComponentType = 'CustomField') OR (MetadataComponentType = 'ValidationRule' OR RefMetadataComponentType = 'ValidationRule')";

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
    const fieldObjectIdRecords = this.customFields.filter(x => x.TableEnumOrId.startsWith('0'));
    // Filter Ids that start with 0 from vrule
    const vruleObjectIdRecords = this.validationRules.filter(x => x.EntityDefinitionId.startsWith('0'));

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
        const customObject = this.customObjects.filter(x => x.Id.startsWith(val));
        val = customObject[0].DeveloperName;
      }
      map.set(record['Id'], val);
    }
  }

  private arrayToInIdString(ids) {
    return `('${ids.join('\',\'')}')`;
  }
}
