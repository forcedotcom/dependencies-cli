import {Member, PackageMerger} from './packageMerger';
import {Node, NodeGroup} from './NodeDefs';
import {componentsWithParents} from './dependencyGraph';

const TYPE_BLACKLIST = ['AuraDefinition', 'StandardEntity'];

export class ClusterPackager {

    // precondition: All nodes are Scalar Nodes
    public static separateIntoGroupsFromNodes(nodes: Node[], excludeMap: Map<String, Member[]> = null): Map<String, String[]> {
        const output: Map<String, String[]>  = new Map<String, String[]>();
        for (const node of nodes) {
            let type = ((node.details.get('type')) as String).valueOf();
            const name = node.details.get('name');
            let actualName = (name as String).valueOf();
            if (type.startsWith('Custom')) {
                actualName = actualName + '__c';
            } else if (TYPE_BLACKLIST.indexOf(type) >= 0) {
                continue;
            }
            if (componentsWithParents.indexOf(type) >= 0) {
                actualName = (node.details.get('parent') as String).valueOf() + actualName;
            }
            if (PackageMerger.containsMember(actualName, type, excludeMap)) {
                continue;
            }
            let list = output.get(type);
            if (!list) {
                list = new Array<String>();
                output.set(type, list);
            } 
            list.push(actualName as String);
        }
        return output;
    }

    private static writeHeader(): string {
        let header = '';
        // Add XML version and encoding
        header = header.concat('<?xml version=\"1.0\" encoding=\"UTF-8\"?>');
        header = header.concat('\n');
        header = header.concat('<Package xmlns=\"http://soap.sforce.com/2006/04/metadata\">\n');
        return header;
    }

    private static writeFooter(): string {
        let footer = '';
        // Set version to 34.0, may be a flag that can be added later
        footer = footer.concat('\t<version>43.0</version>');
        footer = footer.concat('\n');
        footer = footer.concat('</Package>');
        return footer;
    }

    public static writeXMLNodes(n: Node[], excludeMap: Map<String, Member[]> = null, toFile: boolean = true): string {
        return ClusterPackager.writeXML(n, excludeMap, toFile);
    }

    public static writeXMLNodeGroup(n: NodeGroup, toFile: boolean = true): string {
        return ClusterPackager.writeXML(Array.from(n.nodes), null, toFile);
    }

    public static writeXMLMap(baseMap: Map<String, Member[]>): String {
        let xmlString = ClusterPackager.writeHeader();
        baseMap.forEach((memberList: Member[], type: String) => {
          const typeString = this.writeTypeMember(type, memberList);
          xmlString = xmlString.concat(typeString.valueOf());
        });
        xmlString = xmlString.concat(ClusterPackager.writeFooter());
        return xmlString;
    }

    private static writeXML(n: Node[], excludeMap: Map<String, Member[]> = null, toFile: boolean): string {
        
        let text = ClusterPackager.writeHeader();

        const typeMap = ClusterPackager.separateIntoGroupsFromNodes(n, excludeMap);
        Array.from(typeMap.entries()).forEach(pair => {
            text = text.concat((this.writeType(pair[0], pair[1]) as String).valueOf());
        });

        text = text.concat(ClusterPackager.writeFooter());

        return text;
    }

    private static writeTypeMember(type: String, members: Member[]): String {
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

    private static writeType(type: String, nodes: String[]): String {
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
