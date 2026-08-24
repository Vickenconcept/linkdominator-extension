importScripts("./env.js");
importScripts("./js/v2/crmClient.js");
importScripts("./js/v2/outreachRouter.js");

// Stop legacy campaign/call-manager alarms from previous extension versions.
try {
  chrome.alarms.clearAll();
} catch (_e) {}

// v2 CRM — lightweight service worker (same pattern as v2-extension).
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "le-watchdog" || port.name === "le2-watchdog") {
    port.onDisconnect.addListener(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "v2:ui-action") {
    return;
  }

  const run =
    typeof LdV2Outreach !== "undefined" && typeof LdV2Outreach.handleUiAction === "function"
      ? LdV2Outreach.handleUiAction(message.payload)
      : Promise.reject(new Error("CRM router not loaded. Reload the extension."));

  run
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});

void CrmClientV2.ensureSessionMatchesApiBase();

// Legacy background.js (~750KB lk-id campaigns/call manager) is NOT loaded.
// v2 CRM routes sign-in and outreach through LdV2Outreach + CrmClientV2.
