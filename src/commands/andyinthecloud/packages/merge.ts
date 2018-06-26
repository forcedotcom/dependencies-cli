import fs = require('fs');
import {flags, SfdxCommand} from '@salesforce/command';
import {ClusterPackager} from '../../../lib/clusterPackager';


export class Member {
  constructor(public name: string, public type: string) { }

  public equals(other: Member): boolean {
    return (this.name == other.name && this.type == other.type);
  }
}

export class PackageMerger {


  static parseXML : any = require('xml2js');

  public static parseIntoMap(fileName: string): Map<String,Array<Member>> {
    let xmlOutput = fs.readFileSync(fileName);
    let outputMap = new Map<String,Array<Member>>();
    PackageMerger.parseXML.parseString(xmlOutput, (err: any, res: any) => {
      for (var i = 0; i < res.Package.types.length; i++) {
        let objects = new Array<Member>();
        let arr = res.Package.types[i];
        let type = arr.name[0];
        for (var j = 0; j < arr.members.length; j++) {
          let record = new Member(arr.members[j], type);
          objects.push(record);
        }
        outputMap.set(type, objects);
      }
    });
    return outputMap;
  }

  public static containsMember(name: String, type: String, map: Map<String,Array<Member>>): boolean {
    if (map == null) {
      return false;
    }
    let arr = map.get(type);
    if (arr) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].name == name && arr[i].type == type) {
          return true;
        }
      }
    }
   return false;
  }

}


export default class PackageMerging extends SfdxCommand {
  static description = 'This tool allows you to merge several package.xmls together to create one base package.xml';

  protected static flagsConfig= {
    help: flags.help({char: 'h', description: 'get some help'}),
    // flag with no value (-f, --force)
  }

  static strict = false
  static args = [{
    name: 'files',
    required: true
  }];

  async run() {
    const {args, flags} = this.parse(PackageMerging)

    let fileArray = new Array<Map<String,Array<Member>>>();

    for (var i = 0; i <this.argv.length; i++) {
      let objArray = PackageMerger.parseIntoMap(this.argv[i]);
      fileArray.push(objArray);
    }
    let basePackageArray = fileArray[0];
    if (fileArray.length >= 2) {
      basePackageArray = this.mergeArrays(fileArray);
    }

    // Write package.xml
    let packageString = this.writePackageXml(basePackageArray);

    console.log(packageString);
  }

  private mergeArrays(fileArray: Array<Map<String,Array<Member>>>): Map<String,Array<Member>> {
    let base = fileArray[0];
    for (var i = 1; i < fileArray.length; i++) {
      base.forEach((pair: Array<Member>, type: String) => {
        if (pair) {
          for (var j = 0; j < pair.length; j++) {
            if (!PackageMerger.containsMember(pair[j].name, pair[j].type, fileArray[i])) {
              pair[j] = null;
            }
          }
        }
      });
    }    
    return base;
  }

  private writePackageXml(baseMap: Map<String, Array<Member>>): String {
    let xmlString = ClusterPackager.writeHeader();
    baseMap.forEach( (memberList: Array<Member>, type: String) => {
      let typeString = this.writeType(type, memberList);
      xmlString = xmlString.concat(typeString.valueOf());
    });
    xmlString = xmlString.concat(ClusterPackager.writeFooter());
    return xmlString;
  }

  private writeType(type: String, members: Array<Member>): String {
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
    if (nullCount == members.length) {
      return '';
    }
    return typeBody;
  }
   
}
