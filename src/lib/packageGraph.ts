/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// TODO: Merge dependencyGraph and componentGraph
import { Connection } from '@salesforce/core';
import { AbstractGraph } from './abstractGraph';
import { FindAllDependencies } from './DFSLib';
import { Package, PackageNode, PackageDependency, SubscriberPackageVersion } from './PackageDefs';
import { Edge, Node, ScalarNode } from './NodeDefs';
import { isNull, isUndefined } from 'util';
import { Graph } from 'graphology';


export class PackageGraph extends AbstractGraph {
  public edges: Set<Edge> = new Set<Edge>();

  private connection: Connection;
  private subscriberPackages: Package[];
  private packageDependencies: PackageDependency[];

  constructor(conn: Connection, subscriberPacks: Package[]) {
    super();
    this.connection = conn;
    this.subscriberPackages = subscriberPacks;

    this.connection.bulk.pollTimeout = 25000; // Bulk timeout can be specified globally on the connection object
  }

  public async init() {
    this.packageDependencies = await this.retrieveDependencies(this.subscriberPackages, new Array<SubscriberPackageVersion>());
  }

  public async buildGraph() {
    // Reset edges and nodes
    this.nodesMap = new Map<string, Node>();
    this.edges = new Set<Edge>();

    // Iterate all nodes found in the list of subscriber packages
    if (!isNull(this.subscriberPackages)) {
      for (const subscriberPackage of this.subscriberPackages) {

        var srcNode: Node;

        const srcId: string = subscriberPackage.Id;
        const srcPath: string = subscriberPackage.Path;
        const srcName = subscriberPackage.Name;
        const srcNamespace: string = subscriberPackage.Namespace;
        const srcVersionId = subscriberPackage.VersionId;
        const srcVersionName = subscriberPackage.VersionName;
        const srcVersionNumber = subscriberPackage.VersionNumber;

        const srcDetails = new Map<string, object>();
        srcDetails.set('id', (srcId as String));
        srcDetails.set('name', isNull(srcName) ? "" : (srcName as String));
        srcDetails.set('path',  isNull(srcPath) ? "": (srcPath as String));
        srcDetails.set('namespace',  isNull(srcNamespace) ? "" : (srcNamespace as String));
        srcDetails.set('versionId',  isNull(srcVersionId) ? "" : (srcVersionId as String));
        srcDetails.set('versionName',  isNull(srcVersionName) ? "" : (srcVersionName as String));
        srcDetails.set('versionNumber',  isNull(srcVersionNumber) ? "" : (srcVersionNumber as String));
        srcNode = this.getOrAddNode(srcId, srcDetails);

        // check if the package has any package dependencies
        if (!isNull(this.packageDependencies)) {
          for (const record of this.packageDependencies) {
            if ((record.Source.Id == subscriberPackage.Id) && (!isUndefined(record.Target))) {

              var dstNode: Node;

              const dstId: string = record.Target.Id;
              const dstPath: string = record.Target.Path;
              const dstName: string = record.Target.Name;
              const dstNamespace: string = record.Target.Namespace;
              const dstVersionId: string = record.Target.VersionId;
              const dstVersionName: string = record.Target.VersionName;
              const dstVersionNumber: string = record.Target.VersionNumber;

              const dstDetails = new Map<string, object>();
              dstDetails.set('id', (dstId as String));
              dstDetails.set('name', isNull(dstName) ? "" : (dstName as String));
              dstDetails.set('path',  isNull(dstPath) ? "": (dstPath as String));
              dstDetails.set('namespace',  isNull(dstNamespace) ? "" : (dstNamespace as String));
              dstDetails.set('versionId',  isNull(dstVersionId) ? "" : (dstVersionId as String));
              dstDetails.set('versionName',  isNull(dstVersionName) ? "" : (dstVersionName as String));
              dstDetails.set('versionNumber',  isNull(dstVersionNumber) ? "" : (dstVersionNumber as String));
              dstNode = this.getOrAddNode(dstId, dstDetails);

              if (!isUndefined(record.Source) && !isUndefined(record.Target)) {
                this.edges.add({ from: record.Source.Id, to: record.Target.Id });
                this.addEdge(srcNode, dstNode);
              }

            }
          }
        }
      }
      this.addPackageRelationships();
    }
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

      if (!isUndefined(packagedef.Source) && !isUndefined(packagedef.Target)) {
        const n1 = this.getNodeVersionId(packagedef.Source.VersionId);
        const n2: Node = this.getNodeVersionId(packagedef.Target.VersionId);
        if (n1 != null && n2 != null) {
          this.addEdge(n1, n2);
        }
      }
    });
  }

  protected getNodeVersionId(versionId: string): Node {

    if (isNull(versionId)) return null;

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
      dot += `  X${node.details.get('versionId')} [label=<${node.details.get('name')} ${node.details.get('versionNumber')}`;
      dot += `<BR/><FONT POINT-SIZE="8">${node.details.get('id')}</FONT>`;
      dot += `<BR/><FONT POINT-SIZE="8">${node.details.get('versionId')}</FONT>>]\n`;
    }

    dot += '  // Paths\n';
    for (const edge of this.edges) {
      dot += `  X${edge.from}->X${edge.to}\n`;
    }

    dot += '}';
    return dot;
  }
  /**
   * Render as JSON format
   */
  public toJson() {
    const jsonRepresentation = new Array<PackageNode>();
    for (const node of this.nodes) {

      const jsonNode: PackageNode = {
        id: (node.details.get('id') as String).toString(),
        name: (node.details.get('name') as String).toString(),
        path: (node.details.get('path') as String).toString(),
        namespace: (node.details.get('namespace') as String).toString(),
        versionId: (node.details.get('versionId') as String).toString(),
        versionName: (node.details.get('versionName') as String).toString(),
        versionNumber: (node.details.get('versionNumber') as String).toString(),

        // this is a bit of an artificial use of "type" but looks better in the graph
        // than just a generic _package_ type
        type: "v" + (node.details.get('versionNumber') as String).replace(/\./g,'_').toString()
        // type: "package"
      }
      jsonRepresentation.push(jsonNode);
    }

    return { nodes: jsonRepresentation, edges: Array.from(this.edges) };
  }

  /**
 * Render as GEXF format
 */
  public toGexfFormat() {
    const graph = new Graph();
    for (const node of this.nodes) {
      graph.addNode(node.details.get('versionId'));

      for (let [k, v] of node.details) {
        graph.setNodeAttribute(node.details.get('versionId'), k, v);
      }
    }

    for (const edge of this.edges) {
      graph.addEdge(edge.from, edge.to);
    }

    // return gexf.write(graph);
  }


  public async retrieveRecords<T>(query: string) {
    return (await this.connection.tooling.query<T>(query)).records;
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


  private async retrieveDependencies(packages: Package[], resultset: SubscriberPackageVersion[]): Promise<PackageDependency[]> {

    var queryString = 'SELECT Dependencies FROM SubscriberPackageVersion WHERE Id=';

    let dependencies: PackageDependency[] = [];

    for (const _package of packages) {

      // run the query
      let resultset = (await this.retrieveRecords<SubscriberPackageVersion>(queryString.concat(`\'${_package.VersionId}\'`)));

      for (const _elem of resultset) {
        if (!isNull(_elem.Dependencies)) {

          for (const _id of _elem.Dependencies['ids']) {

            // TODO: This code assumes that a dependency is always an installed package 
            // (with a matching version id). Expand this to include packages that are not installed.
            const _dependency: PackageDependency = {
              Source: _package,
              Target: packages.find(Target => Target.VersionId == _id.subscriberPackageVersionId)
            }

            dependencies.push(_dependency);
          }
        }
      }
    };

    return dependencies;
  };
}
