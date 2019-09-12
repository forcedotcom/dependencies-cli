import {core, SfdxCommand } from "@salesforce/command";
import {join} from 'path';

core.Messages.importMessagesDirectory(join(__dirname));
const messages = core.Messages.loadMessages('dependencies-cli', 'packages');

export default class Drift extends SfdxCommand {
    public static outputFolder = 'lib/';

    public static description = messages.getMessage('commandDescription');

    run(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
}