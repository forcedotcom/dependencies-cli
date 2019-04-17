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
    id: string;
    name: string;
    versionId: string;
    version: string;
};