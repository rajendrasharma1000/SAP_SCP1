/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"cpl166ui/cpl166ui/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});