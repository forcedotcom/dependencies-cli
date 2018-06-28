import fs = require('fs');
import {flags, SfdxCommand} from '@salesforce/command';
import {ClusterPackager} from '../../../lib/clusterPackager';

export class Member {
  constructor(public name: string, public type: string) { }

  public equals(other: Member): boolean {
    return (this.name === other.name && this.type === other.type);
  }
}

export class PackageMerger {

  public static parseXML = require('xml2js');

  public static parseIntoMap(fileName: string): Map<String, Member[]> {
    const xmlOutput = fs.readFileSync(fileName);
    const outputMap = new Map<String, Member[]>();
    PackageMerger.parseXML.parseString(xmlOutput, (err, res) => {
      if (err) {
        console.log('INVALID XML FILE');
        console.log(err);
      }
      if (res.Package.types) {
        for (const arr of res.Package.types) {
          const objects = new Array<Member>();
          const type = arr.name[0];
          for (const name of arr.members) {
            const record = new Member(name, type);
            objects.push(record);
          }
          outputMap.set(type, objects);
        }
      }
    });
    return outputMap;
  }

  public static containsMember(name: String, type: String, map: Map<String, Member[]>): boolean {
    if (map == null) {
      return false;
    }
    const arr = map.get(type);
    if (arr) {
      for (const mem of arr) {
        if (mem.name === name && mem.type === type) {
          return true;
        }
      }
    }
    return false;
  }

}

export default class PackageMerging extends SfdxCommand {
  public static description = 'This tool allows you to merge several package.xmls together to create one base package.xml.' +
  'You can put the file names (including paths) to the package.xmls as args (as many as you want) and the base package.xml will be outputted to the console.';

  public static strict = false;
  public static args = [{
    name: 'files',
    required: true
  }];

  protected static flagsConfig = {
    help: flags.help({char: 'h', description: 'get some help'})
    // flag with no value (-f, --force)
  };

  public async run() {

    const fileArray = new Array<Map<String, Member[]>>();

    for (const file of this.argv) {
      const objArray = PackageMerger.parseIntoMap(file);
      fileArray.push(objArray);
    }

    let basePackageArray = fileArray[0];
    if (fileArray.length >= 2) {
      basePackageArray = this.mergeArrays(fileArray);
    }
    // Write package.xml
    const packageString = this.writePackageXml(basePackageArray);

    console.log(packageString);
  }

  private mergeArrays(fileArray: Array<Map<String, Member[]>>): Map<String, Member[]> {
    const base = fileArray[0];
    for (const file of fileArray) {
      base.forEach((pair: Member[]) => {
        if (pair) {
          for (let j = 0; j < pair.length; j++) {
            if (!PackageMerger.containsMember(pair[j].name, pair[j].type, file)) {
              pair[j] = null;
            }
          }
        }
      });
    }
    return base;
  }

  private writePackageXml(baseMap: Map<String, Member[]>): String {
    let xmlString = ClusterPackager.writeHeader();
    baseMap.forEach((memberList: Member[], type: String) => {
      const typeString = this.writeType(type, memberList);
      xmlString = xmlString.concat(typeString.valueOf());
    });
    xmlString = xmlString.concat(ClusterPackager.writeFooter());
    return xmlString;
  }

  private writeType(type: String, members: Member[]): String {
    let nullCount = 0;
    let typeBody = '\t<types>\n';
    for (const member of members) {
      if (member != null) {
        typeBody = typeBody.concat('\t\t<members>');
        typeBody = typeBody.concat(member.name.valueOf());
        typeBody = typeBody.concat('</members>');
        typeBody = typeBody.concat('\n');
      } else {
        nullCount++;
      }
    }
    typeBody = typeBody.concat('\t\t<name>');
    typeBody = typeBody.concat(type.valueOf());
    typeBody = typeBody.concat('</name>\n');
    typeBody = typeBody.concat('\t</types>\n');
    if (nullCount === members.length) {
      return '';
    }
    return typeBody;
  }
}
