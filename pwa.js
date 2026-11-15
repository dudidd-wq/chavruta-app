/* Register the service worker and offer a modest install prompt. */
(function () {
  "use strict";

  var DISMISS_KEY = "chavruta-pwa-install-dismissed";

  function isStandalone() {
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    if (window.navigator.standalone === true) return true;
    return false;
  }

  function isIos() {
    var ua = window.navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    if (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function wasDismissed() {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch (err) {
      return false;
    }
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch (err) { /* ignore quota / private mode */ }
    var el = document.getElementById("pwa-install");
    if (el) el.remove();
  }

  function injectStyles() {
    if (document.getElementById("pwa-install-style")) return;
    var style = document.createElement("style");
    style.id = "pwa-install-style";
    style.textContent =
      "#pwa-install{position:fixed;right:0;left:0;bottom:calc(var(--bottombar-h,3.5rem) + env(safe-area-inset-bottom,0px));z-index:35;display:flex;align-items:center;gap:.75rem;padding:.7rem 1rem;background:var(--card,#fffdf9);color:var(--ink,#26211b);border-top:1px solid var(--rule,#ddd4c3);box-shadow:0 -6px 20px rgba(60,40,20,.08);font-family:Assistant,\"Liberation Sans\",Arial,sans-serif;font-size:.95rem;line-height:1.4;direction:rtl;}" +
      "#pwa-install .pwa-install-msg{flex:1;margin:0}" +
      "#pwa-install .pwa-install-btn{appearance:none;border:0;border-radius:8px;background:var(--accent,#76283a);color:#fff;padding:.4rem .9rem;font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}" +
      "#pwa-install .pwa-install-btn:hover{background:var(--accent-2,#571a29)}" +
      "#pwa-install .pwa-install-close{appearance:none;border:0;background:transparent;color:var(--ink-3,#6e6457);cursor:pointer;padding:.25rem;line-height:1;font-size:1.2rem}" +
      "@media print{#pwa-install{display:none!important}}";
    document.head.appendChild(style);
  }

  function showBar(opts) {
    if (document.getElementById("pwa-install")) return;
    injectStyles();
    var bar = document.createElement("div");
    bar.id = "pwa-install";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "התקנת האפליקציה");

    var msg = document.createElement("p");
    msg.className = "pwa-install-msg";
    msg.textContent = opts.message;
    bar.appendChild(msg);

    if (opts.actionLabel && opts.onAction) {
      var action = document.createElement("button");
      action.type = "button";
      action.className = "pwa-install-btn";
      action.textContent = opts.actionLabel;
      action.addEventListener("click", opts.onAction);
      bar.appendChild(action);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.className = "pwa-install-close";
    close.setAttribute("aria-label", "סגירה");
    close.textContent = "×";
    close.addEventListener("click", dismiss);
    bar.appendChild(close);

    document.body.appendChild(bar);
  }

  if ("serviceWorker" in navigator) {
    var swUrl = new URL("sw.js", window.location.href);
    // Don't reuse a cached sw.js; a new CACHE_VERSION must reach phones on the next visit.
    navigator.serviceWorker.register(swUrl, { updateViaCache: "none" }).catch(function () { /* registration is optional */ });
  }

  if (isStandalone() || wasDismissed()) return;

  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showBar({
      message: "אפשר להתקין את חברותא כאפליקציה במכשיר.",
      actionLabel: "התקנת האפליקציה",
      onAction: function () {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () {
          deferredPrompt = null;
          dismiss();
        });
      }
    });
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    dismiss();
  });

  if (isIos()) {
    showBar({
      message: "באייפון או באייפד: לחצו על שיתוף, ואז על «הוספה למסך הבית»."
    });
  }
})();
