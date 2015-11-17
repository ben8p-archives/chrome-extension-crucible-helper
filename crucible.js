//to use on the page https://itrf-review.europe.intranet:8043/
var crucible = {
	xhr: function(url, method, body) {
		method = method || 'GET';
		return new Promise(function(resolve, reject) {
			var xhr = new XMLHttpRequest();
			
			xhr.addEventListener("load", function(response) {
				if(response.target.status === 404 || response.target.status === 401) {
					reject();
				} else {
					resolve(response.target.responseXML);
				}
			}, false);
			xhr.addEventListener("error", reject, false);
			
			xhr.open(method, url);
			xhr.setRequestHeader('Authorization', 'Basic ' + btoa(crucible.MYSELF + ':' + crucible.PASSWORD));
			xhr.setRequestHeader("Content-Type", "application/xml");
			
			xhr.send(body || null);
		});
	},

	getOpenReviewsOlderThan: function(date) {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/filter/allOpenReviews/details";
			crucible.xhr(url).then(function(data) {
				var olderList = [].slice.call(data.querySelectorAll("detailedReviewData")).filter(function(node){
					createDate = new Date(node.querySelectorAll('createDate')[0].textContent);
					return createDate.getTime() < date.getTime();
				});
				
				resolve(olderList.map(function(node){
					return node.querySelectorAll("permaId>id")[0].textContent;
				}));
			}, reject);
		});	
	},

	getAllReviewsUserParticipatedTo: function(user, activeOnly) {
		user = user.toLowerCase();
		var states = 'Approval,Review,Summarize,Unknown';
		if(activeOnly !== true) {
			states += ',Draft,Closed,Dead,Rejected'
		}
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/filter/details?author=" + user + "&moderator=" + user + "&creator=" + user + "&reviewer=" + user + "&orRoles=true&states=" + states;
			crucible.xhr(url).then(function(data) {
				if(!data) { 
					console.warn('ERROR with user:', user);
					resolve(null);
				} else {
					resolve([].slice.call(data.querySelectorAll("detailedReviewData>permaId>id")).map(function(node){
						return node.textContent;
					}));
				}
			}, reject);
		});
	},
	getReviewsFromUser: function(user) {
		user = user.toLowerCase();
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/filter/details?author=" + user;
			crucible.xhr(url).then(function(data) {
				resolve([].slice.call(data.querySelectorAll("detailedReviewData>permaId>id")).map(function(node){
					return node.textContent;
				}));
			}, reject);
		});	
	},
	getReviewsToDo: function() {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/filter/toReview";
			crucible.xhr(url).then(function(data) {
				resolve([].slice.call(data.querySelectorAll("reviewData>permaId>id")).map(function(node){
					return node.textContent;
				}));
			}, reject);
		});	
	},

	hasUnreadComments: function(reviewId) {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/" + reviewId + "/comments";
			crucible.xhr(url).then(function(data) {
				var hasUnread = [].slice.call(data.querySelectorAll("readStatus")).filter(function(node){
					return node.textContent.indexOf('UNREAD') >= 0;
				})
				resolve(hasUnread.length);
			}, reject);
		});	
	},

	getReviewsWithUnreadComments: function(reviewIds, promise, resolve, reject, reviewsWithUnreadComments) {
		if(!promise) {
			promise = new Promise(function(pResolve, pReject) {
				resolve = pResolve;
				reject = pReject;
			});
			reviewsWithUnreadComments = [];
		}
		if(reviewIds.length == 0) {
			resolve(reviewsWithUnreadComments);
		} else {
			var id = reviewIds.pop();
			crucible.hasUnreadComments(id).then(function(hasUnread) {
				if(hasUnread) {
					for(var i = 0; i < hasUnread; i++) {
						reviewsWithUnreadComments.push(id);
					};
				}
				crucible.getReviewsWithUnreadComments(reviewIds, promise, resolve, reject, reviewsWithUnreadComments);
			}, reject);
		}
		return promise;	
	},

	sumarizeAndCloseAllReview: function(reviewIds, promise, resolve, reject) {
		if(!promise) {
			promise = new Promise(function(pResolve, pReject) {
				resolve = pResolve;
				reject = pReject;
			});
		}
		if(reviewIds.length == 0) {
			resolve();
		} else {
			var id = reviewIds.pop();
			crucible.addMeAsReviewer(id).then(function() {
				crucible.summarizeReview(id).then(function() {
					crucible.closeReview(id).then(function() {
						crucible.sumarizeAndCloseAllReview(reviewIds, promise, resolve, reject);
					}, reject);
				}, reject);
			}, reject);
		}
		return promise;	
	},

	summarizeReview: function(reviewId) {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/" + reviewId + "/transition?action=action:summarizeReview";
			crucible.xhr(url, 'POST').then(resolve, reject);
		});	
	},

	closeReview: function(reviewId) {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/" + reviewId + "/close";
			crucible.xhr(url, 'POST', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><closeReviewSummary><summary>Close because dev is gone</summary></closeReviewSummary>').then(resolve, reject);
		});	
	},
	addMeAsReviewer: function(reviewId) {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/reviews-v1/" + reviewId + "/reviewers";
			crucible.xhr(url, 'POST', crucible.MYSELF).then(resolve, reject);
		});	
	},

	getAllUsers: function() {
		return new Promise(function(resolve, reject) {
			var url = crucible.API_ROOT + "rest-service/users-v1";
			crucible.xhr(url).then(function(data) {
				resolve([].slice.call(data.querySelectorAll("userData>userName")).map(function(node){
					return node.textContent;
				}));
			}, reject);
		});
	},

	getInactiveUsers: function(users, promise, resolve, reject, innactiveUsers) {
		if(!promise) {
			promise = new Promise(function(pResolve, pReject) {
				resolve = pResolve;
				reject = pReject;
			});
			innactiveUsers = [];
		}
		if(users.length == 0) {
			resolve(innactiveUsers);
		} else {
			var user = users.pop();
			crucible.getAllReviewsUserParticipatedTo(user).then(function(data) {
				if(data !== null && !data.length) {
					innactiveUsers.push(user);
				}
				crucible.getInactiveUsers(users, promise, resolve, reject, innactiveUsers);
			}, reject);
		}
		return promise;	
	},

	API_ROOT: '',
	MYSELF: '',
	PASSWORD: '',
	ADMIN: false,
	
	getCredentials: function() {
		return new Promise(function(resolve, reject) {
			chrome.storage.sync.get({
				restUrl: '',
				user: '',
				password: '',
				admin: false
			}, function(items) {
				if(!items.restUrl || !items.user || !items.password) {
					reject();
				} else {
					crucible.API_ROOT = items.restUrl + (items.restUrl.substr(-1) !== '/' ? '/' : '');
					crucible.MYSELF = items.user;
					crucible.PASSWORD = items.password;
					crucible.ADMIN = items.admin;
					resolve();
				}
			});
		});
	}
}
