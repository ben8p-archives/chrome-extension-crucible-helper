define([
	'./crucible'
], function(crucible) {
	// summary:
	//		module managing internationalization in HTML pages
	//		Localize by replacing __MSG_***__ meta tags

	var chrome = window.chrome;

	chrome.notifications.onClicked.addListener(function() {
		crucible.getCredentials().then(function(credentials) {
			chrome.tabs.create({url: credentials.restUrl});
		});
	});

	return {
		open: function(title, message) {
			// summary:
			//		open a basic notification

			chrome.notifications.create('notification' + (new Date()).getTime(), {
				type: 'basic',
				iconUrl: 'icons/icon.png',
				title: title,
				message: message
			}, function() { return true; });
		}
	};

});