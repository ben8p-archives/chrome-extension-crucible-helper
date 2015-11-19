require([
	'../module/i18n'
], function(dummyI18n) {
	// summary:
	//		option page scripts

	var chrome = window.chrome;

	function saveOptions() {
		// summary:
		//		Saves options to chrome.storage
		var crucibleRestUrl = document.getElementById('crucibleRestUrlInput').value,
			user = document.getElementById('crucibleUserInput').value,
			password = document.getElementById('cruciblePasswordInput').value,
			admin = document.getElementById('isAdminInput').checked;

		chrome.storage.sync.set({
			crucibleRestUrl: crucibleRestUrl,
			user: user,
			password: password,
			admin: admin
		}, function() {
			// Update status to let user know options were saved.
			var status = document.getElementById('saveStatusMessage');
			status.textContent = chrome.i18n.getMessage('saved');
			setTimeout(function() {
				status.textContent = '';
			}, 1500);
		});
	}

	// Restores select box and checkbox state using the preferences
	// stored in chrome.storage.
	function init() {
		document.getElementById('saveButton').addEventListener('click', saveOptions);
		chrome.storage.sync.get({
			crucibleRestUrl: 'https://itrf-review.europe.intranet:8043/',
			user: '',
			password: '',
			admin: false
		}, function(items) {
			document.getElementById('crucibleRestUrlInput').value = items.crucibleRestUrl;
			document.getElementById('crucibleUserInput').value = items.user;
			document.getElementById('cruciblePasswordInput').value = items.password;
			if(items.admin) {
				document.getElementById('isAdminInput').checked = true;
				document.getElementById('isAdminInputWrapper').className += ' is-checked';
			}
		});

	}


	init();
});
