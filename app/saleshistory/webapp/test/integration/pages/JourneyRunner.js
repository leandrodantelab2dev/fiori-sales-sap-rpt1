sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"saleshistory/test/integration/pages/SalesHistoryList",
	"saleshistory/test/integration/pages/SalesHistoryObjectPage"
], function (JourneyRunner, SalesHistoryList, SalesHistoryObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('saleshistory') + '/test/flp.html#app-preview',
        pages: {
			onTheSalesHistoryList: SalesHistoryList,
			onTheSalesHistoryObjectPage: SalesHistoryObjectPage
        },
        async: true
    });

    return runner;
});

