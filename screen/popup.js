require([
	'../module/i18n',
	'../module/crucible',
	'../module/dom',
	'../module/settings',
	'../module/notification',
	'../module/loading',
	'../module/CONSTANTS'
], function(dummyI18n, crucible, dom, settings, notification, loading, CONSTANTS) {
	// summary:
	//		popup page scripts

	var chrome = window.chrome,
		NONE_ROW = '<tr><td class="mdl-data-table__cell--non-numeric">' + chrome.i18n.getMessage('none') + '</td></tr>',
		REVIEW_ROW = '<tr><td class="mdl-data-table__cell--non-numeric"><a href="$url$" target="_reviews">$reviewId$</a></td></tr>',
		USER_ROW = '<tr><td class="mdl-data-table__cell--non-numeric">$user$</td></tr>';


	function showLoading() {
		loading.isLoading().then(function(state) {
			dom.hide(document.getElementById('progressMessage'), !state);
		});
	}

	function hasError() {
		dom.hide(document.getElementById('errorMessage'), false);
		dom.hide(document.getElementById('contentWrapper'), true);
		loading.update(false);
	}

	function refresh() {
		chrome.storage.local.get({
			nextPollIn: 0
		}, function(items) {
			var minutes = items.nextPollIn.toString();
			document.getElementById('nextRefreshMessage').innerHTML = chrome.i18n.getMessage('nextRefresh', minutes);
		});
	}

	function getDate3MonthAgo() {
		var threeMonthAgo = new Date();
		threeMonthAgo.setMonth(threeMonthAgo.getMonth() - 3);
		return threeMonthAgo;
	}

	function delete3MonthsReviews() {
		loading.update(true);
		crucible.getOpenReviewsOlderThan(getDate3MonthAgo()).then(crucible.summarizeAndCloseAllReview).then(function() {
			notification.open(chrome.i18n.getMessage('done'), chrome.i18n.getMessage('cleanupReviewsOlderThanThreeMonthsDone'));
			loading.update(false);
		}, hasError);
	}

	function deleteUser() {
		var user = document.getElementById('usersListInput').value;
		if(user) {
			loading.update(true);
			crucible.getReviewsFromUser(user).then(crucible.summarizeAndCloseAllReview).then(function() {
				notification.open(chrome.i18n.getMessage('done'), chrome.i18n.getMessage('userCanBeDeleted', user));
				loading.update(false);
			}, hasError);
		}
	}

	function listReviewsToDo() {
		loading.update(true);

		chrome.storage.sync.get({
			crucibleRestUrl: ''
		}, function(syncItems) {
			chrome.storage.local.get({
				toReview: []
			}, function(items) {
				var tbody = [];

				items.toReview.forEach(function(reviewId) {
					var url = syncItems.crucibleRestUrl + 'cru/' + reviewId;
					tbody.push(REVIEW_ROW.replace(/\$reviewId\$/g, reviewId).replace(/\$url\$/g, url));
				});
				document.getElementById('reviewsTodoListTableBody').innerHTML = tbody.length ? tbody.join('') : NONE_ROW;
				loading.update(false);
			});
		});
	}

	function listCommentsToRead() {
		loading.update(true);

		chrome.storage.sync.get({
			crucibleRestUrl: ''
		}, function(syncItems) {
			chrome.storage.local.get({
				comments: []
			}, function(items) {
				var tbody = [],
					previous = null;
				items.comments.forEach(function(reviewId) {
					if(previous === reviewId) {
						return;
					}
					previous = reviewId;
					var url = syncItems.crucibleRestUrl + 'cru/' + reviewId;
					tbody.push(REVIEW_ROW.replace(/\$reviewId\$/g, reviewId).replace(/\$url\$/g, url));
				});
				document.getElementById('commentsToReadyListTableBody').innerHTML = tbody.length ? tbody.join('') : NONE_ROW;
				loading.update(false);
			});
		});
	}


	function listInactiveUsers() {
		loading.update(true);
		crucible.getAllUsers().then(crucible.getInactiveUsers).then(function(users) {
			var tbody = [];
			users.forEach(function(user) {
				tbody.push(USER_ROW.replace(/\$user\$/g, user));
			});
			document.getElementById('usersListTableBody').innerHTML = tbody.length ? tbody.join('') : NONE_ROW;

			dom.hide(document.getElementById('usersListTable'), false);

			loading.update(false);
		}, hasError);
	}

	function onStorageChange(changes) {
		var key,
			storageChange;
		for(key in changes) {
			if(changes.hasOwnProperty(key)) {
				storageChange = changes[key];
				if(key === 'nextPollIn') {
					if(storageChange.newValue === 0) {
						loading.update(true);
					} else if(storageChange.newValue === CONSTANTS.POLL_EVERY) {
						loading.update(false);
					}
					refresh();
				} else if(key === 'toReview') {
					listReviewsToDo();
				} else if(key === 'comments') {
					listCommentsToRead();
				} else if(key === 'loading') {
					showLoading();
				}
			}
		}
	}

	function init() {
		crucible.getCredentials().then(function(credentials) {
			if(credentials.isAdmin) {
				loading.update(true);
				crucible.getAllUsers().then(function(usernames) {
					usernames.forEach(function(username) {
						var option = document.createElement('option');
						option.value = option.innerHTML = username;
						document.getElementById('usersListInput').appendChild(option);
						loading.update(false);
					});
					document.getElementById('deleteButton').addEventListener('click', deleteUser);
				}, hasError);

				document.getElementById('listInactiveUsersButton').addEventListener('click', listInactiveUsers);
				document.getElementById('delete3MonthsReviewsButton').addEventListener('click', delete3MonthsReviews);
			}

			dom.hide(document.getElementById('onlyForAdminMessage'), credentials.isAdmin);
			dom.hide(document.getElementById('onlyForAdminContent'), !credentials.isAdmin);
			dom.hide(document.getElementById('cleanupPanelLink'), !credentials.isAdmin);

			chrome.storage.onChanged.addListener(onStorageChange);
			document.getElementById('refreshButton').addEventListener('click', function() {
				chrome.storage.local.set({
					nextPollIn: 0
				}, function() { return true; });
			});

			showLoading();
			refresh();
			listReviewsToDo();
			listCommentsToRead();

		}, settings.open);
	}
	init();
});