import { expect, test } from 'sfdx-command/dist/test';

describe('org', () => {
  test
    .withOrg({ username: 'test@org.com', isDevHub: true }, true)
    .stdout({ print: true })
    .command(['hello:org', '--targetusername', 'test@org.com'])
    .it('runs org --targetusername test@org.com', (ctx) => {
      expect(ctx.stdout).to.contain(`Hello world! Your org id is: ${ctx.orgs['test@org.com'].orgId}`);
    });
});
