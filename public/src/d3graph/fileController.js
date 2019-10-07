/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
class FileController {

    // get sample file
    static getSampleFile(path) {

        return new Promise(function (resolve, reject) {

            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    // The request is done; did it work?
                    if (xhr.status == 200) {
                        // return file
                        resolve(xhr.response);
                    } else {
                        reject(Error(xmlHttp.statusText));
                    }
                }
            };

            xhr.open("GET", path);

            xhr.send();
        });
    };

    // load file functions
    static handleFileSelect(evt) {

        // handle the regular file dialog
        var file = evt.target.files[0]; // Single file object requested only
        var url = evt.target.baseURI + "upload";

        if (file == null) {
            file = evt.data.sampleFile;
        }

        return new Promise(function (resolve, reject) {

            let formData = new FormData();
            formData.append('file', file);

            // upload file to server via POST
            var xmlHttp = new XMLHttpRequest();

            xmlHttp.open('POST',
                url,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            // read the file from local /uploads folder
            xmlHttp.onreadystatechange = function () {
                // xmlHttp.readyState == 4 && 
                if (xmlHttp.status == 200) {

                    // return file
                    resolve(file);
                }
                else {
                    reject(Error(xmlHttp.statusText));
                }
            };

            xmlHttp.onerror = function () {
                reject(Error("Network Error"));
            }

            xmlHttp.send(formData);
        });
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