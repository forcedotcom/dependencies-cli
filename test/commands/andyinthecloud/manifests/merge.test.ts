import {expect, test} from '@oclif/test'
import {stub} from 'sinon';
import { PackageMerger, Member } from '../../../../src/lib/packageMerger';

let emptyXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<version>43.0</version>\n</Package>';

let combinedXml = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n\t<types>\n\t\t<members>A</members>\n\t\t<members>B</members>\n\t\t<name>1</name>\n\t</types>\n\t<types>\n\t\t<members>C</members>\n\t\t<name>2</name>\n\t</types>\n\t<version>43.0</version>\n</Package>';

describe('All file tests for Merging', () => {
  let contents = '';
  let folder = '';

  beforeEach(() => {
    stub (PackageMerger, "parseIntoMap").callsFake((file) => {
      if (file == 'arg1') {
        let map = new Map<String, Array<Member>>();
        map.set("1", [new Member("A", "1"), new Member("C", "1"), new Member("B", "1")]);
        map.set("2", [new Member("A", "2"), new Member("C", "2"), new Member("B", "2")]);
        return map;
      }
      if (file == 'arg2') {
        let map = new Map<String, Array<Member>>();
        map.set("1", [new Member("A1", "1"), new Member("C1", "1"), new Member("B1", "1")]);
        return map;       
      }
      if (file == 'arg3') {
        let map = new Map<String, Array<Member>>();
        map.set("1", [new Member("A", "1"), new Member("B", "1")]);
        map.set("2", [new Member("C", "2")]);
        return map;
      }
      return new Map<String,Array<Member>>();
    })

  });

  afterEach(() => {
    PackageMerger.parseIntoMap.restore();
  });


  describe('Empty files', () => {
    test
    .stdout({ print: true })
    .command(['andyinthecloud:manifests:merge' , 'nan', 'nan'])
    .it('Sends in empty', ctx => { 
      expect(ctx.stdout).to.contain(emptyXml);
    })

  });

  describe('1 real file, 1 empty file', () => {
    test
    .stdout({ print: true })
    .command(['andyinthecloud:manifests:merge' , 'arg1', 'nan'])
    .it('Sends in empty', ctx => { 
      expect(ctx.stdout).to.contain(emptyXml);
    })

  });

  describe('2 real files with nothing in common', () => {
    test
    .stdout({ print: true })
    .command(['andyinthecloud:manifests:merge' , 'arg1', 'arg2'])
    .it('Sends in empty', ctx => { 
      expect(ctx.stdout).to.contain(emptyXml);
    })

  });

  describe('2 real files', () => {
    test
    .stdout({ print: true })
    .command(['andyinthecloud:manifests:merge' , 'arg1', 'arg3'])
    .it('Sends in empty', ctx => { 
      expect(ctx.stdout).to.contain(combinedXml);
    })

  });


});