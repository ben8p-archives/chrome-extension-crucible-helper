define([
], function() {
	// summary:
	//		Crucible closure

	var chrome = window.chrome,
		api = {},
		API_ROOT = '',
		MYSELF = '',
		PASSWORD = '';

	function xhr(url, method, body) {
		// summary:
		//		perform a request to the api
		method = method || 'GET';
		return new Promise(function(resolve, reject) {
			var xhrObject = new XMLHttpRequest();

			xhrObject.addEventListener('load', function(response) {
				if(response.target.status === 404 || response.target.status === 401) {
					reject();
				} else {
					resolve(response.target.responseXML);
				}
			}, false);
			xhrObject.addEventListener('error', reject, false);

			xhrObject.open(method, url);
			xhrObject.setRequestHeader('Authorization', 'Basic ' + window.btoa(MYSELF + ':' + PASSWORD));
			xhrObject.setRequestHeader('Content-Type', 'application/xml');

			xhrObject.send(body || null);
		});
	}

	api = {
		getOpenReviewsOlderThan: function(date) {
			// summary:
			//		retrieve reviews older than a certain date
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/filter/allOpenReviews/details';
				xhr(url).then(function(data) {
					var olderList = [].slice.call(data.querySelectorAll('detailedReviewData')).filter(function(node) {
						var createDate = new Date(node.querySelectorAll('createDate')[0].textContent);
						return createDate.getTime() < date.getTime();
					});

					resolve(olderList.map(function(node) {
						return node.querySelectorAll('permaId>id')[0].textContent;
					}));
				}, reject);
			});
		},

		getAllReviewsUserParticipatedTo: function(user, activeOnly) {
			// summary:
			//		retrieve all reviews a user as participated to
			user = user.toLowerCase();
			var states = 'Approval,Review,Summarize,Unknown';
			if(activeOnly !== true) {
				states += ',Draft,Closed,Dead,Rejected';
			}
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/filter/details?author=' + user + '&moderator=' + user + '&creator=' + user + '&reviewer=' + user + '&orRoles=true&states=' + states;
				xhr(url).then(function(data) {
					if(!data) {
						console.warn('ERROR with user:', user);
						resolve(null);
					} else {
						resolve([].slice.call(data.querySelectorAll('detailedReviewData>permaId>id')).map(function(node) {
							return node.textContent;
						}));
					}
				}, reject);
			});
		},

		getReviewsFromUser: function(user) {
			// summary:
			//		Get all reviews when user is the author
			user = user.toLowerCase();
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/filter/details?author=' + user;
				xhr(url).then(function(data) {
					resolve([].slice.call(data.querySelectorAll('detailedReviewData>permaId>id')).map(function(node) {
						return node.textContent;
					}));
				}, reject);
			});
		},

		getReviewsToDo: function() {
			// summary:
			//		get all reviews a user has to do
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/filter/toReview';
				xhr(url).then(function(data) {
					resolve([].slice.call(data.querySelectorAll('reviewData>permaId>id')).map(function(node) {
						return node.textContent;
					}));
				}, reject);
			});
		},

		hasUnreadComments: function(reviewId) {
			// summary:
			//		return the amount of unread comments for a certain review
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/' + reviewId + '/comments';
				xhr(url).then(function(data) {
					var hasUnread = [].slice.call(data.querySelectorAll('readStatus')).filter(function(node) {
						return node.textContent.indexOf('UNREAD') >= 0;
					});
					resolve(hasUnread.length);
				}, reject);
			});
		},

		getReviewsWithUnreadComments: function(reviewIds, promise, resolve, reject, reviewsWithUnreadComments) {
			// summary:
			//		retrieve all reviews with unread comments. Same review can appear multiple time (1 time per comment)
			if(!promise) {
				promise = new Promise(function(pResolve, pReject) {
					resolve = pResolve;
					reject = pReject;
				});
				reviewsWithUnreadComments = [];
			}
			if(reviewIds.length === 0) {
				resolve(reviewsWithUnreadComments);
			} else {
				var id = reviewIds.pop(),
					i;
				api.hasUnreadComments(id).then(function(hasUnread) {
					if(hasUnread) {
						for(i = 0; i < hasUnread; i++) {
							reviewsWithUnreadComments.push(id);
						}
					}
					api.getReviewsWithUnreadComments(reviewIds, promise, resolve, reject, reviewsWithUnreadComments);
				}, reject);
			}
			return promise;
		},

		summarizeAndCloseAllReview: function(reviewIds, promise, resolve, reject) {
			// summary:
			//		Summarize and close all given reviews
			if(!promise) {
				promise = new Promise(function(pResolve, pReject) {
					resolve = pResolve;
					reject = pReject;
				});
			}
			if(reviewIds.length === 0) {
				resolve();
			} else {
				var id = reviewIds.pop();
				api.addMeAsReviewer(id).then(function() {
					api.summarizeReview(id).then(function() {
						api.closeReview(id).then(function() {
							api.summarizeAndCloseAllReview(reviewIds, promise, resolve, reject);
						}, reject);
					}, reject);
				}, reject);
			}
			return promise;
		},

		summarizeReview: function(reviewId) {
			// summary:
			//		summarize a riview
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/' + reviewId + '/transition?action=action:summarizeReview';
				xhr(url, 'POST').then(resolve, reject);
			});
		},

		closeReview: function(reviewId) {
			// summary:
			//		close a review
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/' + reviewId + '/close';
				xhr(url, 'POST', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><closeReviewSummary><summary>Automatic close</summary></closeReviewSummary>').then(resolve, reject);
			});
		},
		addMeAsReviewer: function(reviewId) {
			// summary:
			//		Add current user as reviewer
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/reviews-v1/' + reviewId + '/reviewers';
				xhr(url, 'POST', MYSELF).then(resolve, reject);
			});
		},

		getAllUsers: function() {
			// summary:
			//		retrieve all crucible users
			return new Promise(function(resolve, reject) {
				var url = API_ROOT + 'rest-service/users-v1';
				xhr(url).then(function(data) {
					resolve([].slice.call(data.querySelectorAll('userData>userName')).map(function(node) {
						return node.textContent;
					}));
				}, reject);
			});
		},

		getInactiveUsers: function(users, promise, resolve, reject, innactiveUsers) {
			// summary:
			//		retrieve all crucible users whom never participated in any review
			if(!promise) {
				promise = new Promise(function(pResolve, pReject) {
					resolve = pResolve;
					reject = pReject;
				});
				innactiveUsers = [];
			}
			if(users.length === 0) {
				resolve(innactiveUsers);
			} else {
				var user = users.pop();
				api.getAllReviewsUserParticipatedTo(user).then(function(data) {
					if(data !== null && !data.length) {
						innactiveUsers.push(user);
					}
					api.getInactiveUsers(users, promise, resolve, reject, innactiveUsers);
				}, reject);
			}
			return promise;
		},

		getCredentials: function() {
			// summary:
			//		retrieve credentials stored in chrome storage
			return new Promise(function(resolve, reject) {
				chrome.storage.sync.get({
					crucibleRestUrl: '',
					user: '',
					password: '',
					admin: false
				}, function(items) {
					if(!items.crucibleRestUrl || !items.user || !items.password) {
						reject();
					} else {
						API_ROOT = items.crucibleRestUrl + (items.crucibleRestUrl.substr(-1) !== '/' ? '/' : '');
						MYSELF = items.user;
						PASSWORD = items.password;
						resolve({
							user: items.user,
							password: items.password,
							isAdmin: items.admin,
							restUrl: API_ROOT
						});
					}
				});
			});
		}
	};
	return api;
});
