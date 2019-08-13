//alert("inject");

/**
 * Inject jquery and outlook js files to DOM
 *
 * added jquery.min.js amd outlook.js to web_accessible_resources in manifest.json
 */

var s = document.createElement('script');
s.src = chrome.extension.getURL('jquery-3.2.1.min.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);


var s = document.createElement('script');
s.src = chrome.extension.getURL('outlook.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);


