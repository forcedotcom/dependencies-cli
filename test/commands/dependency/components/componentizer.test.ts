import * as Analyze from '../../../../src/commands/dependency/components/componentizer';
import * as Assert from 'assert';
import { expect, test } from '@salesforce/command/dist/test';
import {Node,Graph} from '../../../../src/lib/componentGraph';
import {FindCycles} from '../../../../src/lib/DFSLib';

const fs = require('fs');
const path = require('path')


function getAdjacency(graph: Graph, node: Node) : Map<string, Node> {
    const edges: Map<string, Node> = new Map<string, Node>();
    Array.from(graph.getEdges(node)).forEach((edge) => {
        edges.set(edge.name, edge);
    });
    return edges;
}
describe ('Simple', function() {
    it('Test simple graph', function() {
        let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../graph/data/simple.json'), 'utf8'));

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

});


describe ('Very Simple', function() {
    it('Test simple graph cycles', function() {
        let obj : any = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../graph/data/verysimple.json'), 'utf8'));
        let graph : Graph = Analyze.default.buildGraph(obj.result.records);
        //console.log(JSON.stringify(graph));
        let cycles = new FindCycles(graph);
        cycles.run();
        console.log(cycles[0]);
        console.log(cycles); //Should be no cycles
        expect(cycles.cycles).to.deep.equals(new Array<Node[]>());
    });

});