import {expect, test} from '@oclif/test'

describe('andyinthecloud:packages:merge', () => {
  test
  .stdout()
  .command(['andyinthecloud:packages:merge'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['andyinthecloud:packages:merge', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
