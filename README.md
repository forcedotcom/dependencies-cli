# dependencies-cli
Sample command line utilities around the [Salesforce Dependencies API](https://releasenotes.docs.salesforce.com/en-us/summer18/release-notes/rn_metadata_metadatacomponentdependency.htm). This API is currently in Pilot.

## Setup and Use

**NOTE:** This command will in due course be published to NPM and thus unless you wish to contribute to the code for this plugin you will not need to perform the following steps. Meanwhile if you want to give it a go please feel free to install the command as follows.

1) Make sure you have the latest Salesforce CLI:

```
sfdx update
```

2) Clone the repository:

```
git clone git@github.com:afawcett/dependencies-cli.git && cd dependencies-cli
```

3) Link the plugin:

```
sfdx plugins:link .
```

4) Run the command:

```
sfdx andyinthecloud:depends -u [alias|username]
```