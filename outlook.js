//console.log("injected outlook script");

var user;

var interval_remove_div;
var interval;
//var interval_add_div;

var flag = 0;

var clicked_convId;

var canary;

var conversationDetails = [];

var curr_itemids = [];

/**
 * Event Listener to receive extension on off message from contentscript.js
 *
 * @param name of the event
 * @param callback function with incoming parameter
 */
document.addEventListener("coep_kumpan_state_message", function (event) {
    var data = event.detail.kumpan_state;

    if(typeof data !== 'undefined') {
    	localStorage["kumpan_state"] = data;
    	//console.log("Kumpan Inject State Updated: " + localStorage["kumpan_state"]);
    }
});

/**
 * Set up an observer for changes in title element. We're using this to get user email address.
 */
var target = document.querySelector('head > title');
var observer = new window.WebKitMutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        var str = mutation.target.textContent;
        user = str.split(" ")[2];	// "Mail - bhadaneap16.comp@coep.ac.in"
        //console.log('new title:' + user);
    });
});
observer.observe(target, { subtree: true, characterData: true, childList: true });

/**
 * Event listener to check when page DOM is ready
 *
 * @param name of the event
 * @param callback function
 */
document.addEventListener('DOMContentLoaded', function(event) {

	//console.log("outlook loaded");

	if (typeof localStorage["kumpan_state"] === 'undefined') {
		localStorage["kumpan_state"] = "on";
	}

	//console.log("Kumpan Inject State: " + localStorage["kumpan_state"]);

	canary = getCookie("X-OWA-CANARY");

	/*// just place a div at top right, remove this later, just used for testing
	var div = document.createElement('div');
	div.style.position = 'fixed';
	div.style.top = '100px';
	div.style.right = 0;
	div.textContent = 'Injected!';
	div.style.color = 'Red';
	document.body.appendChild(div);
	*/

	// div[autoid="_lvv_9"]
	$('body').on("click", "div[data-convid]", function(e) {

		clearInterval(interval_remove_div);
		clearInterval(interval);

		//console.clear();

		curr_itemids = [];

		var num = 0;
		interval_remove_div = setInterval(function(){
			if ( $('div[autoid="_rp_3"]').length ) {
				$('.kumpan-injected').remove();
				clearInterval(interval_remove_div);
		    }
		    num += 1;
		    if(num === 1000)	{
		        clearInterval(interval_remove_div);
		    }
	    }, 10);

		clicked_convId = 0;

		// get state from storage, if not on, then exit:
		if(localStorage["kumpan_state"] != "on") {
			return false;
		}

		flag = 0;

		clicked_convId = $(this).data("convid");
		//console.log("clicked convid: " + clicked_convId);

		var timesRun = 0;
		// recheck in loop while cliked_convid request's response is received and stored in conversationDetails array
		interval = setInterval(function(){

		    if(conversationDetails[clicked_convId] !== undefined && flag == 0) {

		    	flag = 1;
		    	//console.log("Conversation Details");
				//console.log(conversationDetails[clicked_convId]);

				var arr = conversationDetails[clicked_convId];

				//console.log("matched");

				var nodes = arr.Body.ResponseMessages.Items[0].Conversation.ConversationNodes;
				for(var i = 0; i < nodes.length; i++) {
					var node = nodes[i];

					var from_address = node.Items[0].From.Mailbox.EmailAddress;

					// system detects lateral spearphishing emails, not attack emails from outside.
					// in case of email from outside, just warn user to be cautious
					var idx = from_address.lastIndexOf('@');
					if (idx > -1 && from_address.slice(idx+1) === 'coep.ac.in') {	// mail from coep domain

						var email_body;

						if(node.Items[0].hasOwnProperty('UniqueBody')) {
							email_body = node.Items[0].UniqueBody.Value;
						} else {
							addToDOM_Error(i);
							continue;
						}

						var links = [];

						$(email_body).find('a').each(function() {

							if($.inArray($(this).attr('href'), links) === -1) {
								links.push( $(this).attr('href') );
							}

						});

						var result = email_body.match(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
						if(result) {
							for(var r = 0; r < result.length; r++) {

								if($.inArray(result[r], links) === -1) {
									links.push(result[r]);
								}
							}
						}

						// also get links from Quoted Text in the email (forwarded email is quoted)
						if(node.hasOwnProperty('QuotedTextList')) {
							for(var j = 0; j < node.QuotedTextList.length; j++) {

								var quotedtext = node.QuotedTextList[i];
								$(quotedtext).find('a').each(function() {
									if($.inArray($(this).attr('href'), links) === -1) {
										links.push( $(this).attr('href') );
									}
								});

								var result = quotedtext.match(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);
								if(result) {
									for(var r = 0; r < result.length; r++) {
										if($.inArray(result[r], links) === -1) {
											links.push(result[r]);
										}
									}
								}
							}
						}

						//console.log(links);

						var bccMe = "false";

						if(node.Items[0].ExtendedProperty[1].ExtendedFieldURI.hasOwnProperty('PropertyName')) {
							bccMe = node.Items[0].ExtendedProperty[1].Value; // "true"
						}

						//console.log("BCCME " + bccMe);

						var itemid = node.Items[0].ItemId.Id;
						//console.log("itemid " + itemid);

						curr_itemids.push(itemid);

						getMessageDetails(itemid, links, bccMe, i);

					} else {	// main not from coep domain
						addToDOM_OutsideDomain(i);
					}
				}

		    	clearInterval(interval);	// stop this interval checking since we've got result

		    } else {
		    	//console.log("CLICKED EMPTY");
		    }

		    timesRun += 1;
		    if(timesRun === 10)	{	// try 10 times
		        clearInterval(interval);
		    }

		}, 1000);					// at 1 second interval
	});
});


// conversations are in the left pane
// outlook gets conversation details of conversations above and below the clicked conversation
// outlook does not send request again for a conversation if its response is already fetched
// so storing all conversation requests and then checking when convid request exists

// capture responses of GetConversationItems requests, and store them to global conversationDetails array

// even when the extension has disabled state (off), still requests and responses are captured,
// as we will need them if user enables the extension in this session

/**
 * Javascript IIFE to capture all HTTP requests and response in the page
 */
(function(xhr) {

	var XHR = XMLHttpRequest.prototype;

	var open = XHR.open;
	var send = XHR.send;
	var setRequestHeader = XHR.setRequestHeader;

	XHR.open = function(method, url) {
		this._method = method;
		this._url = url;
		this._requestHeaders = {};
		this._startTime = (new Date()).toISOString();

		return open.apply(this, arguments);
	};

	XHR.setRequestHeader = function(header, value) {
		this._requestHeaders[header] = value;
		return setRequestHeader.apply(this, arguments);
	};

	XHR.send = function(postData) {

		this.addEventListener('load', function() {
			var endTime = (new Date()).toISOString();

			var myUrl = this._url ? this._url.toLowerCase() : this._url;
			if(myUrl) {

				if (postData) {
					if (typeof postData === 'string') {
						try {
							this._requestHeaders = postData;	// in JSON format
						} catch(err) {
							//console.log('Request Header JSON decode failed, transfer_encoding field could be base64');
							//console.log(err);
						}
					} else if (typeof postData === 'object' || typeof postData === 'array' || typeof postData === 'number' || typeof postData === 'boolean') {

					}
				}

				if ( this.responseType != 'blob' && this.responseText) {
					// responseText is string or null
					try {

						var string = this._url;
						var substring = "GetConversationItems";
						if(string.indexOf(substring) !== -1) {

							var arr = JSON.parse(this.responseText);

							var recvd_convId = arr.Body.ResponseMessages.Items[0].Conversation.ConversationId.Id;

							// don't overwrite earlier response, later response for same request has some missing data
							if(!conversationDetails.hasOwnProperty(recvd_convId)) {
								conversationDetails[recvd_convId] = arr;
							}

							//console.log("received convid " + recvd_convId);
							//console.log(this._requestHeaders);
							//console.log(this._url);
							//console.log(arr);
						}

					} catch(err) {
						//console.log("Error in responseType try catch");
						//console.log(err);
					}
				}

			}
		});

		return send.apply(this, arguments);
	};

})(XMLHttpRequest);

/**
 * Get Cookie of the site, by Name of the Cookie (Used for getting X-OWA-CANARY which is required in request to get message details)
 *
 * @param name of the cookie
 * @return cookie string or ""
 */
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/**
 * Get Message Details (Email Header) of the email, then calls getLSP fn
 *
 * @param itemid (of email)
 * @param links data to pass to getLSP fn
 * @param number of the email in conversation, starts at 0
 */
function getMessageDetails(itemid, links, bccMe, i) {

	var urlpostdata = prepareURLPostData(itemid);

	var settings = {
	  "async": true,
	  "crossDomain": true,
	  "url": "https://outlook.office.com/owa/service.svc?action=GetItem&EP=1&ID=-1&AC=1",
	  "method": "POST",
	  "headers": {
	    "x-owa-urlpostdata": encodeURIComponent(JSON.stringify(urlpostdata)),
	    "x-owa-canary": canary,
	    "action": "GetItem"
	  }
	};

	$.ajax(settings).done(function (response) {
		//console.log("REPLY FROM OUTLOOK");
		//console.log(response);

		if(response.Body.ResponseMessages.Items[0].Items[0].hasOwnProperty('ExtendedProperty')) {
			var headers = response.Body.ResponseMessages.Items[0].Items[0].ExtendedProperty[0].Value;
			//console.log(headers);
			getLSP(itemid, headers, links, bccMe, i);
		} else {
			//console.log("sender is user");
		}
	});
}

/**
 * Prepares urlpostdata required in x-owa-urlpostdata header field to make request for getting message details
 *
 * @param itemid (of email)
 * @return javascript object for urlpostdata
 */
function prepareURLPostData(itemid) {

	var arr =
		{
			"__type":"GetItemJsonRequest:#Exchange",
			"Header":{
				"__type":"JsonRequestHeaders:#Exchange",
				"RequestServerVersion":"Exchange2013",
				"TimeZoneContext":{
					"__type":"TimeZoneContext:#Exchange",
					"TimeZoneDefinition":{
						"__type":"TimeZoneDefinitionType:#Exchange",
						"Id":"India Standard Time"
					}
				}
			},
			"Body":{
				"__type":"GetItemRequest:#Exchange",
				"ItemShape":{
					"__type":"ItemResponseShape:#Exchange",
					"BaseShape":"IdOnly"
				},
				"ItemIds":[{
					"__type":"ItemId:#Exchange",
					"Id":itemid
				}],
				"ShapeName":"MessageDetails"
			}
		};

	return arr;

}

/**
 * Makes request to PHP Server to get LSP level of email, and then calls addToDOM fn
 *
 * @param itemid of email
 * @param headers of email
 * @param links in email body
 * @param number of the email in conversation, starts at 0
 */
function getLSP(itemid, headers, links, bccMe, i) {

	var data =	{
					"user":		user,
					"itemid": 	itemid,
					"headers": 	headers,
					"links": 	links,
					"bccMe": 	bccMe
				};

	$.ajax({
        url: "http://127.0.0.1/phish/client_req.php",
        type: "POST",
        data: {
            data: JSON.stringify(data),
            function: "outlook"
        }
    }).done(function (phpdata) {

    	//console.log("PHPDATA");
       // console.log(phpdata);

        var arr = JSON.parse(phpdata);

        // data received is escaped, remove escape characters
        var recvd_itemid = arr.itemid.replace(/\\"/g, '"');

        if($.inArray(recvd_itemid, curr_itemids) !== -1)
			addToDOM(arr, i);

    }).fail(function( jqXHR, textStatus, errorThrown ) {
        //console.log( "PHP Server Request failed: " + textStatus + " , " + errorThrown );
    });
}

/**
 * Add the LSP score UI elements to DOM
 *
 * @param LSP score
 * @param number of the email in conversation, starts at 0
 */
function addToDOM(arr, i) {

    var score = arr.score;
    var details = arr.details;
    var html = '';

    // server is not going to send "max" currently, keeping this for future improvements
    // currently, else part will always be executed
    if(score == "max") {

    	html = '\
	    	<div class="kumpan-injected">\
				<div class="kumpan-progress-container kumpan-inline">\
					<div id="kumpan-sus-text">\
						<span style="color:#dc3545;font-weight: 600;">Sender Account may be Hacked.</span>\
					</div>\
					<div id="kumpan-progress">\
						<div id="kumpan-progress-bar" style="width: 100%; background-color: #d9534f;">\
						STOP!\
						</div>\
					</div>\
				</div>\
				<div class="help-tip kumpan-inline">\
					<p>' + details + '</p>\
				</div>\
			</div>\
	    ';

    } else {

    	var bkgd = "#337ab7"; 		// default dark blue, not really needed
	    var warning_text = "";
	    if(score <= 25) {
	    	bkgd = "#5cb85c";		// green
	    } else if(score <= 50) {
	    	bkgd = "#5bc0de";		// light blue
	    } else if(score <= 75) {
	    	bkgd = "#f0ad4e";		// orange
	    	warning_text = ": Be Cautious!";
	    } else if(score <= 100) {
	    	bkgd = "#d9534f";		// red
	    	warning_text = ": Warning!";
	    }

	    html = '\
	    	<div class="kumpan-injected">\
				<div class="kumpan-progress-container kumpan-inline">\
					<div id="kumpan-sus-text">Suspiciousness of Email<span id="kumpan-warn-text">' + warning_text + '</span></div>\
					<div id="kumpan-progress">\
						<div id="kumpan-progress-bar" style="width: ' + score + '%; background-color: ' + bkgd + ';">'
						+ score + '%\
						</div>\
					</div>\
				</div>\
				<div class="help-tip kumpan-inline">\
					<p>' + details + '</p>\
				</div>\
			</div>\
	    ';
    }

    //var html = '<div class="kumpan-injected" style="font-size:40px;">' + score + '</div>';

    //$('div[autoid="_rp_3"]:eq(' + i + ')').prepend(html);

	var select = 'div[autoid="_rp_3"]:eq(' + i + ')';

    //console.log("SELECT " + select);

    var interval_add_div;

    var num = 0;
	interval_add_div = setInterval(function(){
		if ( $(select).length ) {
			$(select).css("position", "relative");
			$(select).prepend(html);
			clearInterval(interval_add_div);
	    }
	    //console.log("num " + i + " " + num);
	    num += 1;
	    if(num === 100)	{
	        clearInterval(interval_add_div);
	    }
	}, 100);

}

/**
 * Add Error UI element to DOM
 *
 * @param number of the email in conversation, starts at 0
 */
function addToDOM_Error(i) {

	var html = '\
    	<div class="kumpan-injected">\
			<div class="kumpan-progress-container kumpan-inline">\
				<div id="kumpan-sus-text">Error in processing. Please refresh page and try again.</div>\
			</div>\
		</div>\
    ';

    var select = 'div[autoid="_rp_3"]:eq(' + i + ')';

    var interval_add_div;

    var num = 0;
	interval_add_div = setInterval(function(){
		if ( $(select).length ) {
			$(select).css("position", "relative");
			$(select).prepend(html);
			clearInterval(interval_add_div);
	    }
	    //console.log("num " + i + " " + num);
	    num += 1;
	    if(num === 100)	{
	        clearInterval(interval_add_div);
	    }
	}, 100);
}

/**
 * Add Message UI to DOM for email coming from outside coep domain
 *
 * @param number of the email in conversation, starts at 0
 */
function addToDOM_OutsideDomain(i) {

	var html = '\
    	<div class="kumpan-injected kumpan-injected-outside-domain">\
			<div class="kumpan-progress-container kumpan-inline kumpan-progress-container-outside-domain">\
				<div id="kumpan-sus-text">\
					<span style="color:#dc3545;font-weight: 600;">Caution:</span>\
					This email is not from COEP Domain. Please hover on ? for more details.\
				</div>\
			</div>\
			<div class="help-tip kumpan-inline">\
				<p>Please look carefully at the <b>email address of the sender<b/>.<br/><br/>\
				If you don\'t trust the email address, please do not reply, forward, or click on any link in the email.<br/><br/>\
				If the email address is familiar to you, only then interact with the email.\
			</div>\
		</div>\
    ';

    var select = 'div[autoid="_rp_3"]:eq(' + i + ')';

    var interval_add_div;

    var num = 0;
	interval_add_div = setInterval(function(){
		if ( $(select).length ) {
			$(select).css("position", "relative");
			$(select).prepend(html);
			clearInterval(interval_add_div);
	    }
	    //console.log("num " + i + " " + num);
	    num += 1;
	    if(num === 100)	{
	        clearInterval(interval_add_div);
	    }
	}, 100);
}