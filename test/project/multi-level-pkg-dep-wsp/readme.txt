pkg E 			depends on 	pkgD

pkgD and pkgC 		depend on 	pkgA

pkgD 			depends on	pkgB

pkgB			depends on 	pkgA
----------
pkgB -> pkgA
pkgC -> pkgA
pkgD -> pkgA, pkgB
pkgE -> pkgA, pkgB, pkgC

