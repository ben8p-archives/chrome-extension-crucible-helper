var events = {
	DB: 'newReviews',
	lastReviewCount: 0,
	
	installNotice: function() {
		if (localStorage.getItem('install_time')) {
			return;
		}

		var now = new Date().getTime();
		localStorage.setItem('install_time', now);
		chrome.tabs.create({
			url: 'chrome://extensions/?options=' + chrome.runtime.id
		});
	},
	
	launch: function() {
		events.installNotice();	
		
		chrome.notifications.onClicked.addListener(function () {
			crucible.getCredentials().then(function() {
				chrome.tabs.create({url: crucible.API_ROOT});
			});
		});
		chrome.alarms.onAlarm.addListener(function() {
			chrome.storage.local.get(events.DB, events.showNotifications);
		});
		
		chrome.alarms.create("crucible", {delayInMinutes: 0.1, periodInMinutes: 10});
	},
	showNotifications: function(storedData) {
		crucible.getCredentials().then(function() {
			if(!crucible.MYSELF || !crucible.PASSWORD) { return; }
			
			crucible.getReviewsToDo().then(function(reviewIds) {
				if(events.lastReviewCount !== reviewIds.length) {
					events.lastReviewCount = reviewIds.length;
					if(reviewIds.length > 0) {
						chrome.notifications.create('reminder', {
							type: 'basic',
							iconUrl: 'icon.png',
							title: chrome.i18n.getMessage('dontforget'),
							message: chrome.i18n.getMessage('reviewsToDo', reviewIds.length.toString())
						}, function(notificationId) {});
					}
				}
			});
			crucible.getAllReviewsUserParticipatedTo(crucible.MYSELF, true).then(crucible.getReviewsWithUnreadComments).then(function(reviewIds) {
				chrome.browserAction.setBadgeText({text: (reviewIds.length ? reviewIds.length : '').toString()});
			});
			
		});
	}
}

events.launch();