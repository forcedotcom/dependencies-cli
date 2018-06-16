import { expect, test } from '@salesforce/command/dist/test';
import { dotOutput1, dotOutput2, oneObjectRecords, TwoFields1VRRecords, customFieldRecords, validationRuleRecords, customObjects} from '../../../lib/dependencyGraphy.test';
import { DEFAULT_ECDH_CURVE } from 'tls';

const urlGetRecords = 'http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20MetadataComponentId%2C%20MetadataComponentName%2C%20MetadataComponentType%2C%20RefMetadataComponentId%2C%20RefMetadataComponentName%2C%20RefMetadataComponentType%20FROM%20MetadataComponentDependency';
const urlGetAllComponents = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20MetadataComponentId%2CRefMetadataComponentId%20FROM%20MetadataComponentDependency%20WHERE%20(MetadataComponentType%20%3D%20'CustomField'%20OR%20RefMetadataComponentType%20%3D%20'CustomField')%20OR%20(MetadataComponentType%20%3D%20'ValidationRule'%20OR%20RefMetadataComponentType%20%3D%20'ValidationRule')";
const urlGetCustomFields = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20Id%2C%20TableEnumOrId%20FROM%20CustomField%20c%20WHERE%20c.Id%20In";
const urlGetValidationRules = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20Id%2C%20EntityDefinitionId%20FROM%20ValidationRule%20c%20WHERE%20c.Id%20In";
const urlGetCustomObjects= "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20Id%2C%20DeveloperName%20FROM%20CustomObject%20c%20WHERE%20c.Id%20In";

//TWO OBJECT TEST QUERY RETURNS -------------------
const twoObjectRecords = [{
  MetadataComponentId: '1',
  MetadataComponentName: 'Object1',
  MetadataComponentType: 'Object',
  RefMetadataComponentId: '2',
  RefMetadataComponentName: 'Object2',
  RefMetadataComponentType: 'Object'
}];

const dotOutput2Objects = 
`// Nodes
  X1 [label=<Object1<BR/><FONT POINT-SIZE="8">Object</FONT>>]
  X2 [label=<Object2<BR/><FONT POINT-SIZE="8">Object</FONT>>]
  // Paths
  X1->X2
}`;

// -----------------------------------------------
//ONE CUSTOM FIELD TEST QUERY RETURNS ------------
const oneCustomFieldRecords = [{
  MetadataComponentId: '1',
  MetadataComponentName: 'CustomField1',
  MetadataComponentType: 'CustomField',
  RefMetadataComponentId: '2',
  RefMetadataComponentName: 'Object1',
  RefMetadataComponentType: 'Object'
}];

const oneCustomComponent = [
  {MetadataComponentId: '1', RefMetadataComponentId: '2'}
];

const dotOutput1CustomField = 
`// Nodes
  X1 [label=<ObjectA.CustomField1<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X2 [label=<Object1<BR/><FONT POINT-SIZE="8">Object</FONT>>]
  // Paths
  X1->X2
}`

const oneCustomField = [
  {Id: '1', TableEnumOrId: 'ObjectA'}
]

// ------------------------------------------------
//ONE VALIDATION RULE TEST QUERY RETURNS ----------
const oneValidationRuleRecords = [{
  MetadataComponentId: '1',
  MetadataComponentName: 'ValidationRule1',
  MetadataComponentType: 'ValidationRule',
  RefMetadataComponentId: '2',
  RefMetadataComponentName: 'Object1',
  RefMetadataComponentType: 'Object'
}];

const oneValidationRule = [
  {Id: '1', EntityDefinitionId: 'ObjectA'}
];

const dotOutput1ValidationRule = 
`// Nodes
  X1 [label=<ObjectA.ValidationRule1<BR/><FONT POINT-SIZE="8">ValidationRule</FONT>>]
  X2 [label=<Object1<BR/><FONT POINT-SIZE="8">Object</FONT>>]
  // Paths
  X1->X2
}`

// ------------------------------------------------


describe('org', () => {
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

      // Just return empty everything for this 
        return { records: [] };
    })
    .stdout({ print: true })
    .command(['andyinthecloud:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
      const expectedEmptyOuput =
`digraph graphname {
  rankdir=RL;
  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];
  // Nodes
  // Paths
}
`;
      expect(ctx.stdout).to.equal(expectedEmptyOuput);
    })
});


describe('org test one object', () => {
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {records: oneObjectRecords}
        }
        return {records: []};
    })
    .stdout({ print: true })
    .command(['andyinthecloud:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
    
      expect(ctx.stdout).to.contains(dotOutput1);
    })
});

describe('org test two objects' , () => {
  const components = {
  };
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {records: twoObjectRecords}
        }
        return {records: []};
    })
    .stdout({ print: true })
    .command(['andyinthecloud:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
    
      expect(ctx.stdout).to.contains(dotOutput2Objects);
    })
});

describe('org test one custom field' , () => {
  const components = {
  };
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {records: oneCustomFieldRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {records: oneCustomComponent};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {records: oneCustomField};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {records: []};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {records: []};
        }
        return {records: []};
    })
    .stdout({ print: true })
    .command(['andyinthecloud:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
    
      expect(ctx.stdout).to.contains(dotOutput1CustomField);
    })
});

describe('org test one validation rule' , () => {
  const components = {
  };
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {records: oneValidationRuleRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {records: oneCustomComponent};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {records: []};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {records: oneValidationRule};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {records: []};
        }
        return {records: []};
    })
    .stdout({ print: true })
    .command(['andyinthecloud:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
    
      expect(ctx.stdout).to.contains(dotOutput1ValidationRule);
    })
});

describe('org test two custom fields, 1 validation rule' , () => {
  const components = {
  };
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {records: TwoFields1VRRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {records: []};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {records: customFieldRecords};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {records: validationRuleRecords};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {records: customObjects};
        }
        return {records: []};
    })
    .stdout({ print: true })
    .command(['andyinthecloud:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
    
      expect(ctx.stdout).to.contains(dotOutput2);
    })
});