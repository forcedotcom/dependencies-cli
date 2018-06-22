// TODO: Merge dependencyGraph and componentGraph
import { Tooling } from 'jsforce';

export type DGNode = {
  parent: string;
  name: string;
  type: string;
};

export type DGEdge = {
  from: string;
  to: string;
};

export interface Record {
  Id?: string;
}

export interface MetadataComponentDependency extends Record {
  MetadataComponentId: string;
  MetadataComponentName: string;
  MetadataComponentType: string;
  RefMetadataComponentId: string;
  RefMetadataComponentName: string;
  RefMetadataComponentType: string;
}

export interface CustomField extends Record {
  TableEnumOrId: string;
}

export interface ValidationRule extends Record {
  EntityDefinitionId: string;
}

export interface CustomObject extends Record {
  DeveloperName: string;
}

export class DependencyGraph {
  public nodes: Array<{ id: string, node: DGNode }> = [];
  public edges: DGEdge[] = [];

  private allComponentIds: string[];
  private customFields: CustomField[];
  private validationRules: ValidationRule[];
  private customObjects: CustomObject[];

  constructor(private tooling: Tooling) { }

  public async init(records: MetadataComponentDependency[]) {
    this.allComponentIds = await this.retrieveAllComponentIds();
    this.customFields = await this.retrieveCustomFields(this.allComponentIds);
    this.validationRules = await this.retrieveValidationRules(this.allComponentIds);
    this.customObjects = await this.retrieveCustomObjects(this.getObjectIds());

    const parentRecords = this.getParentRecords();
    const nodesMap = new Map();

    for (const record of records) {
      let parentName = '';
      let refParentName = '';

      if (record.RefMetadataComponentName.startsWith('0')) {
        continue;
      }
      if (record.MetadataComponentType === 'CustomField' || record.MetadataComponentType === 'ValidationRule') {
        parentName = parentRecords.get(record.MetadataComponentId) + '.';
      }

      if (record.RefMetadataComponentType === 'CustomField' || record.RefMetadataComponentType === 'ValidationRule') {
        refParentName = parentRecords.get(record.RefMetadataComponentId) + '.';
      }

      nodesMap.set(record.MetadataComponentId, { parent: parentName, name: record.MetadataComponentName, type: record.MetadataComponentType });
      nodesMap.set(record.RefMetadataComponentId, { parent: refParentName, name: record.RefMetadataComponentName, type: record.RefMetadataComponentType });
      this.edges.push({ from: record.MetadataComponentId, to: record.RefMetadataComponentId });

    }
    for (const [key, value] of nodesMap) {
      this.nodes.push({ id: key, node: value });
    }
  }

  public async initWithFilter(records: MetadataComponentDependency[], idSet: Set<String>) {
    this.allComponentIds = await this.retrieveAllComponentIds();
    this.customFields = await this.retrieveCustomFields(this.allComponentIds);
    this.validationRules = await this.retrieveValidationRules(this.allComponentIds);
    this.customObjects = await this.retrieveCustomObjects(this.getObjectIds());

    const parentRecords = this.getParentRecords();
    const nodesMap = new Map();

    for (const record of records) {
      let parentName = '';
      let refParentName = '';

      if (!idSet.has(record.MetadataComponentId)) {
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

      nodesMap.set(record.MetadataComponentId, { parent: parentName, name: record.MetadataComponentName, type: record.MetadataComponentType });
      nodesMap.set(record.RefMetadataComponentId, { parent: refParentName, name: record.RefMetadataComponentName, type: record.RefMetadataComponentType });
      this.edges.push({ from: record.MetadataComponentId, to: record.RefMetadataComponentId });

    }
    for (const [key, value] of nodesMap) {
      this.nodes.push({ id: key, node: value });
    }
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
    dot += '  // DGNodes\n';

    for (const node of this.nodes) {
      dot += `  X${node.id} [label=<${node.node.parent}${node.node.name}<BR/><FONT POINT-SIZE="8">${node.node.type}</FONT>>]\n`;
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

  public async retrieveValidationRules(ids: string[]): Promise<ValidationRule[]> {
    const query = `SELECT Id, EntityDefinitionId FROM ValidationRule c WHERE c.Id In ${this.arrayToInIdString(ids)}`;
    return await this.retrieveRecords<ValidationRule>(query);
  }

  public async retrieveCustomObjects(ids: string[]): Promise<CustomObject[]> {
    const query = `SELECT Id, DeveloperName FROM CustomObject c WHERE c.Id In ${this.arrayToInIdString(this.getObjectIds())}`;
    return await this.retrieveRecords<CustomObject>(query);
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
