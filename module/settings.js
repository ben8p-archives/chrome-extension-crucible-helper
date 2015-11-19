define([
], function() {
	// summary:
	//		settings helper closure
	var chrome = window.chrome;

	return {
		open: function() {
			// summary:
			//		open settings screen
			chrome.tabs.create({
				url: 'chrome://extensions/?options=' + chrome.runtime.id
			});
		}
	};});