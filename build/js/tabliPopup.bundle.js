webpackJsonp([3],{0:function(e,o,n){"use strict";function t(e){if(e&&e.__esModule)return e;var o={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(o[n]=e[n]);return o["default"]=e,o}function r(){window.onload=function(){return u.getFocusedAndRender(!1)}}var c=n(365),u=t(c);r()},1:function(e,o){"use strict";var n={activateTab:function(e,o){chrome.tabs.update(e,{active:!0},o)},setFocusedWindow:function(e,o){chrome.windows.update(e,{focused:!0},o)}};window.tabliBrowser=n,e.exports=n},365:function(e,o,n){"use strict";function t(e){if(e&&e.__esModule)return e;var o={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(o[n]=e[n]);return o["default"]=e,o}function r(e){return e&&e.__esModule?e:{"default":e}}function c(e,o){console.log("renderPopup: isPopout: ",o);var n=performance.now(),t=chrome.extension.getBackgroundPage(),r=t.storeRef,c=document.getElementById("windowList-region"),u=a.createElement(g,{storeRef:r,initialWinStore:r.getValue(),isPopout:o}),i=(d.render(u,c),performance.now());console.log("full render complete. render time: (",i-n," ms)"),m.syncChromeWindows((0,p.logWrap)(function(o){console.log("postLoadRender: window sync complete");var t=r.getValue(),c=o(t);console.log("renderPopup: setting current window to ",e);var u=c.setCurrentWindow(e);u.equals(t)?console.log("doRender: nextStore.equals(savedStore) -- skipping setValue"):r.setValue(u);var i=performance.now();console.log("syncChromeWindows and update complete: ",i-n," ms"),document.getElementById("searchBox").focus()}))}function u(e){chrome.windows.getCurrent(null,function(o){c(o,e)})}Object.defineProperty(o,"__esModule",{value:!0}),o.getFocusedAndRender=u;var i=n(1),s=(r(i),n(9)),a=t(s),l=n(67),d=t(l),p=n(366),f=n(2),w=t(f),g=w.components.Popup,m=w.actions},366:function(e,o){"use strict";function n(e){function o(){var o;try{o=e.apply(this,arguments)}catch(n){throw console.error("logWrap: caught exception invoking function: "),console.error(n.stack),n}return o}return o}Object.defineProperty(o,"__esModule",{value:!0}),o.logWrap=n}});