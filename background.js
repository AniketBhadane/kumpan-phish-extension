
// in manifest, persistent:false has been set, so this script will run only when needed (i.e. windows onCreated)

// set icon of extension depending on state

chrome.windows.onCreated.addListener(function() {
	chrome.storage.sync.get("state", function (data) {  // chrome.storage is async

	    if (typeof data.state === 'undefined') {
	        chrome.storage.sync.set({"state": "on"}, function() {
	          chrome.browserAction.setIcon({
		            path: "icon16.png"
				});
	        });  // async

	    } else {

	    	if(data.state == "on") {
	    		chrome.browserAction.setIcon({
		            path: "icon16.png"
				});
	    	}

	    	if(data.state == "off") {
	    		chrome.browserAction.setIcon({
		            path: "iconDisabled16.png"
				});
	    	}
	    }

	});

});