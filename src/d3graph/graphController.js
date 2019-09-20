class GraphController {

    
    // filter function
    static filter(store, graph) {

        var output = [];

        var entityList = [];

        $('.filter-option').each(function (index, option) {
            if (option.selected) {
                entityList.push(option.value);
            }
        });

        // 1.	add and remove nodes from data based on entity filters
        store.nodes.forEach(function (n) {
            if (entityList.includes(n.id) && n.filtered) {
                n.filtered = false;
                graph.nodes.push($.extend(true, {}, n));
            } else if (!entityList.includes(n.id) && !n.filtered) {
                n.filtered = true;
                graph.nodes.forEach(function (d, i) {
                    if (n.id === d.id) {
                        graph.nodes.splice(i, 1);
                    }
                });
            }
        });

        // 2.	add and remove links from data based on availability of node types
        store.edges.forEach(function (l) {
            if (entityList.includes(l.source.id) && entityList.includes(l.target.id) && l.filtered) {
                l.filtered = false;
                graph.edges.push($.extend(true, {}, l));
            } else if (
                (!
                    (entityList.includes(l.source.id) && entityList.includes(l.target.id))
                ) && !l.filtered) {
                l.filtered = true;
                graph.edges.forEach(function (d, i) {
                    if ((l.from === d.from) && (l.to == d.to)) {
                        graph.edges.splice(i, 1);
                    }
                });
            }
        });

        output.push('<li>Selected <strong>entities: </strong>', escape(graph.nodes.length),
            '<strong> relationships: </strong>', escape(graph.edges.length),
            '</li>');

        document.getElementById('selection').innerHTML = '<ul>' + output.join('') + '</ul>';
    }

    // Update pattern for updating the graph
    static update(graph, node, link, simulation, freeze, mousedownNode) {

        var typeNames = new Set();

        // *** NODES ***
        graph.nodes.forEach(function (node) {
            nodeById.set(node.id, node);
            typeNames.add(node.type);
        });

        //	UPDATE
        node = node.data(graph.nodes, function (d) { return d.id; });

        //	EXIT
        node.exit().remove();

        //	ENTER
        var newNode = node.enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", this.dragstarted)
                .on("drag", this.dragged)
                .on("end", this.dragended)
            );

        var circles = newNode.append("circle")
            .attr("r", 5)
            .attr("fill", function (d) { return color(d.type); })
            .on("mousedown", mousedownNode)

        var titles = newNode.append("title")
            .text(function (d) { return d.type + ":" + d.name + "\n" + "(" + d.id + ")"; });

        /* var labels = newNode.append("text")
          .text(function (d) { return d.id; }); */

        //	ENTER + UPDATE
        node = node.merge(newNode);

        // *** LINKS ****
        graph.edges.forEach(function (link) {
            link.source = nodeById.get(link.from);
            link.target = nodeById.get(link.to);
        });

        //	UPDATE
        link = link.data(graph.edges, function (d) { return d.from.id; });

        //	EXIT
        link.exit().remove();

        //	ENTER
        newLink = link.enter().append("line")
            .attr("class", "link");

        newLink.append("title")
            .text(function (d) { return "source: " + d.source.id + "\n" + "target: " + d.target.id; });

        //	ENTER + UPDATE
        link = link.merge(newLink);

        //	update simulation nodes, links, and alpha
        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.edges);

        simulation.alpha(1).alphaTarget(0).restart();

        // run the simulation but immediately advance the timer 
        // this will allow all links to be drawn without triggering a new force
        if (freeze) {
            // See https://github.com/d3/d3-force/blob/master/README.md#simulation_tick
            for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
                simulation.tick();
            }
        }

        // flip the filter button color depending on selected item types
        $('.filter-btn').each(function (key, value) {
            value.style.backgroundColor = "white";
            var type = value.id

            if (typeNames.has(type)) {
                value.style.backgroundColor = color(type);
            }
        });
    }

    // drag functions
    static dragstarted(d) {

        $('.freeze-btn').click();
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    static dragged(d) {

        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    static dragended(d) {

        $('.freeze-btn').click();
        if (!d3.event.active) simulation.alphaTarget(0);

        // d.fx = null;
        // d.fy = null;

        d.fx = d3.event.x;
        d.fy = d3.event.y;

        simulation.stop();
    }
}