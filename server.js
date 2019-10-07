/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
var express = require('express');

var app = express();
var port = process.env.PORT || 8080;

const router = express.Router();

process.title = "mdapiGraph";

// Serve static files
app.use(express.static(__dirname + '/public'));

// Routes
var multerConfig = require("./config/multer");

router.post('/upload', multerConfig.saveToUploads, (req, res) => {
    return res.json("file uploaded successfully");
});

app.use(router);

// Serve your app
console.log('Served: http://localhost:' + port);
app.listen(port);