importScripts("./crmClient.js");
importScripts("./orchestrator/campaignRunner.js");
importScripts("./workers/callWorker.js");

const CAMPAIGN_POLL_ALARM = "v2_campaign_poll";
const REMINDER_POLL_ALARM = "v2_reminder_poll";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(CAMPAIGN_POLL_ALARM, { periodInMinutes: 1 });
  chrome.alarms.create(REMINDER_POLL_ALARM, { periodInMinutes: 1 });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "v2:ui-action") {
    CampaignRunnerV2.handleUiAction(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "v2:content-mounted") {
    sendResponse({ ok: true });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CAMPAIGN_POLL_ALARM) {
    await CampaignRunnerV2.syncCampaignStatus();
  }

  if (alarm.name === REMINDER_POLL_ALARM) {
    await CallWorkerV2.pollPendingReminders();
  }
});
