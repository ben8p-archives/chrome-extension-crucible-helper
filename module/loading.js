define([
], function() {
	// summary:
	//		loading closure

	var chrome = window.chrome;

	return {
		update: function(state) {
			// summary:
			//		set the loading state (according to the queue)

			chrome.storage.local.get({
				loading: 0
			}, function(items) {
				chrome.storage.local.set({
					loading: Math.max(0, items.loading + (state ? 1 : -1))
				}, function() { return true; });
			});

		},
		isLoading: function() {
			// summary:
			//		return a promise which resolve to true or false
			return new Promise(function(resolve) {
				chrome.storage.local.get({
					loading: 0
				}, function(items) {
					resolve(items.loading > 0);
				});
			});
		}
	};
});