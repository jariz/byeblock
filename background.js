/**
 * Created by Jari on 30/03/16.
 */
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if(details.url.indexOf("assets/views") !== -1 && details.url.indexOf("?bypass-the-filter") === -1) {
            //request real file. (sync)
            var xhr = new XMLHttpRequest();
            xhr.open("GET", details.url + "?bypass-the-filter", false); //bypass our own filter
            xhr.send(null);
            var app = xhr.responseText;
           
            //request injected script
            var xhr = new XMLHttpRequest();
            xhr.open("GET", chrome.extension.getURL('byeblock2.js'), false);
            xhr.send(null);
            var inject = xhr.responseText
           
            //wrap them up together
            return {
                redirectUrl: "data:text/javascript;base64," + btoa(unescape(encodeURIComponent((inject + app)))) 
            };
        } else if(details.url.indexOf("assets/vendor") !== -1 && details.url.indexOf("?bypass-the-filter") === -1) {
            //request real file. (sync)
            var xhr = new XMLHttpRequest();
            xhr.open("GET", details.url + "?bypass-the-filter", false); //bypass our own filter
            xhr.send(null);
            var vendors = xhr.responseText;
           
            //modify webpack cache to global object
            var modified = "window.webpackCache={};" + vendors.substring(0, 100).replace(/r\[n\]/g, "window.webpackCache[n]");
           
            //wrap them up together
            return {
                redirectUrl: "data:text/javascript;base64," + btoa(unescape(encodeURIComponent((modified + vendors.substring(100))))) 
            };
        } else {
            return {
                cancel: false
            }
        }
    },
    {urls: ["*://a-v2.sndcdn.com/*"]},
    ["blocking"]);

