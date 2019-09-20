class FileController {

    // load file functions
    static handleFileSelect(evt) {

        var f = evt.target.files[0]; // Single file object requested only

        var output = [];

        output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
            f.size, ' bytes, last modified: ',
            f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
            '</li>');

        document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';

        return f;
    }

    // export button event handler
    static exportGraph(graph) {

            var exportGraph = {
                "result":
                {
                    "nodes": graph.nodes,
                    "edges": graph.edges
                }
            };

            var file = new Blob([JSON.stringify(exportGraph)], { type: "data:application/json" });
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = "export.json";
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
    }
}