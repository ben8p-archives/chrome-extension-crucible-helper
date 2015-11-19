define([
], function() {
	// summary:
	//		dom manipulation closure

	return {
		hide: function(node, state) {
			// summary:
			//		hide/show a node
			if(state) {
				node.className += ' hidden';
			} else {
				node.className = node.className.replace(/hidden/g, '');
			}
		}
	};});