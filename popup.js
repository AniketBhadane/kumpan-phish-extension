
/**
 * Extension's script
 * Currently only used to communicate extension state on off message to content script which in turn sends it to injected outlook.js
 */

var flag = 0; // used to disable further processing in 'toggle-ui change' function, when there' an error

$(function(){

  var firstTimeUse = 1; // when setting toggle state when popup is launched, to not sendmessage to content script at this time

  // set toggle state on popup launch
  chrome.storage.sync.get("state", function (data) {  // chrome.storage is async

    if (typeof data.state === 'undefined') {
        chrome.storage.sync.set({"state": "on"}, function() {
          $('#toggle-ui').bootstrapToggle(data.state);
          chrome.browserAction.setIcon({
            path: "icon16.png"
          });
        });  // async
    } else {
      //console.log(data.state);
      $('#toggle-ui').bootstrapToggle(data.state);
    }

  });

  $('#toggle-ui').change(function() {

    if(firstTimeUse == 1) {
      firstTimeUse = 0;
      return false;
    }

    if(flag == 1)
      return false;

    var true_false = $('#toggle-ui').prop('checked');

    // send message from this extension's script to content script
    // will be used to send enable disable messages

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {toggle: true_false}, function(response) {
        //console.log(response.farewell);

        //console.log(response);

        $("#error").html("");

        if(typeof response === 'undefined') {
          $("#error").html("Extension's state can only be changed when you are on COEP's Outlook Email Account.");
          flag = 1;
          $('#toggle-ui').prop('checked', !true_false).change();
          flag = 0;
          return false;
        }

        if(response.state == "error") {
          $("#error").html("Error: toggle parameter not received as true or false");

          flag = 1;

          $('#toggle-ui').prop('checked', !true_false).change();

          flag = 0;

          return false;
        }

        if(true_false === true) {
          chrome.browserAction.setIcon({
            path: "icon16.png"
          });
        }

        if(true_false === false) {
          chrome.browserAction.setIcon({
            path: "iconDisabled16.png"
          });
        }

      });
    });

  });

});