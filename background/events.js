require([
	'../module/crucible',
	'../module/settings',
	'../module/notification'
], function(crucible, settings, notification) {
	// summary:
	//		long running script closure

	var chrome = window.chrome;

	function openSettingsAfterIntall() {
		// summary:
		//		Check if the settings page should be open (after install)
		if(localStorage.getItem('installTime')) {
			return;
		}

		var now = (new Date()).getTime();
		localStorage.setItem('installTime', now);
		settings.open();
	}

	function showNotifications() {
		// summary:
		//		show a chrome notification
		crucible.getCredentials().then(function(credentials) {
			if(!credentials.user || !credentials.password) { return; }

			crucible.getReviewsToDo().then(function(reviewIds) {
				var lastReviewCount = localStorage.getItem('lastReviewCount');
				if(lastReviewCount !== reviewIds.length) {
					localStorage.setItem('lastReviewCount', reviewIds.length);
					if(reviewIds.length > 0) {
						notification.open(chrome.i18n.getMessage('dontForget'), chrome.i18n.getMessage('reviewsToDo', reviewIds.length.toString()));
					}
				}
				chrome.storage.local.set({
					toReview: reviewIds,
					loading: false
				}, function() { return true; });
			});
			crucible.getAllReviewsUserParticipatedTo(credentials.user, true).then(crucible.getReviewsWithUnreadComments).then(function(reviewIds) {
				chrome.browserAction.setBadgeText({text: (reviewIds.length || '').toString()});

				chrome.storage.local.set({
					comments: reviewIds,
					loading: false
				}, function() { return true; });
			});

		});
	}

	function init() {
		// summary:
		//		Init the long running script

		openSettingsAfterIntall();
		chrome.storage.local.set({
			nextPollIn: 0,
			loading: true
		}, function() { return true; });

		chrome.alarms.onAlarm.addListener(function() {
			chrome.storage.local.get({
				nextPollIn: 0
			}, function(items) {
				if(items.nextPollIn <= 0) {
					chrome.storage.local.set({
						nextPollIn: 10
					}, function() { return true; });
					showNotifications();
				} else {
					chrome.storage.local.set({
						nextPollIn: --items.nextPollIn
					}, function() { return true; });
				}
			});
		});

		chrome.alarms.create('events', {delayInMinutes: 0.1, periodInMinutes: 1});
	}

	init();
});