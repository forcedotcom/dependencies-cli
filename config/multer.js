/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const multer  = require('multer');

const diskStorageToUploads = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

const saveToUploads = multer({storage: diskStorageToUploads});

module.exports = {
    saveToUploads: saveToUploads.single('file')
}