
/**
 * Content script currently only used to communicate extension state on off message to injected outlook.js
 * Sends back response to extension (popup.js) after sending message to injected outlook.js
 */

$(function(){

	// localStorage is different from chrome.storage
	// localStorage for injected script, and chrome.storage for extension script (popup.js) and contentscript.js

	chrome.storage.sync.get("state", function (data) {

		if (typeof data.state === 'undefined') {
	    	chrome.storage.sync.set({"state": "on"}, function() {});	// async
		}

	    //console.log("Kumpan Content Script State: " + data.state);
	});

	//alert("okay");

	// message from extension script to this content script.
	// will be used to receive enable disable messages
	// sends response in 'status' variable
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
		//console.log(sender.tab ?
		  //          "content script receiving message from a content script:" + sender.tab.url :
		  //          "content script receiving message from the extension");

		if (request.toggle === true) {
			chrome.storage.sync.set({"state": "on"}, function() { /*console.log("Kumpan Content Script State Updated: on");*/ });	// async
			var data = {
			    kumpan_state: "on"
			};
			document.dispatchEvent(new CustomEvent("coep_kumpan_state_message", {detail: data}));
			// cannot return state in function since above .set is async and popup.js does not receive the response
			sendResponse({state: "on"});
		} else if (request.toggle === false) {
			chrome.storage.sync.set({"state": "off"}, function() { /*console.log("Kumpan Content Script State Updated: off");*/ });	// async
			var data = {
			    kumpan_state: "off"
			};
			document.dispatchEvent(new CustomEvent("coep_kumpan_state_message", {detail: data}));
			sendResponse({state: "off"});
		} else {
			sendResponse({state: "error"});
		}

	});

});





