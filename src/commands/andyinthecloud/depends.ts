import { core, flags, SfdxCommand } from '@salesforce/command';
import { DependencyGraph, MetadataComponentDependency } from '../../lib/dependencyGraph';

core.Messages.importMessagesDirectory(__dirname);

const messages = core.Messages.loadMessages('dependencies-cli', 'depends');

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('description');
  public static examples = [messages.getMessage('example1')];

  protected static flagsConfig = {
    resultformat: flags.string({ char: 'r', description: messages.getMessage('resultformatFlagDescription'), default: 'dot', options: ['dot'] }),
    metadatacomponentname: flags.string({ char: 'm', description: messages.getMessage('metadatacomponentnameFlagDescription') }),
    querycriteria: flags.string({ char: 'q', description: messages.getMessage('querycriteriaFlagDescription') })
  };

  protected static requiresUsername = true;

  public async run(): Promise<core.AnyJson> {
    const conn = this.org.getConnection();
    conn.version = '43.0';

    const deps = new DependencyGraph(conn.tooling);
    await deps.init(await this.getDependencyRecords());

    // Only dot format is allowed by the flags property, but put
    // this check in case you add more later
    if (this.flags.resultformat === 'dot') {
      this.ux.log(deps.toDotFormat());
    }

    // All commands should support --json
    return deps.toJson();
  }

  private async getDependencyRecords() {
    const query = this.org.getConnection().tooling.query<MetadataComponentDependency>('SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType FROM MetadataComponentDependency');

    if (this.flags.querycriteria) {
      query.where(this.flags.querycriteria);
    }

    if (this.flags.metadatacomponentname) {
      const filter = this.flags.metadatacomponentname;
      const filtername = filter != null ? filter.split('.')[1] : null;
      const filtertype = filter != null ? filter.split('.')[0] : null;
      query.where(`RefMetadataComponentName = '${filtername}' AND RefMetadataComponentType = '${filtertype}' AND (NOT MetadataComponentName LIKE '%Test')`);
    }

    return (await query).records;
  }
}
