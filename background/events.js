require([
	'../module/crucible',
	'../module/settings',
	'../module/notification',
	'../module/loading',
	'../module/CONSTANTS'
], function(crucible, settings, notification, loading, CONSTANTS) {
	// summary:
	//		long running script closure

	var chrome = window.chrome,
		lastReviewCount = -1;

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

			loading.update(true);

			crucible.getReviewsToDo().then(function(reviewIds) {
				if(lastReviewCount !== reviewIds.length) {
					lastReviewCount = reviewIds.length;
					if(reviewIds.length > 0) {
						notification.open(chrome.i18n.getMessage('dontForget'), chrome.i18n.getMessage('reviewsToDo', reviewIds.length.toString()));
					}
				}
				chrome.storage.local.set({
					toReview: reviewIds
				}, function() { return true; });
				loading.update(false);
			});

			loading.update(true);

			crucible.getAllReviewsUserParticipatedTo(credentials.user, true).then(crucible.getReviewsWithUnreadComments).then(function(reviewIds) {
				chrome.browserAction.setBadgeText({text: (reviewIds.length || '').toString()});

				chrome.storage.local.set({
					comments: reviewIds
				}, function() { return true; });
				loading.update(false);
			});

		});
	}

	function onAlarmFired() {
		chrome.storage.local.get({
			nextPollIn: 0
		}, function(items) {
			if(items.nextPollIn <= 0) {
				chrome.storage.local.set({
					nextPollIn: CONSTANTS.POLL_EVERY
				}, function() { return true; });
				showNotifications();
			} else {
				chrome.storage.local.set({
					nextPollIn: --items.nextPollIn
				}, function() { return true; });
			}
		});
	}

	function onStorageChange(changes) {
		var key,
			settingHasChanged = false;
		for(key in changes) {
			if(changes.hasOwnProperty(key)) {
				if(key === 'crucibleRestUrl' || key === 'user' || key === 'password') {
					settingHasChanged = true;
				}
			}
		}
		if(settingHasChanged) {
			showNotifications();
		}
	}

	function init() {
		// summary:
		//		Init the long running script

		openSettingsAfterIntall();
		chrome.storage.local.set({
			nextPollIn: 0
		}, function() { return true; });

		chrome.alarms.onAlarm.addListener(onAlarmFired);

		chrome.alarms.create('events', {delayInMinutes: 1, periodInMinutes: 1});

		showNotifications();

		chrome.storage.onChanged.addListener(onStorageChange);
	}

	init();
});