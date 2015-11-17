var i18n = {
	localizeHtmlPage: function() {
		//Localize by replacing __MSG_***__ meta tags
		var objects = document.getElementsByTagName('*');
		for (var j = objects.length - 1; j > 0; j--) {
			var obj = objects[j];

			var valStrH = obj.innerHTML.toString();
			var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
				return v1 ? chrome.i18n.getMessage(v1) : "";
			});

			if(valNewH != valStrH) {
				obj.innerHTML = valNewH;
			}
		}
	}
}
document.addEventListener('DOMContentLoaded', i18n.localizeHtmlPage);