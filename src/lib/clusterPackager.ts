import {Member, PackageMerger} from '../commands/andyinthecloud/manifests/merge';
import {Node, NodeGroup} from '../lib/componentGraph';

export class ClusterPackager {

    // precondition: All nodes are Scalar Nodes
    public static separateIntoGroupsFromNodes(nodes: Node[], excludeMap: Map<String, Member[]> = null): Map<String, String[]> {
        const output: Map<String, String[]>  = new Map<String, String[]>();
        for (const node of nodes) {
            let type = ((node.details.get('type')) as String).valueOf();
            const name = node.details.get('name');
            let actualName = name as String;
            if (type.startsWith('Custom')) {
                actualName = actualName.concat('__c');
            } else if (type === 'AuraDefinition') {
                continue;
            } else if (type === 'StandardEntity') {
                continue;
            }
            if (PackageMerger.containsMember(actualName, type, excludeMap)) {
                continue;
            }
            let list = output.get(type);
            if (!list) {
                list = new Array<String>();
                list.push(actualName as String);
                output.set(type, list);
            } else {
                list.push(actualName as String);
            }
        }
        return output;
    }

    public static writeHeader(): string {
        let header = '';
        // Add XML version and encoding
        header = header.concat('<?xml version=\"1.0\" encoding=\"UTF-8\"?>');
        header = header.concat('\n');
        header = header.concat('<Package xmlns=\"http://soap.sforce.com/2006/04/metadata\">\n');
        return header;
    }

    public static writeFooter(): string {
        let footer = '';
        // Set version to 34.0, may be a flag that can be added later
        footer = footer.concat('\t<version>43.0</version>');
        footer = footer.concat('\n');
        footer = footer.concat('</Package>');
        return footer;
    }

    // Non - static members

    public writeXMLNodes(n: Node[], excludeMap: Map<String, Member[]> = null, toFile: boolean = true): string {
        // Make output folder
        
        return this.writeXML(n, excludeMap, toFile);
    }

    public writeXMLNodeGroup(n: NodeGroup, toFile: boolean = true): string {
        // Make output folder
        return this.writeXML(Array.from(n.nodes), null, toFile);
    }

    private writeXML(n: Node[], excludeMap: Map<String, Member[]> = null, toFile: boolean): string {
        
        let text = ClusterPackager.writeHeader();

        const typeMap = ClusterPackager.separateIntoGroupsFromNodes(n, excludeMap);
        Array.from(typeMap.entries()).forEach(pair => {
            text = text.concat((this.writeType(pair[0], pair[1]) as String).valueOf());
        });

        text = text.concat(ClusterPackager.writeFooter());

        return text;
    }

    private writeType(type: String, nodes: String[]): String {
        let typeBody = '\t<types>\n';
        let ending = '';
        for (const n of nodes) {
            typeBody = typeBody.concat('\t\t<members>');
            typeBody = typeBody.concat((n as String).valueOf());
            typeBody = typeBody.concat(ending);
            typeBody = typeBody.concat('</members>');
            typeBody = typeBody.concat('\n');
        }
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(((type as String).valueOf()));
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        return typeBody;
    }
}
