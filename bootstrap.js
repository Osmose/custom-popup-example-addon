const { utils: Cu, interfaces: Ci } = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "RecentWindow",
                                  "resource:///modules/RecentWindow.jsm");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * Converts an nsISupports object (returned by window observers) that
 * implements a XUL Window into a ChromeWindow object.
 */
function getDOMWindow(subject) {
  return (
    subject
    .QueryInterface(Ci.nsIXULWindow)
    .docShell
    .QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIDOMWindow)
  );
}

const WindowWatcher = {
  startup() {
    // Watch for newly-created windows
    Services.obs.addObserver(this, "xul-window-registered");

    // Inject into existing windows
    const windowList = Services.wm.getEnumerator(null);
    while (windowList.hasMoreElements()) {
      this.inject(windowList.getNext());
    }
  },

  observe(subject, topic, data) {
     switch (topic) {
       case "xul-window-registered":
         this.inject(getDOMWindow(subject));
         break;
     }
   },

  shutdown() {
    Services.obs.removeObserver(this, "xul-window-registered");

    // Clean up injected content
    for (const domWindow of this.trackedWindows) {
      this.uninject(domWindow);
    }
  },

  inject(domWindow) {
    if (domWindow.document.getElementById("custom-popup-example")) {
      return;
    }

    const popupSet = domWindow.document.getElementById("mainPopupSet");
    const popupContent = domWindow.document.createElementNS(XUL_NS, "popupnotification");
    popupContent.hidden = true;
    popupContent.id = "custom-popup-example-notification";
    popupContent.innerHTML = `
      <popupnotificationcontent class="custom-popup-example-content" orient="vertical">
        <description id="custom-popup-example-header">Foo bar</description>
        <description id="custom-popup-example-message">Bazz biff</description>
      </popupnotificationcontent>
    `;
    popupSet.appendChild(popupContent);
  },

  uninject(domWindow) {
    const popupContent = domWindow.document.querySelector("#mainPopupSet #custom-popup-example-notification");
    if (popupContent) {
      popupContent.remove();
    }
  },
};

function install() {}

function startup() {
  WindowWatcher.startup();

  const browserWindow = RecentWindow.getMostRecentBrowserWindow();
  browserWindow.PopupNotifications.show(browserWindow.gBrowser.selectedBrowser, "custom-popup-example", "", null, {
    label: "Do Something",
    accessKey: "D",
    callback: function() {
      alert("Doing something awesome!");
    }
  }, null);
}

function shutdown() {
  WindowWatcher.shutdown();
}

function uninstall() {}
