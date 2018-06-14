import { expect, test } from '@salesforce/command/dist/test';

describe('org', () => {
  test
    // Mock an org that the command can use
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(async (...args) => {
      // You can set a debugger here, and inspect request
      // There are things on here you can use to determine
      // what data to return, like the url path. So in another
      // test, you may have several different ifs returning
      // data for custom fields, custom objects, validation
      // rules, etc.
      // const request = args[0];

      // Just return empty everything for this test
      return { records: [] };
    })
    .stdout({ print: true })
    .command(['andyinthecloud:depends', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', ctx => {
      const expectedEmptyOuput =
`digraph graphname {
  rankdir=RL;
  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];
  // Nodes
  // Paths
}
`;
      expect(ctx.stdout).to.equal(expectedEmptyOuput);
    });
});
