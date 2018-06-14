import { expect } from 'chai';
import { stub } from 'sinon';
import { DependencyGraph, MetadataComponentDependency } from '../../src/lib/dependencyGraph';

describe('dependency graph', () => {
  let graph: DependencyGraph;

  // Can define here if you want to use them in multiple tests
  // TODO you probably want to make this more meaningful
  const records: MetadataComponentDependency[] = [{
    MetadataComponentId: 'blah',
    MetadataComponentName: 'blah',
    MetadataComponentType: 'blah',
    RefMetadataComponentId: 'blah',
    RefMetadataComponentName: 'blah',
    RefMetadataComponentType: 'blah'
  }];

  beforeEach(() => {
    // Don't use a connection, just mock methods
    graph = new DependencyGraph(null);

    // Don't try to call out to tooling
    stub(graph, 'retrieveRecords').returns(Promise.resolve([]));
  });

  // TODO you could have one of these for each public method in dependency graph.
  // If you want to test some of the private methods, just make them public, otherwise
  // they should be covered from the public method tests.
  describe('init', () => {
    it('populates nodes and edges for one record', async () => {
      await graph.init(records);

      expect(graph.nodes.length).to.equal(1);
      expect(graph.edges.length).to.equal(1);
    });
  });
});
