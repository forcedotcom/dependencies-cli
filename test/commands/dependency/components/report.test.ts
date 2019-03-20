import { expect, test } from '@salesforce/command/dist/test';
import { dotOutput1, dotOutput2, oneObjectRecords, TwoFields1VRRecords, customFieldRecords, validationRuleRecords, customObjects} from '../../../lib/dependencyGraphy.test';
import { PackageMerger, Member } from '../../../../src/lib/packageMerger';
import {stub} from 'sinon';;
import fs = require('fs');

const urlGetRecords = 'http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20MetadataComponentId%2C%20MetadataComponentName%2C%20MetadataComponentType%2C%20RefMetadataComponentId%2C%20RefMetadataComponentName%2C%20RefMetadataComponentType%20FROM%20MetadataComponentDependency';
const urlGetAllComponents = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20MetadataComponentId%2CRefMetadataComponentId%20FROM%20MetadataComponentDependency%20WHERE%20(MetadataComponentType%20%3D%20'CustomField'%20OR%20RefMetadataComponentType%20%3D%20'CustomField')%20OR%20(MetadataComponentType%20%3D%20'ValidationRule'%20OR%20RefMetadataComponentType%20%3D%20'ValidationRule')";
const urlGetCustomFields = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20Id%2C%20TableEnumOrId%20FROM%20CustomField%20c%20WHERE%20c.Id%20In";
const urlGetValidationRules = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20Id%2C%20EntityDefinitionId%20FROM%20ValidationRule%20c%20WHERE%20c.Id%20In";
const urlGetCustomObjects= "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20Id%2C%20DeveloperName%20FROM%20CustomObject%20c%20WHERE%20c.Id%20In";

const urlWithCustomFieldIncludefilter = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20MetadataComponentId%2C%20MetadataComponentName%2C%20MetadataComponentType%2C%20RefMetadataComponentId%2C%20RefMetadataComponentName%2C%20RefMetadataComponentType%20FROM%20MetadataComponentDependency%20WHERE%20(((RefMetadataComponentType%20%3D%20\'CustomField\'%20OR%20MetadataComponentType%20%3D%20\'CustomField\')))";
const urlWithIncludeAndExcludefilter = "http://na30.salesforce.com/services/data/v43.0/tooling/query?q=SELECT%20MetadataComponentId%2C%20MetadataComponentName%2C%20MetadataComponentType%2C%20RefMetadataComponentId%2C%20RefMetadataComponentName%2C%20RefMetadataComponentType%20FROM%20MetadataComponentDependency%20WHERE%20(((RefMetadataComponentType%20%3D%20\'CustomField\'%20OR%20MetadataComponentType%20%3D%20\'CustomField\')))%20AND%20(NOT%20(((RefMetadataComponentType%20%3D%20\'CustomObject\'%20OR%20MetadataComponentType%20%3D%20\'CustomObject\'))))";

const xml1VRExcludePackage = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<types>\n\t\t<members>ValidationRule1</members>\n\t\t<name>ValidationRule</name>\n\t</types>\n\t<types>\n\t\t<members>Object1</members>\n\t\t<name>Object</name>\n\t</types>\n\t<version>43.0</version>\n</Package>';
const xmlWithExcludePackage = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<types>\n\t\t<members>CustomField1__c</members>\n\t\t<name>CustomField</name>\n\t</types>\n\t<types>\n\t\t<members>ValidationRule1</members>\n\t\t<name>ValidationRule</name>\n\t</types>\n\t<version>43.0</version>\n</Package>';
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
      // Just return empty everything for this 
        return {done: true, nextRecordsUrl: null, records: [] };
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com'])
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
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {done: true, nextRecordsUrl: null, records: oneObjectRecords}
        }
        return {done: true, nextRecordsUrl: null, records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com'])
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
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {done: true, nextRecordsUrl: null, records: twoObjectRecords}
        }
        return {done: true, nextRecordsUrl: null, records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com'])
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
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {done: true, nextRecordsUrl: null, records: oneCustomFieldRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {done: true, nextRecordsUrl: null, records: oneCustomComponent};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {done: true, nextRecordsUrl: null, records: oneCustomField};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {done: true, nextRecordsUrl: null, records: []};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {done: true, nextRecordsUrl: null, records: []};
        }
        return {done: true, nextRecordsUrl: null, records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com'])
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
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {done: true, nextRecordsUrl: null, records: oneValidationRuleRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {done: true, nextRecordsUrl: null, records: oneCustomComponent};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {done: true, nextRecordsUrl: null, records: []};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {done: true, nextRecordsUrl: null, records: oneValidationRule};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {done: true, nextRecordsUrl: null, records: []};
        }
        return {done: true, nextRecordsUrl: null, records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com'])
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
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          return {done: true, nextRecordsUrl: null, records: TwoFields1VRRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {done: true, nextRecordsUrl: null, records: []};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {done: true, nextRecordsUrl: null, records: customFieldRecords};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {done: true, nextRecordsUrl: null, records: validationRuleRecords};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {done: true, nextRecordsUrl: null, records: customObjects};
        }
        return {done: true, nextRecordsUrl: null, records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
    
      expect(ctx.stdout).to.contains(dotOutput2);
    })
});

describe('org test two custom fields, 1 validation rule, with include list' , () => {
  let requestUrl: string;
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          requestUrl = args[0].url;
          return {done: true, nextRecordsUrl: null, records: TwoFields1VRRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {done: true, nextRecordsUrl: null, records: []};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {done: true, nextRecordsUrl: null, records: customFieldRecords};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {done: true, nextRecordsUrl: null, records: validationRuleRecords};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {done: true, nextRecordsUrl: null, records: customObjects};
        }
        return {done: true, nextRecordsUrl: null, records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com', '-i', 'CustomField'])
    .it('runs org --targetusername test@org.com', ctx => {
      
      expect(requestUrl).to.equal(urlWithCustomFieldIncludefilter);
      expect(ctx.stdout).to.contains(dotOutput2);
    })
});

describe('org test two custom fields, 1 validation rule, with include and exclude list' , () => {
  let requestUrl: string;
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
        if (args[0].url.startsWith(urlGetRecords)) {
          //very first request, looking for records
          requestUrl = args[0].url;
          return {done: true, nextRecordsUrl: null, records: TwoFields1VRRecords}
        } else if (args[0].url.startsWith(urlGetAllComponents)) {
          return {done: true, nextRecordsUrl: null, records: []};
        } else if (args[0].url.startsWith(urlGetCustomFields)) {
          return {done: true, nextRecordsUrl: null, records: customFieldRecords};
        } else if (args[0].url.startsWith(urlGetValidationRules)) {
          return {done: true, nextRecordsUrl: null, records: validationRuleRecords};
        } else if (args[0].url.startsWith(urlGetCustomObjects)) {
          return {done: true, nextRecordsUrl: null, records: customObjects};
        }
        return {records: []};
    })
    .stdout({ print: true })
    .command(['org:dependencies:report', '--targetusername', 'test@org.com', '-i', 'CustomField', '-e', 'CustomObject'])
    .it('runs org --targetusername test@org.com', ctx => {
      
      expect(requestUrl).to.equal(urlWithIncludeAndExcludefilter);
      expect(ctx.stdout).to.contains(dotOutput2);
    })
});


describe ('Exclude Package tests', () => {
  let contents:String;

  beforeEach(() => {
    stub(PackageMerger, "parseIntoMap").callsFake((file) => {
      console.log(2);
      let map = new Map<String, Array<Member>>();
      map.set("CustomField", [new Member("CustomField2__c", "CustomField")]); // So don't include CustomField2__c in the output
      map.set("ValidationRule", [new Member("ValidationRule3", "ValidationRule")]); // Does not match, so keep ValidationRule1
      return map;
    });
    stub (fs, "existsSync").callsFake(() => {
      return true;
    });
    stub(fs, "writeFileSync").callsFake((dest, txt) => {
      contents = txt;
    });

  });

  afterEach(() => {
    PackageMerger.parseIntoMap.restore();
    fs.existsSync.restore();
    fs.writeFileSync.restore();
  });


  describe('org test one validation rule one exclude package, should make no difference' , () => {
    const components = {
    };
    test
      // Mock an org that the command can use
      .withOrg({ username: 'test@org.com' }, true)
      .withConnectionRequest(async (...args) => {
          if (args[0].url.startsWith(urlGetRecords)) {
            //very first request, looking for records
            return {done: true, nextRecordsUrl: null, records: oneValidationRuleRecords}
          } else if (args[0].url.startsWith(urlGetAllComponents)) {
            return {done: true, nextRecordsUrl: null, records: oneCustomComponent};
          } else if (args[0].url.startsWith(urlGetCustomFields)) {
            return {done: true, nextRecordsUrl: null, records: []};
          } else if (args[0].url.startsWith(urlGetValidationRules)) {
            return {done: true, nextRecordsUrl: null, records: oneValidationRule};
          } else if (args[0].url.startsWith(urlGetCustomObjects)) {
            return {done: true, nextRecordsUrl: null, records: []};
          }
          return {done: true, nextRecordsUrl: null, records: []};
      })
      .stdout({ print: true })
      .command(['org:dependencies:report', '--targetusername', 'test@org.com', '-m', '-d', 'folder', '-x', 'arg1'])
      .it('runs org --targetusername test@org.com', ctx => {
        expect(contents).to.equal(xml1VRExcludePackage);
        expect(ctx.stdout).to.contains(dotOutput1ValidationRule);
      })
  });


  describe('org test two custom fields, 1 validation rule, with include and exclude list' , () => {
    test
      // Mock an org that the command can use
      .withOrg({ username: 'test@org.com' }, true)
      .withConnectionRequest(async (...args) => {
          if (args[0].url.startsWith(urlGetRecords)) {
            //very first request, looking for records
            return {done: true, nextRecordsUrl: null, records: TwoFields1VRRecords}
          } else if (args[0].url.startsWith(urlGetAllComponents)) {
            return {done: true, nextRecordsUrl: null, records: []};
          } else if (args[0].url.startsWith(urlGetCustomFields)) {
            return {done: true, nextRecordsUrl: null, records: customFieldRecords};
          } else if (args[0].url.startsWith(urlGetValidationRules)) {
            return {done: true, nextRecordsUrl: null, records: validationRuleRecords};
          } else if (args[0].url.startsWith(urlGetCustomObjects)) {
            return {done: true, nextRecordsUrl: null, records: customObjects};
          }
          return {done: true, nextRecordsUrl: null, records: []};
      })
      .stdout({ print: true })
      .command(['org:dependencies:report', '--targetusername', 'test@org.com', '-m', '-i', 'CustomField', '-d', 'folder', '-x', 'arg1'])
      .it('runs org --targetusername test@org.com', ctx => {
        expect(contents).to.equal(xmlWithExcludePackage);
        expect(ctx.stdout).to.contains(dotOutput2);
      })
  });

})