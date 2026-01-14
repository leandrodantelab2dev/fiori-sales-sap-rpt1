sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"salesprediction/test/integration/pages/SalesPredictionList",
	"salesprediction/test/integration/pages/SalesPredictionObjectPage"
], function (JourneyRunner, SalesPredictionList, SalesPredictionObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('salesprediction') + '/test/flp.html#app-preview',
        pages: {
			onTheSalesPredictionList: SalesPredictionList,
			onTheSalesPredictionObjectPage: SalesPredictionObjectPage
        },
        async: true
    });

    return runner;
});

