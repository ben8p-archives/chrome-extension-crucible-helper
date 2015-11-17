var events = {
	
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
		localStorage.setItem('next_poll', 0);
		
		chrome.notifications.onClicked.addListener(function () {
			crucible.getCredentials().then(function() {
				chrome.tabs.create({url: crucible.API_ROOT});
			});
		});
		chrome.alarms.onAlarm.addListener(function() {
			var next = +(localStorage.getItem('next_poll') || 0);
			if(next === 0) {
				localStorage.setItem('next_poll', 10);
				events.showNotifications();
			} else {
				localStorage.setItem('next_poll', --next);
			}
		});
		
		chrome.alarms.create("crucible", {delayInMinutes: 0.1, periodInMinutes: 1});
	},
	showNotifications: function() {		
		crucible.getCredentials().then(function() {
			if(!crucible.MYSELF || !crucible.PASSWORD) { return; }
			
			crucible.getReviewsToDo().then(function(reviewIds) {
				var lastReviewCount = localStorage.getItem('lastReviewCount');
				if(lastReviewCount !== reviewIds.length) {
					localStorage.setItem('lastReviewCount', reviewIds.length);
					if(reviewIds.length > 0) {
						chrome.notifications.create('reminder', {
							type: 'basic',
							iconUrl: 'icon.png',
							title: chrome.i18n.getMessage('dontforget'),
							message: chrome.i18n.getMessage('reviewsToDo', reviewIds.length.toString())
						}, function(notificationId) {});
					}
					chrome.storage.local.set({
						toReview: reviewIds
					}, function() {});
				}
			});
			crucible.getAllReviewsUserParticipatedTo(crucible.MYSELF, true).then(crucible.getReviewsWithUnreadComments).then(function(reviewIds) {
				chrome.browserAction.setBadgeText({text: (reviewIds.length ? reviewIds.length : '').toString()});
				
				chrome.storage.local.set({
					comments: reviewIds
				}, function() {});
			});
			
		});
	}
}

events.launch();