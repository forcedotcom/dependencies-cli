# dependencies-cli
Sample command line utilities around the [Salesforce Dependencies API](https://releasenotes.docs.salesforce.com/en-us/summer18/release-notes/rn_metadata_metadatacomponentdependency.htm). This API is currently in Pilot.

## Introduction : Dependency Grapher ##

![Graph](https://raw.githubusercontent.com/afawcett/dependencies-cli/master/img/example.png)

This command produces [DOT formatted](https://www.graphviz.org/doc/info/lang.html) output for dependencies in an org allowing you visualize the dependencies in the org (see below for an example). 

You can pass flags to it to filter down the output further, since in most orgs the output can be quite dense. You can then paste the output from this command into [this website](http://viz-js.com/) to see the results or install locally on your desktop one of the following.

- [GraphViz Commandline](https://www.graphviz.org/download/)
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=EFanZh.graphviz-preview)

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

## Example Output

```
digraph graphname {
  rankdir=RL;
  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];
  // Nodes
  X00h9A000000HBjAQAW [label=<Case (Marketing) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00N9A000000crDHUAY [label=<Account_Status<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X00h9A000000HBjBQAW [label=<Case (Sales) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h9A000000HBjCQAW [label=<Case (Support) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h9A000000HBjDQAW [label=<Case Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h9A000000HBjHQAW [label=<Account (Marketing) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00N9A000000crDCUAY [label=<Red<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X00h9A000000HBjIQAW [label=<Account (Sales) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h9A000000HBjJQAW [label=<Account (Support) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h9A000000HBjKQAW [label=<Account Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h9A000000HBkaQAG [label=<Close Case Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X3019A00000003OXQAY [label=<IsRed-1<BR/><FONT POINT-SIZE="8">Flow</FONT>>]
  X01p9A000000UQTIQA4 [label=<MyApexAction<BR/><FONT POINT-SIZE="8">ApexClass</FONT>>]
  XAccount [label=<Account<BR/><FONT POINT-SIZE="8">StandardEntity</FONT>>]
  // Paths
  X00h9A000000HBjAQAW->X00N9A000000crDHUAY
  X00h9A000000HBjBQAW->X00N9A000000crDHUAY
  X00h9A000000HBjCQAW->X00N9A000000crDHUAY
  X00h9A000000HBjDQAW->X00N9A000000crDHUAY
  X00h9A000000HBjHQAW->X00N9A000000crDCUAY
  X00h9A000000HBjIQAW->X00N9A000000crDCUAY
  X00h9A000000HBjJQAW->X00N9A000000crDCUAY
  X00h9A000000HBjKQAW->X00N9A000000crDCUAY
  X00h9A000000HBkaQAG->X00N9A000000crDHUAY
  X00N9A000000crDHUAY->X00N9A000000crDCUAY
  X3019A00000003OXQAY->X00N9A000000crDCUAY
  X01p9A000000UQTIQA4->X00N9A000000crDCUAY
  X01p9A000000UQTIQA4->XAccount
  X3019A00000003OXQAY->X01p9A000000UQTIQA4
}
```
