import { SfdxCommand } from "@salesforce/command";

export default class Drift extends SfdxCommand {

    public static description = 'Computes a score representing the variance between linked and available package versions.'

    run(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
}