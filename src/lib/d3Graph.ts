// import * as d3 from "d3";

export class d3Graph {

    /**
     * toD3Graph
     */
    public toD3Graph() {

        d3.select("#graph").graphviz().renderDot('digraph {a -> b}');
    }
}