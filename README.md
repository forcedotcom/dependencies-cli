# dependencies-cli
Sample command line utilities around the [Salesforce Dependencies API](https://releasenotes.docs.salesforce.com/en-us/summer18/release-notes/rn_metadata_metadatacomponentdependency.htm). This API is currently in Pilot.

## Introduction : Dependency Grapher ##

![Graph](https://raw.githubusercontent.com/afawcett/dependencies-cli/master/img/example2.png)

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

2) Install the plugin via npm

```
sfdx plugins:install dependencies-cli
```

3) Run the command:

```
sfdx andyinthecloud:dependencies:report -u [alias|username]
```

## Example Output

```
digraph graphname {
  rankdir=RL;
  node[shape=Mrecord, bgcolor=black, fillcolor=lightblue, style=filled];
  // Nodes
  X00h11000000s7oIAAQ [label=<Case (Support) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00b11000000S28TAAS [label=<Up-sell / Cross-sell Opportunity<BR/><FONT POINT-SIZE="8">WebLink</FONT>>]
  X00h11000000s7oJAAQ [label=<Case Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7oNAAQ [label=<Account (Marketing) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00b11000000S28SAAS [label=<Billing<BR/><FONT POINT-SIZE="8">WebLink</FONT>>]
  X00N11000002qGqQEAU [label=<Account.Contract<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X00N11000002q9aoEAA [label=<Account.formula1<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X00N11000002pkkvEAA [label=<Account.Red<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X00h11000000s7oOAAQ [label=<Account (Sales) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7oPAAQ [label=<Account (Support) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7oQAAQ [label=<Account Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7oZAAQ [label=<Opportunity (Marketing) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00b11000000S28RAAS [label=<Delivery Status<BR/><FONT POINT-SIZE="8">WebLink</FONT>>]
  X00h11000000s7oaAAA [label=<Opportunity (Sales) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7obAAA [label=<Opportunity (Support) Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7ocAAA [label=<Opportunity Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000s7pfAAA [label=<Campaign Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00b11000000S28QAAS [label=<View Campaign Influence Report<BR/><FONT POINT-SIZE="8">WebLink</FONT>>]
  X00h11000000s7phAAA [label=<Contract Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00h11000000sB5RAAU [label=<CustomObject1 Layout<BR/><FONT POINT-SIZE="8">Layout</FONT>>]
  X00N11000002po9oEAA [label=<CustomObject1.Blue<BR/><FONT POINT-SIZE="8">CustomField</FONT>>]
  X03d110000006W4WAAU [label=<Contract.ContractRule<BR/><FONT POINT-SIZE="8">ValidationRule</FONT>>]
  X03d110000006W55AAE [label=<CustomObject1.IsBLueToo<BR/><FONT POINT-SIZE="8">ValidationRule</FONT>>]
  X03d110000006W50AAE [label=<Account.IsBLue<BR/><FONT POINT-SIZE="8">ValidationRule</FONT>>]
  X01I110000003zvLEAQ [label=<CustomObject1<BR/><FONT POINT-SIZE="8">CustomObject</FONT>>]
  // Paths
  X00h11000000s7oIAAQ->X00b11000000S28TAAS
  X00h11000000s7oJAAQ->X00b11000000S28TAAS
  X00h11000000s7oNAAQ->X00b11000000S28SAAS
  X00h11000000s7oNAAQ->X00N11000002qGqQEAU
  X00h11000000s7oNAAQ->X00N11000002q9aoEAA
  X00h11000000s7oNAAQ->X00N11000002pkkvEAA
  X00h11000000s7oOAAQ->X00N11000002q9aoEAA
  X00h11000000s7oOAAQ->X00N11000002pkkvEAA
  X00h11000000s7oOAAQ->X00N11000002qGqQEAU
  X00h11000000s7oOAAQ->X00b11000000S28SAAS
  X00h11000000s7oPAAQ->X00N11000002pkkvEAA
  X00h11000000s7oPAAQ->X00b11000000S28SAAS
  X00h11000000s7oPAAQ->X00N11000002qGqQEAU
  X00h11000000s7oPAAQ->X00N11000002q9aoEAA
  X00h11000000s7oQAAQ->X00b11000000S28SAAS
  X00h11000000s7oQAAQ->X00N11000002pkkvEAA
  X00h11000000s7oQAAQ->X00N11000002qGqQEAU
  X00h11000000s7oQAAQ->X00N11000002q9aoEAA
  X00h11000000s7oZAAQ->X00b11000000S28RAAS
  X00h11000000s7oaAAA->X00b11000000S28RAAS
  X00h11000000s7obAAA->X00b11000000S28RAAS
  X00h11000000s7ocAAA->X00b11000000S28RAAS
  X00h11000000s7pfAAA->X00b11000000S28QAAS
  X00h11000000s7phAAA->X00N11000002qGqQEAU
  X00h11000000sB5RAAU->X00N11000002po9oEAA
  X03d110000006W4WAAU->X00N11000002pkkvEAA
  X03d110000006W55AAE->X00N11000002po9oEAA
  X03d110000006W50AAE->X00N11000002po9oEAA
  X03d110000006W50AAE->X01I110000003zvLEAQ
  X00N11000002q9aoEAA->X00N11000002pkkvEAA
}
```
