// Saves options to chrome.storage
var options = {
	saveOptions: function() {
		var restUrl = document.getElementById('restUrl').value;
		var user = document.getElementById('user').value;
		var password = document.getElementById('password').value;
		var admin = document.getElementById('switchadmin').checked;
		
		chrome.storage.sync.set({
			restUrl: restUrl,
			user: user,
			password: password,
			admin: admin
		}, function() {
			// Update status to let user know options were saved.
			var status = document.getElementById('status');
			status.textContent = chrome.i18n.getMessage("saved");
			setTimeout(function() {
				status.textContent = '';
			}, 750);
		});
	},

	// Restores select box and checkbox state using the preferences
	// stored in chrome.storage.
	onLoad: function() {
		document.getElementById('save').addEventListener('click', options.saveOptions);
		chrome.storage.sync.get({
			restUrl: 'https://itrf-review.europe.intranet:8043/',
			user: '',
			password: '',
			admin: false
		}, function(items) {
			document.getElementById('restUrl').value = items.restUrl;
			document.getElementById('user').value = items.user;
			document.getElementById('password').value = items.password;
			if(items.admin) {
				document.getElementById('switchadmin').checked = true;
				document.getElementById('switchadminmain').className += ' is-checked'
			}
		});
		
	}
}
document.addEventListener('DOMContentLoaded', options.onLoad);