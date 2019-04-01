// TODO: Merge dependencyGraph and componentGraph
import { Tooling, Connection, DeployResultLocator } from 'jsforce';
import { AbstractGraph } from './abstractGraph';
import { FindAllDependencies } from './DFSLib';
import { Package, PackageNode, PackageDependency, SubscriberPackageVersion } from './PackageDefs';
import { Edge, Node, ScalarNode } from './NodeDefs';
import { isNull } from 'util';
import { resolve } from 'url';


export class PackageGraph extends AbstractGraph {
  public edges: Set<Edge> = new Set<Edge>();

  private tooling: Tooling;
  private connection: Connection;
  private subscriberPackages: Package[];
  private packageDependencies: PackageDependency[];

  constructor(tool: Tooling, conn: Connection, subscriberPacks: Package[]) {
    super();
    this.tooling = tool;
    this.connection = conn;
    this.subscriberPackages = subscriberPacks;

    this.connection.bulk.pollTimeout = 25000; // Bulk timeout can be specified globally on the connection object
  }

  public async init() {
    this.packageDependencies = await this.retrieveDependencies(this.subscriberPackages, new Array<SubscriberPackageVersion>());
  }

  public buildGraph() {
    // Reset edges and nodes
    this.nodesMap = new Map<string, Node>();
    this.edges = new Set<Edge>();

    for (const record of this.packageDependencies) {
      record.Source.Id;
      const srcId: string = record.Source.Id;;
      const srcPath: string = record.Source.Path;
      const srcName = record.Source.Name;
      const srcNamespace: string = record.Source.Namespace;
      const srcVersionId = record.Source.VersionId;
      const srcVersionName = record.Source.VersionName;
      const srcVersionNumber = record.Source.VersionNumber;

      const dstId: string = record.Target.Id;
      const dstPath: string = record.Target.Path;
      const dstName: string = record.Target.Name;
      const dstNamespace: string = record.Target.Namespace;
      const dstVersionId: string = record.Target.VersionId;
      const dstVersionName: string = record.Target.VersionName;
      const dstVersionNumber: string = record.Target.VersionNumber;

      const srcDetails = new Map<string, object>();
      srcDetails.set('id', (srcId as String));
      srcDetails.set('name', (srcName as String));
      srcDetails.set('path', (srcPath as String));
      srcDetails.set('namespace', (srcNamespace as String));
      srcDetails.set('versionId', (srcVersionId as String));
      srcDetails.set('versionName', (srcVersionName as String));
      srcDetails.set('versionNumber', (srcVersionNumber as String));
      const srcNode: Node = this.getOrAddNode(srcId, srcDetails);

      const dstDetails = new Map<string, object>();
      dstDetails.set('id', (dstId as String));
      dstDetails.set('name', (dstName as String));
      dstDetails.set('path', (dstPath as String));
      dstDetails.set('namespace', (dstNamespace as String));
      dstDetails.set('versionId', (dstVersionId as String));
      dstDetails.set('versionName', (dstVersionName as String));
      dstDetails.set('versionNumber', (dstVersionNumber as String));
      const dstNode: Node = this.getOrAddNode(dstId, dstDetails);

      this.edges.add({ from: record.Source.VersionId, to: record.Target.VersionId });
      this.addEdge(srcNode, dstNode);
    }
    this.addPackageRelationships();
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

  public addPackageRelationships() {
    this.packageDependencies.forEach(packagedef => {
      const n1 = this.getNodeVersionId(packagedef.Source.VersionId);
      const n2: Node = this.getNodeVersionId(packagedef.Target.VersionId);
      if (n1 != null && n2 != null) {
        this.addEdge(n1, n2);
      }
    });
  }

  protected getNodeVersionId(versionId: string): Node {
    let found: Node;
    Array.from(this.nodes).forEach(node => {
      if ((node.details.get('versionId') as String) == versionId) {
        found = node; // Returning node here does not work and I don't know why
      }
    });
    return found;
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
    const jsonRepresentation = new Array<PackageNode>();
    for (const node of this.nodes) {
      const jsonNode: PackageNode = {
        id: node.name, name: (node.details.get('name') as String).valueOf(),
        versionId: (node.details.get('versionId') as String).valueOf(),
        version: (node.details.get('versionNumber') as String).valueOf()
      };
      jsonRepresentation.push(jsonNode);
    }

    return { nodes: jsonRepresentation, edges: Array.from(this.edges) };
  }

  public async retrieveRecords<T>(query: string) {
    return (await this.tooling.query<T>(query)).records;
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


  private async retrieveDependencies(ids: Package[], resultset: SubscriberPackageVersion[]): Promise<PackageDependency[]> {

    return new Promise((resolve, reject) => {
      const result: PackageDependency[] = [];

      var queryString = 'SELECT Dependencies FROM SubscriberPackageVersion WHERE Id=';

      ids.forEach(async _package => {

        // run the query
        await this.retrieveRecords<SubscriberPackageVersion>(queryString.concat(`\'${_package.VersionId}\'`)).then((resultset) => {

          for (const _elem of resultset) {
            if (!isNull(_elem.Dependencies)) {

              for (const _id of _elem.Dependencies.ids) {

                // TODO: This code assumes that a dependency is always an installed package 
                // (with a matching version id). Expand this to include packages that are not installed.
                const _dependency: PackageDependency = {
                  Source: _package,
                  Target: ids.find(Target => Target.VersionId == _id.subscriberPackageVersionId)
                }

                result.push(_dependency);
              }
            }
          }
          resolve(result);
        }).catch((error) => {
          console.log(error);
          reject(error);
        });
      });
    });
  }
}
