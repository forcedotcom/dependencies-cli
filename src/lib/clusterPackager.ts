import {componentsWithParents} from './dependencyGraph';
import {Node, NodeGroup} from './NodeDefs';
import {Member, PackageMerger} from './packageMerger';

const TYPE_BLACKLIST = ['AuraDefinition', 'StandardEntity'];

export class ClusterPackager {

    // precondition: All nodes are Scalar Nodes
    public static separateIntoGroupsFromNodes(nodes: Node[], excludeMap: Map<string, Member[]> = null): Map<string, string[]> {
        const output: Map<string, string[]>  = new Map<string, string[]>();
        for (const node of nodes) {
            const type = ((node.details.get('type')) as String).valueOf();
            const name = node.details.get('name');
            let actualName = (name as String).valueOf();
            if (type.startsWith('Custom')) {
                actualName = actualName + '__c';
            } else if (TYPE_BLACKLIST.indexOf(type) >= 0) {
                continue;
            }
            const hasParent = componentsWithParents.indexOf(type) >= 0;
            if (hasParent) {
                actualName = (node.details.get('parent') as String).valueOf() + actualName;
            }
            if (PackageMerger.containsMember(actualName, type, excludeMap, hasParent)) {
                continue;
            }
            let list = output.get(type);
            if (!list) {
                list = new Array<string>();
                output.set(type, list);
            }
            list.push(actualName);
        }
        return output;
    }

    public static writeXMLNodes(n: Node[], excludeMap: Map<string, Member[]> = null, forValidation: boolean = false): string {
        return ClusterPackager.writeXML(n, excludeMap, forValidation);
    }

    public static writeXMLNodeGroup(n: NodeGroup, forValidation: boolean = false): string {
        return ClusterPackager.writeXML(Array.from(n.nodes), null, forValidation);
    }

    public static writeXMLMap(baseMap: Map<string, Member[]>): string {
        let xmlString = ClusterPackager.writeHeader();
        baseMap.forEach((memberList: Member[], type: string) => {
          const typeString = this.writeTypeMember(type, memberList);
          xmlString = xmlString.concat(typeString.valueOf());
        });
        xmlString = xmlString.concat(ClusterPackager.writeFooter());
        return xmlString;
    }

    private static writeXML(n: Node[], excludeMap: Map<string, Member[]> = null, forValidation: boolean): string {
        let text = ClusterPackager.writeHeader();

        const typeMap = ClusterPackager.separateIntoGroupsFromNodes(n, excludeMap);
        Array.from(typeMap.entries()).forEach(pair => {
            if (forValidation) {
                text = text.concat(this.writeWildCardType(pair[0], pair[1]));
            }
            text = text.concat(this.writeType(pair[0], pair[1]));
        });

        text = text.concat(ClusterPackager.writeFooter());

        return text;
    }

    private static writeTypeMember(type: string, members: Member[]): string {
        let nullCount = 0;
        let typeBody = '\t<types>\n';
        for (const member of members) {
          if (member != null) {
            typeBody = typeBody.concat('\t\t<members>');
            typeBody = typeBody.concat(member.name);
            typeBody = typeBody.concat('</members>');
            typeBody = typeBody.concat('\n');
          } else {
            nullCount++;
          }
        }
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(type);
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        if (nullCount === members.length) {
          return '';
        }
        return typeBody;
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

    private static writeType(type: string, nodes: string[]): string {
        let typeBody = '\t<types>\n';
        for (const n of nodes) {
            typeBody = typeBody.concat('\t\t<members>');
            typeBody = typeBody.concat(n);
            typeBody = typeBody.concat('</members>');
            typeBody = typeBody.concat('\n');
        }
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(type);
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        return typeBody;
    }

    private static writeWildCardType(type: string, nodes: string[]): string {
        let typeBody = '\t<types>\n';
        typeBody = typeBody.concat('\t\t<members>*</members>');
        typeBody = typeBody.concat('\n');
        typeBody = typeBody.concat('\t\t<name>');
        typeBody = typeBody.concat(type);
        typeBody = typeBody.concat('</name>\n');
        typeBody = typeBody.concat('\t</types>\n');
        return typeBody;
    }
}
