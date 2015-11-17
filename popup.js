var popup = {
	hasError: function() {	
		popup.hidden(document.getElementById('error'), false);
		popup.hidden(document.getElementById('content'), true);
		popup.loading(false);
	},
	
	loading: function(state) {
		popup.hidden(document.getElementById('progress'), !state);
	},
	hidden: function(node, state) {
		if(state) {
			node.className += ' hidden';
		} else {
			node.className = node.className.replace(/hidden/g, '');
		}
	},
	onLoad: function() {
		crucible.getCredentials().then(function() {
			if(crucible.ADMIN) {
				popup.loading(true);
				crucible.getAllUsers().then(function(usernames) {
					usernames.forEach(function(username) {
						var option = document.createElement('option');
						option.value = option.innerHTML = username;
						document.getElementById('userlist').appendChild(option);
						popup.loading(false);
					});
					document.getElementById('delete').addEventListener('click', popup.deleteUser);
				}, popup.hasError);
				
				document.getElementById('listinactiveusers').addEventListener('click', popup.listInactiveUsers);
				document.getElementById('delete3month').addEventListener('click', popup.delete3month);
			}
			popup.hidden(document.getElementById('onlyadmin'), crucible.ADMIN);
			popup.hidden(document.getElementById('foradmin'), !crucible.ADMIN);

			popup.listReviewsToDo();
			popup.listCommentsToRead();
			popup.pollRefresh();
			
		}, popup.openSettings);
	},
	
	openSettings: function() {
		chrome.tabs.create({
			url: 'chrome://extensions/?options=' + chrome.runtime.id
		});
	},
	
	pollRefresh: function() {
		var previousRun = localStorage.getItem('next_poll');
		var refresh = function() {
			var minutes = (localStorage.getItem('next_poll') || 0).toString();
			if(previousRun !== minutes) {
				popup.loading(false);
				previousRun = minutes;
			}
			document.getElementById('nextRefresh').innerHTML = chrome.i18n.getMessage('nextrefresh', minutes);
		};
		
		document.getElementById('manuelrefresh').addEventListener('click', function() {
			localStorage.setItem('next_poll', 0);
			previousRun = '0';
			popup.loading(true);
			refresh();
		});
		
		refresh();
		setInterval(refresh, 30000);
	},
	
	getDate3MonthAgo: function() {
		var threeMonthAgo = new Date();
		threeMonthAgo.setMonth(threeMonthAgo.getMonth() - 3);
		return threeMonthAgo;
	},

	delete3month: function() {
		popup.loading(true);
		crucible.getCredentials().then(function() {
			crucible.getOpenReviewsOlderThan(popup.getDate3MonthAgo()).then(crucible.sumarizeAndCloseAllReview).then(function() {
				alert(chrome.i18n.getMessage('cleanup3monthdone'));
				popup.loading(false);
			}, popup.hasError);
		}, popup.hasError);
	},
	
	deleteUser: function() {
		var user = document.getElementById('userlist').value;
		if(user) {
			popup.loading(true);
			crucible.getCredentials().then(function() {
				crucible.getReviewsFromUser(user).then(crucible.sumarizeAndCloseAllReview).then(function() {
					alert(chrome.i18n.getMessage('deletableuser', user));
					popup.loading(false);
				}, popup.hasError);
			}, popup.hasError);
		}
	},
	
	listReviewsToDo: function() {
		popup.loading(true);
		
		chrome.storage.sync.get({
			restUrl: ''
		}, function(syncItems) {
			chrome.storage.local.get({
				toReview: []
			}, function(items) {
				var template = '<tr> \
									<td class="mdl-data-table__cell--non-numeric"><a href="$url$" target="_reviews">$reviewId$</a></td> \
								</tr>';
				var tbody = [];
				
				items.toReview.forEach(function(reviewId) {
					var url = syncItems.restUrl + 'cru/' + reviewId;
					tbody.push(template.replace(/\$reviewId\$/g, reviewId).replace(/\$url\$/g, url));
				});
				if(tbody.length) {
					document.getElementById('reviewtodotbody').innerHTML = tbody.join('');
				}
				popup.loading(false);
			});
		});
	},
	
	listCommentsToRead: function() {
		popup.loading(true);
		
		chrome.storage.sync.get({
			restUrl: ''
		}, function(syncItems) {
			chrome.storage.local.get({
				comments: []
			}, function(items) {
				var template = '<tr> \
									<td class="mdl-data-table__cell--non-numeric"><a href="$url$" target="_reviews">$reviewId$</a></td> \
								</tr>';
				var tbody = [];
				var previous = null;
				items.comments.forEach(function(reviewId) {
					if(previous === reviewId) {
						return;
					}
					previous = reviewId;
					var url = syncItems.restUrl + 'cru/' + reviewId;
					tbody.push(template.replace(/\$reviewId\$/g, reviewId).replace(/\$url\$/g, url));
				});
				if(tbody.length) {
					document.getElementById('commentstoreadtbody').innerHTML = tbody.join('');			
				}
				popup.loading(false);
			});
		});
	},
	
	
	listInactiveUsers: function() {
		popup.loading(true);
		crucible.getCredentials().then(crucible.getAllUsers).then(crucible.getInactiveUsers).then(function(users) { 
			var template = '<tr> \
								<td class="mdl-data-table__cell--non-numeric">$user$</td> \
							</tr>';
			var tbody = [];
			users.forEach(function(user) {
				tbody.push(template.replace(/\$user\$/g, user));
			});
			document.getElementById('userlisttbody').innerHTML = tbody.join('');
			
			popup.hidden(document.getElementById('userlisttable'), false);
			
			popup.loading(false);
		}, popup.hasError);
	}
}
document.addEventListener('DOMContentLoaded', popup.onLoad);