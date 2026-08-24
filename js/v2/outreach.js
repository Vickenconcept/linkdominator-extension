(function initLdV2Outreach() {
  window.LDV2 = window.LDV2 || {};
  LDV2._stop = false;

  LDV2.stop = function stop() {
    LDV2._stop = true;
  };

  LDV2.resetStop = function resetStop() {
    LDV2._stop = false;
  };

  LDV2.shouldStop = function shouldStop() {
    return LDV2._stop === true;
  };

  LDV2.callAction = function callAction(action, payload) {
    return new Promise((resolve, reject) => {
      const valid = typeof window.__ldCtxValid === "function" ? window.__ldCtxValid() : !!(chrome?.runtime?.id);
      if (!valid) {
        reject(new Error("Extension was reloaded. Refresh LinkedIn and try again."));
        return;
      }

      const timeoutMs = 120000;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("CRM request timed out after 120s. Unipile may be slow — try again."));
      }, timeoutMs);

      function finish(fn, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(value);
      }

      try {
        chrome.runtime.sendMessage(
          { type: "v2:ui-action", payload: { action, ...(payload || {}) } },
          (res) => {
            const err = chrome.runtime.lastError;
            if (err) {
              if (typeof window.__ldIsDeadError === "function" && window.__ldIsDeadError(err)) {
                if (typeof window.__ldMarkDead === "function") window.__ldMarkDead();
              }
              finish(reject, new Error(err.message));
              return;
            }
            if (!res || res.ok !== true) {
              finish(reject, new Error((res && (res.error || res.message)) || "CRM request failed"));
              return;
            }
            finish(resolve, res.result);
          }
        );
      } catch (e) {
        if (typeof window.__ldMarkDead === "function") window.__ldMarkDead();
        finish(reject, e);
      }
    });
  };

  LDV2.extractList = function extractList(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    const nested = payload.results || payload.result || payload;
    if (Array.isArray(nested)) return nested;
    const data = nested.data || nested;
    if (Array.isArray(data)) return data;
    for (const key of ["items", "elements", "relations", "invitations", "results", "leads", "people"]) {
      if (Array.isArray(nested[key])) return nested[key];
      if (data && Array.isArray(data[key])) return data[key];
    }
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  };

  LDV2.personName = function personName(item) {
    if (!item || typeof item !== "object") return "";
    const first = item.firstName || item.first_name || item.con_first_name || "";
    const last = item.lastName || item.last_name || item.con_last_name || "";
    return String(item.name || item.full_name || `${first} ${last}`.trim()).trim();
  };

  LDV2.profileId = function profileId(item) {
    if (!item || typeof item !== "object") return "";
    return String(
      item.provider_id ||
        item.provider_profile_id ||
        item.public_identifier ||
        item.publicIdentifier ||
        item.profile_id ||
        item.profileId ||
        item.con_public_identifier ||
        item.connectionId ||
        item.conId ||
        item.id ||
        ""
    ).trim();
  };

  LDV2.applyTokens = function applyTokens(template, person) {
    const name = LDV2.personName(person);
    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = person?.firstName || person?.first_name || parts[0] || name;
    const lastName = person?.lastName || person?.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "");
    const headline = person?.headline || person?.occupation || person?.title || "";
    const company = person?.company || person?.company_name || "";
    return String(template || "")
      .replace(/\{\{name\}\}/gi, name)
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{lastName\}\}/gi, lastName)
      .replace(/\{\{headline\}\}/gi, headline)
      .replace(/\{\{company\}\}/gi, company)
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{lastName\}/g, lastName)
      .replace(/\{name\}/g, name)
      .replace(/\{title\}/g, headline)
      .replace(/@firstName/gi, firstName)
      .replace(/@lastName/gi, lastName)
      .replace(/@name/gi, name)
      .replace(/@title/gi, headline);
  };

  LDV2.sleep = function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  LDV2.sendInvite = async function sendInvite(person, message) {
    const recipientId = LDV2.profileId(person);
    if (!recipientId) throw new Error("missing profile id");
    return LDV2.callAction("send_invite", {
      input: {
        recipient_id: recipientId,
        message: message ? LDV2.applyTokens(message, person) : undefined,
      },
    });
  };

  LDV2.startChat = async function startChat(person, message) {
    const profileId = LDV2.profileId(person);
    if (!profileId) throw new Error("missing profile id");
    return LDV2.callAction("start_chat", {
      input: {
        attendee_ids: [profileId],
        text: LDV2.applyTokens(message, person),
      },
    });
  };

  LDV2.runBatch = async function runBatch(options) {
    const items = Array.isArray(options.items) ? options.items : [];
    const delayMs = Math.max(30000, Number(options.delayMs) || 30000);
    LDV2.resetStop();
    for (let i = 0; i < items.length; i++) {
      if (LDV2.shouldStop()) {
        if (options.onStatus) options.onStatus({ stopped: true, index: i, total: items.length });
        break;
      }
      const item = items[i];
      try {
        await options.onItem(item, i);
        if (options.onStatus) {
          options.onStatus({ ok: true, index: i, total: items.length, item });
        }
      } catch (error) {
        if (options.onStatus) {
          options.onStatus({ ok: false, index: i, total: items.length, item, error });
        }
      }
      if (i < items.length - 1) {
        await LDV2.sleep(delayMs);
      }
    }
  };
})();
