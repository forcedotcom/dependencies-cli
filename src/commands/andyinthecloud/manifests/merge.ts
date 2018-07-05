import fs = require('fs');
import {flags, SfdxCommand} from '@salesforce/command';
import {ClusterPackager} from '../../../lib/clusterPackager';
import shell = require('shelljs');

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
  private homedir = require('os').homedir();

  public static description = 'This tool allows you to merge several package.xmls together to create one base package.xml.' +
  'You can put the file names (including paths) to the package.xmls as args (as many as you want) and the base package.xml will be outputted to the console.';

  public static strict = false;

  static flagsConfig = {
    help: flags.help({char: 'h', description: 'get some help'}),
    outputdirectory: flags.string({char: 'd', description: 'output folder location to put package.xml'})
    // flag with no value (-f, --force)
  };

  public async run(): Promise<String> {

    const fileArray = new Array<Map<String, Member[]>>();
    let cont = false;
    for (const file of this.argv) {
      if (file === '-d' || file === '--outputdir') { // TODO: Find a better way to get args and flags
        cont = true; // Skip next arg also 
        continue;
      }
      if (cont) {
        cont = false;
        continue;
      }
      const objArray = PackageMerger.parseIntoMap(file);
      fileArray.push(objArray);
    }

    console.log(fileArray);

    let basePackageArray = fileArray[0];
    if (fileArray.length >= 2) {
      basePackageArray = this.mergeArrays(fileArray);
    }
    // Write package.xml
    const packageString = this.writePackageXml(basePackageArray);

    if (this.flags.outputdirectory) {
      let dir = this.flags.outputdirectory;
      if (dir.charAt(dir.length - 1) !== '/') {
          dir = dir + '/';
      }
      if (dir.match('/^~'))  {
        dir.replace("~", this.homedir);
      }

      if (!fs.existsSync(dir)) {
          shell.mkdir('-p', dir);
      }

      dir = dir + 'package.xml';  
      fs.writeFileSync(dir, packageString);     
    }
    console.log(packageString);

    return packageString;
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
