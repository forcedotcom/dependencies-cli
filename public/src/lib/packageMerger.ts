import fs = require('fs');

export class Member {
    constructor(public name: string, public type: string) { }

    public equals(other: Member): boolean {
      return (this.name === other.name && this.type === other.type);
    }
}

export class PackageMerger {

    public static parseXML = require('xml2js');

    public static parseIntoMap(fileName: string): Map<string, Member[]> {
        const xmlOutput = fs.readFileSync(fileName);
        const outputMap = new Map<string, Member[]>();
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

    public static containsMember(name: string, type: string, map: Map<string, Member[]>, checkParent: boolean = false): boolean {
        if (map == null) {
        return false;
        }
        let arr = map.get(type);
        if (arr) {
        for (const mem of arr) {
            if (mem.name === name && mem.type === type) {
            return true;
            }
        }
        }
        if (checkParent) {
        // Check Custom Objects as well
            arr = map.get('CustomObject');
            if (arr) {
                for (const mem of arr) {
                    if (name.startsWith(mem.name)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

}
