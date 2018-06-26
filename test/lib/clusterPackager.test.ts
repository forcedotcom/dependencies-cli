import { expect, test } from '@salesforce/command/dist/test';
import { ClusterPackager } from '../../src/lib/clusterPackager';
import {stub} from 'sinon';
import fs = require('fs');
import { NodeGroup, Node, ScalarNode } from '../../src/lib/componentGraph';


let emptyXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<version>43.0</version>\n</Package>';
let oneNodeXml ='<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<types>\n\t\t<members>G</members>\n\t\t<name>BasicNode</name>\n\t</types>\n\t<version>43.0</version>\n</Package>';
let fiveNodeXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<types>\n\t\t<members>G</members>\n\t\t<members>H</members>\n\t\t<members>J</members>\n\t\t<members>K</members>\n\t\t<members>L</members>\n\t\t<name>BasicNode</name>\n\t</types>\n\t<version>43.0</version>\n</Package>';
let fourNodeXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<types>\n\t\t<members>G</members>\n\t\t<members>H</members>\n\t\t<name>BasicNode</name>\n\t</types>\n\t<types>\n\t\t<members>J</members>\n\t\t<members>K</members>\n\t\t<name>BasicNode2</name>\n\t</types>\n\t<version>43.0</version>\n</Package>';

function createNode (id: string, name: String, type: String ): Node {
  let details = new Map<string, object>();
  details.set('name', name);
  details.set('type', type);
  let n = new ScalarNode(id, details);
  return n;
}

describe('All file tests', () => {
  let contents = '';
  let folder = '';
  let clusterPackager: ClusterPackager;

  beforeEach(() => {
    clusterPackager = new ClusterPackager('../test/lib')
    stub (fs, "mkdirSync");
    stub(fs, "writeFileSync").callsFake((dest, text) => {
      contents = text;
      folder = dest;
    })
  });

  afterEach(() => {
    fs.writeFileSync.restore();
    fs.mkdirSync.restore();
  });



  describe('blank test, writes nothing', () => {
    test
    .it('Sends in no records and so should output just header and footer', () => {
      let g = new NodeGroup();
      clusterPackager.writeXML(g); 
      expect(folder).to.equal('../test/lib/' + g.name+ '/package.xml');
      expect(contents).to.equal(emptyXml);
    })

  });

  describe('one Node', () => {
    test
    .it('Sends in one node', () => {
      let nodeList = new Array<Node>();
      let gNode = createNode('G', "G", 'BasicNode');
      nodeList.push(gNode);
      clusterPackager.writeXMLNodes(nodeList);
      expect(folder).to.equal('../test/lib/package.xml');
      expect(contents).to.equal(oneNodeXml);
    })

  });

  describe('5 nodes, 1 type', () => {
    test
    .it('Sends in one node', () => {
      let nodeList = new Array<Node>();
      let gNode = createNode('g', "G", 'BasicNode');
      let hNode = createNode('h', "H", 'BasicNode');
      let iNode = createNode('j', "J", 'BasicNode');
      let jNode = createNode('k', "K", 'BasicNode');
      let kNode = createNode('l', "L", 'BasicNode');
      nodeList.push(gNode);
      nodeList.push(hNode);
      nodeList.push(iNode);
      nodeList.push(jNode);
      nodeList.push(kNode);
      clusterPackager.writeXMLNodes(nodeList);
      expect(folder).to.equal('../test/lib/package.xml');
      expect(contents).to.equal(fiveNodeXml);
    })

  });

  describe('4 nodes, 2 types', () => {
    test
    .it('Sends in one node', () => {
      let nodeList = new Array<Node>();
      let gNode = createNode('g', "G", 'BasicNode');
      let hNode = createNode('h', "H", 'BasicNode');
      let jNode = createNode('j', "J", 'BasicNode2');
      let kNode = createNode('k', "K", 'BasicNode2');
      nodeList.push(gNode);
      nodeList.push(hNode);
      nodeList.push(jNode);
      nodeList.push(kNode);
      clusterPackager.writeXMLNodes(nodeList);
      expect(folder).to.equal('../test/lib/package.xml');
      expect(contents).to.equal(fourNodeXml);
    })

  });

  describe('Big Node Group', () => {
    test
    .it('Sends in one node', () => {
      let gNode = createNode('g', "G", 'BasicNode');
      let hNode = createNode('h', "H", 'BasicNode');
      let jNode = createNode('j', "J", 'BasicNode2');
      let kNode = createNode('k', "K", 'BasicNode2');
      let nodeGroup = (gNode as ScalarNode).combineWith(hNode as ScalarNode);
      nodeGroup.combineWith(jNode as ScalarNode);
      nodeGroup.combineWith(kNode as ScalarNode);
      clusterPackager.writeXML(nodeGroup);
      expect(folder).to.equal('../test/lib/g, h, j, k/package.xml');
      expect(contents).to.equal(fourNodeXml);
    })

  });



});