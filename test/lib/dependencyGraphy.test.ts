import { expect } from 'chai';
import { stub } from 'sinon';
import { DependencyGraph, MetadataComponentDependency } from '../../src/lib/dependencyGraph';


export const oneObjectRecords: MetadataComponentDependency[] = [{
  MetadataComponentId: '1',
  MetadataComponentName: 'Object1',
  MetadataComponentType: 'Object',
  RefMetadataComponentId: '1',
  RefMetadataComponentName: 'Object1',
  RefMetadataComponentType: 'Object'
}];

export const dotOutput1 = 
` // Nodes
  X1 [label=<Object1<BR/><FONT POINT-SIZE="8">Object</FONT>>]
  // Paths
  X1->X1
}`;

  //Test Both Custom and Standard Objects
  export const customFieldRecords = [
    {Id: '1', TableEnumOrId: 'ObjectA'},
    {Id: '3', TableEnumOrId: '0CustomObject'}
  ];

  export const validationRuleRecords = [
    {Id: '2', EntityDefinitionId: 'ObjectA'}
  ]

  export const customObjects = [
    {Id: '0CustomObject', DeveloperName: 'CustomObjectA'}
  ];

  // 3 objects, CustomField2 -> CustomField 1 -> ValidationRule 1
export const TwoFields1VRRecords: MetadataComponentDependency[] = [{
    MetadataComponentId: '1',
    MetadataComponentName: 'CustomField1',
    MetadataComponentType: 'CustomField',
    RefMetadataComponentId: '2',
    RefMetadataComponentName: 'ValidationRule1',
    RefMetadataComponentType: 'ValidationRule'
  }, {
    MetadataComponentId: '3',
    MetadataComponentName: 'CustomField2',
    MetadataComponentType: 'CustomField',
    RefMetadataComponentId: '1',
    RefMetadataComponentName: 'CustomField1',
    RefMetadataComponentType: 'CustomField'
  }];

export const dotOutput2 = 
  `// Nodes
  X1 [label=<ObjectA.CustomField1<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X2 [label=<ObjectA.ValidationRule1<BR/><FONT POINT-SIZE="8">ValidationRule</FONT>>]
  X3 [label=<CustomObjectA__c.CustomField2<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  // Paths
  X1->X2
  X3->X1
}`;

describe('no relationship single node dependency graph', () => {
  let graph: DependencyGraph;

  // Can define here if you want to use them in multiple tests
  // TODO you probably want to make this more meaningful

  beforeEach(async () => {
    // Don't use a connection, just mock methods
    graph = new DependencyGraph(null);

    // Don't try to call out to tooling
    stub(graph, 'retrieveRecords').returns(Promise.resolve([]));

    await graph.init();
  });

  // TODO you could have one of these for each public method in dependency graph.
  // If you want to test some of the private methods, just make them public, otherwise
  // they should be covered from the public method tests.
  describe('init', () => {
    it('populates nodes and edges for one record', async () => {
      await graph.buildGraph(oneObjectRecords);

      expect(graph.nodes.length).to.equal(1);
      expect(graph.edges.length).to.equal(1);
    });
  });

  describe('to dot format', () => {
    it('Check dot format', async () => {
      await graph.buildGraph(oneObjectRecords);

      expect(graph.toDotFormat()).to.contain(dotOutput1);
    });

  });

  describe('getParentRecords', () => {
    it('gets parent records of no parents', async () => {
      await graph.init();
      graph.buildGraph(oneObjectRecords);
      
      expect(graph.getParentRecords()).to.deep.equal(new Map());
      expect(graph.nodes.length).to.equal(1);
      expect(graph.edges.length).to.equal(1);
    });
  });

  describe('toJson', () => {
    it('check Json of 1 node 1 edge tree', async () => {
      graph.buildGraph(oneObjectRecords);
      let key = '1';
      let value = {parent: '', name: 'Object1', type: 'Object'};
      let edge1 = {from: '1', to: '1'};

      let expectedOutputNodes = new Array();
      expectedOutputNodes.push({id: key, node: value});
      expect(graph.toJson()).to.deep.equal({nodes: expectedOutputNodes, edges: [edge1]});
      expect(graph.nodes.length).to.equal(1);
      expect(graph.edges.length).to.equal(1);
    });
  });


});

describe('one relationship, two custom fields, one vrule dependency graph', async () => {
  let graph: DependencyGraph;
 
  beforeEach(() => {
    // Don't use a connection, just mock methods
    graph = new DependencyGraph(null);


    // Don't try to call out to tooling
    stub(graph, 'retrieveRecords').returns(Promise.resolve([]));
    stub(graph, 'retrieveCustomFields').returns(Promise.resolve(customFieldRecords));
    stub(graph, 'retrieveValidationRules').returns(Promise.resolve(validationRuleRecords));
    stub(graph, "retrieveCustomObjects").returns(Promise.resolve(customObjects));
  });

  // TODO you could have one of these for each public method in dependency graph.
  // If you want to test some of the private methods, just make them public, otherwise
  // they should be covered from the public method tests.
  describe('init', () => {
    it('populates nodes and edges for one record', async () => {
      await graph.init();
      graph.buildGraph(TwoFields1VRRecords);

      expect(graph.nodes.length).to.equal(3);
      expect(graph.edges.length).to.equal(2);
    });
  });

  describe('getParentRecords', () => {
    it('gets parent records of no parents', async () => {
      await graph.init();
      graph.buildGraph(TwoFields1VRRecords);
      let expectedMap = new Map();
      expectedMap.set('1', 'ObjectA');
      expectedMap.set('2', 'ObjectA');
      expectedMap.set('3', 'CustomObjectA__c');
      expect(graph.getParentRecords()).to.deep.equal(expectedMap);
    });
  });

  describe('to dot format', () => {
    it('Check dot format', async () => {
      await graph.init();
      graph.buildGraph(TwoFields1VRRecords);

      expect(graph.toDotFormat()).to.contain(dotOutput2);
    });

  });

  
});

