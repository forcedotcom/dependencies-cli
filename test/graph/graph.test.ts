import { expect, test } from '@salesforce/command/dist/test';
import * as Analyze from '../../src/commands/dependency/components/componentizer';
import * as Assert from 'assert';
import {Node, Graph} from '../../src/lib/componentGraph';
import {DepthFirstSearch} from '../../src/lib/DFSLib';

//import { expect } from 'chai';
const fs = require('fs');
const path = require('path')
/*
describe ('Load happy soup', function() {
    let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/happysoup.json'), 'utf8'));

    //console.log(obj.result.records);
    let graph : Graph = Analyze.default.buildGraph(obj.result.records);
    console.log(graph);
});*/

function getAdjacency(graph: Graph, node: Node) : Map<string, Node> {
    const edges: Map<string, Node> = new Map<string, Node>();
    Array.from(graph.getEdges(node)).forEach((edge) => {
        edges.set(edge.name, edge);
    });
    return edges;
}
describe ('Simple', function() {
    it('Test simple graph', function() {
        let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/simple.json'), 'utf8'));

        console.log(obj.result.records);
        let graph : Graph = Analyze.default.buildGraph(obj.result.records);
        console.log(JSON.stringify(graph));
        let a = graph.getNode("A");
        let b = graph.getNode("B");
        let c = graph.getNode("C");
        Assert.ok(a, "A doesn't exist");
        Assert.ok(b, "B doesn't exist");
        Assert.ok(c, "C doesn't exist");

        console.log(getAdjacency(graph, a));
        console.log(getAdjacency(graph, a).get('B'));
        Assert.ok(getAdjacency(graph, a).has("B"), "A not connected to B");
        Assert.ok(getAdjacency(graph, a).has("C"), "A not connected to C");
        Assert.ok(getAdjacency(graph, b).has("C"), "B not connected to C");
        Assert.ok(getAdjacency(graph, c).size == 0, "C is not empty");
    });

    it('Test combine on simple graph', function() {
        let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/simple.json'), 'utf8'));

        let graph : Graph = Analyze.default.buildGraph(obj.result.records);
        let a = graph.getNode("A");
        let b = graph.getNode("B");
        let c = graph.getNode("C");
        Assert.ok(a, "A doesn't exist");
        Assert.ok(b, "B doesn't exist");
        Assert.ok(c, "C doesn't exist");
        let bc = graph.combineNodes(b, c);

        //Now getting B and C should return bc.
        //Assert.equal(bc, graph.getNode("B"));
        //Assert.equal(bc, graph.getNode("C"));
        for (let node of graph.nodes) {
            console.log(node.name);
        }
        Assert.equal(bc, graph.getNode("B, C"));

        Assert.ok(!getAdjacency(graph, a).has("B"), "A is connected to B");
        Assert.ok(!getAdjacency(graph, a).has("C"), "A is connected to C");
        Assert.ok(!getAdjacency(graph, bc).has("B"), "B + C is connected to B");
        Assert.ok(!getAdjacency(graph, bc).has("C"), "B + C is connected to C");
        Assert.ok(getAdjacency(graph, a).has("B, C"), "A not connected to 'B and C'");
        Assert.ok(getAdjacency(graph, bc).size == 0, "'B and C' is not empty");
    });

    it('Test DFS', function() {
        let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/simple.json'), 'utf8'));

        //console.log(obj.result.records);
        let graph : Graph = Analyze.default.buildGraph(obj.result.records, false);

        let visited : Array<string> = new Array<string>();
        let finished : Array<string> = new Array<string>();
        let explored : Array<[string, string]> = new Array<[string, string]>();

        class TestDFS extends DepthFirstSearch {
            visit(node: Node) {
                visited.push(node.name);
            }
            explore(src: Node, dst: Node) {
                explored.push([src.name, dst.name]);
            }
            finish(node: Node) {
                finished.push(node.name);
            }
        }
        let dfs : DepthFirstSearch = new TestDFS(graph);
        dfs.run();

        expect(visited).to.have.members(['A', 'B', 'C']);

    });
    it('Test Cycle removal', function() {
        let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/cycles.json'), 'utf8'));

        //console.log(obj.result.records);
        let graph : Graph = Analyze.default.buildGraph(obj.result.records);
        graph.removeCycles();
        for (const node of graph.nodes) {
            console.log(JSON.stringify(node.name));
        };

        //console.log(JSON.stringify(graph.nodes));
        const a = graph.getNode('A');
        const b = graph.getNode('B');
        const cd = graph.getNode('C, D');
        const e = graph.getNode('E');
        const fgh = graph.getNode('F, G, H');
        const ij = graph.getNode('I, J');
        Assert.ok(a, 'A does not exist');
        Assert.ok(b, 'B does not exist');
        Assert.ok(cd, 'C, D does not exist');
        Assert.ok(e, 'E does not exist');
        Assert.ok(fgh, 'F, G, H does not exist');
        Assert.ok(ij, 'I, J does not exist');
        expect(Array.from(getAdjacency(graph, a).values())).to.have.members([b, cd, fgh, ij]);
        expect(Array.from(getAdjacency(graph, b).values())).to.have.members([b, cd]);
        expect(Array.from(getAdjacency(graph, cd).values())).to.have.members([e]);
        Assert.equal(getAdjacency(graph, e).size, 0);
        expect(Array.from(getAdjacency(graph, fgh).values())).to.have.members([e]);
        Assert.equal(getAdjacency(graph, ij).size, 0);
    });

    describe('run async method cycles', () => {
        test
            // Mock an org that the command can use
            .withOrg({ username: 'test@org.com' }, true)
            .withConnectionRequest(async (...args) => {

                let obj1 : any = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/cycles.json'), 'utf8'));
                return obj1.result;
            })
            .stdout({ print: true })
            .command(['org:dependencies:componentizer', '-u', 'test@org.com'])
            .it('runs org --targetusername test@org.com', ctx => {
            
            })
    });
});
