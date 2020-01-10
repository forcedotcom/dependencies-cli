/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export interface Record {
    VersionId?: string;
}

export interface Package extends Record {
    Id: string;
    Path: string;
    Name: string;
    Namespace: string;
    VersionId: string;
    VersionName: string;
    VersionNumber: string;
}

export interface PackageDependency extends Record {
    Source: Package;
    Target: Package;
}

export interface SubscriberPackageVersion extends Record {
    Dependencies: Dependencies[];
}

export interface Dependencies extends Record {
    SubscriberPackageVersionId: string;
}

export type PackageNode = {
    id: String;
    type: String;
    name: String;
    namespace: String;
    path: String;
    versionId: String;
    versionNumber: String;
    versionName: String;
};