import {flags, SfdxCommand} from '@salesforce/command';
import {ClusterPackager} from '../../../lib/clusterPackager';
import { FileWriter } from '../../../lib/fileWriter';
import {Member, PackageMerger} from '../../../lib/packageMerger';

export default class PackageMerging extends SfdxCommand {

  public static description = 'This tool allows you to merge several package.xmls together to create one base package.xml.' +
  'You can put the file names (including paths) to the package.xmls as args (as many as you want) and the base package.xml will be outputted to the console.';

  public static strict = false;

  public static flagsConfig = {
    help: flags.help({char: 'h', description: 'get some help'}),
    outputdirectory: flags.string({char: 'd', description: 'output folder location to put package.xml'})
    // flag with no value (-f, --force)
  };

  private homedir = require('os').homedir();

  public async run(): Promise<string> {

    const fileArray = new Array<Map<string, Member[]>>();
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

    let basePackageArray = fileArray[0];
    if (fileArray.length >= 2) {
      basePackageArray = this.mergeArrays(fileArray);
    }
    // Write package.xml
    const packageString = ClusterPackager.writeXMLMap(basePackageArray);

    if (this.flags.outputdirectory) {
      FileWriter.writeFile(this.flags.outputdirectory, 'package.xml', packageString);
    }
    this.ux.log(packageString);

    return packageString;
  }

  private mergeArrays(fileArray: Array<Map<string, Member[]>>): Map<string, Member[]> {
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

}
