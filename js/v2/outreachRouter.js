/**
 * Unipile outreach router for LinkedEmpire.
 * Handles CRM UI actions and redirects invite/message away from Voyager/tab automation.
 */
const LdV2Outreach = (function () {
  const CAMPAIGN_OUTREACH_NODES = new Set(["send-invites", "message", "endorse", "profile-view", "follow"]);
  const PROFILE_ACTION_NODES = {
    endorse: "endorse",
    "profile-view": "view_profile",
    follow: "follow",
  };
  const MIN_DELAY_MS = 30000;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function personName(item) {
    if (!item || typeof item !== "object") return "";
    const first = item.firstName || item.first_name || item.con_first_name || "";
    const last = item.lastName || item.last_name || item.con_last_name || "";
    const combined = `${first} ${last}`.trim();
    return String(
      item.name ||
        item.full_name ||
        combined ||
        item.publicIdentifier ||
        item.public_identifier ||
        ""
    ).trim();
  }

  function applyTokens(template, person) {
    const name = personName(person);
    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = person.firstName || person.first_name || parts[0] || name;
    const lastName = person.lastName || person.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "");
    const headline = person.headline || person.occupation || person.title || person.con_job_title || "";
    const company = person.company || person.company_name || "";
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
  }

  function isUnipileProviderId(value) {
    return /^(ACo|ADo|ACw|AE)/i.test(String(value || "").trim());
  }

  function rawProfileId(item) {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    return String(
      item.provider_id ||
        item.provider_profile_id ||
        item.public_identifier ||
        item.publicIdentifier ||
        item.profile_id ||
        item.profileId ||
        item.con_public_identifier ||
        item.recipient_id ||
        item.connectionId ||
        item.conId ||
        item.id ||
        item.member_id ||
        ""
    ).trim();
  }

  async function resolveRecipientId(item) {
    let raw = rawProfileId(item);
    if (!raw && item?.profileUrl) {
      const match = String(item.profileUrl).match(/linkedin\.com\/in\/([^/?#]+)/i);
      raw = match ? decodeURIComponent(match[1]) : "";
    }
    if (!raw) {
      throw new Error("Missing LinkedIn profile id");
    }
    if (isUnipileProviderId(raw)) return raw;

    const resolved = await CrmClientV2.resolveAttendee({ identifier: raw });
    const providerId =
      resolved?.resolved?.data?.provider_id ||
      resolved?.data?.provider_id ||
      resolved?.provider_id ||
      "";
    const next = String(providerId || raw).trim();
    if (!next) throw new Error("Could not resolve LinkedIn profile id");
    return next;
  }

  async function sendInviteFromLead(lead, nodeOrMessage) {
    const recipientId = await resolveRecipientId(lead);
    let message = "";
    if (typeof nodeOrMessage === "string") {
      message = nodeOrMessage;
    } else if (nodeOrMessage && typeof nodeOrMessage === "object") {
      const raw = nodeOrMessage.inviteNote || nodeOrMessage.message || nodeOrMessage.customMessage || "";
      if (raw && (nodeOrMessage.hasInviteNote !== false)) {
        message = applyTokens(raw, lead);
      }
    }
    const input = { recipient_id: recipientId };
    if (message && String(message).trim()) {
      input.message = String(message).replace(/\s+/g, " ").trim();
    }
    const invite = await CrmClientV2.sendInvite(input);
    return { success: true, invite, via: "unipile" };
  }

  async function sendMessageFromLead(lead, message) {
    const attendeeId = await resolveRecipientId(lead);
    const text = applyTokens(message || "", lead);
    if (!text.trim()) {
      throw new Error("Message text is required");
    }
    const chat = await CrmClientV2.startChat({
      attendee_ids: [attendeeId],
      text,
    });
    return { success: true, chat, via: "unipile" };
  }

  async function handleConnectionInviteRequest(data) {
    const lead = {
      name: data?.profileName || data?.name,
      publicIdentifier: data?.profileId || data?.publicIdentifier,
      profileId: data?.profileId,
      profileUrl: data?.profileUrl,
      customMessage: data?.customMessage,
    };
    return sendInviteFromLead(lead, data?.customMessage || data?.message || "");
  }

  function handlesCampaignNode(value) {
    return CAMPAIGN_OUTREACH_NODES.has(String(value || ""));
  }

  async function runCampaignNode({ currentCampaign, leads, nodeModel }) {
    const list = Array.isArray(leads) ? leads : [];
    const delayMs = Math.max(MIN_DELAY_MS, Number(nodeModel?.delayInMinutes || 0.5) * 60 * 1000);
    console.log(`LD v2 Unipile campaign node ${nodeModel?.value} for ${list.length} leads`);

    for (let i = 0; i < list.length; i++) {
      const lead = list[i];
      try {
        if (nodeModel.value === "send-invites") {
          await sendInviteFromLead(lead, nodeModel);
        } else if (nodeModel.value === "message") {
          const raw = nodeModel.message || nodeModel.inviteNote || "";
          await sendMessageFromLead(lead, raw);
        } else if (PROFILE_ACTION_NODES[nodeModel.value]) {
          const profileId = await resolveRecipientId(lead);
          await CrmClientV2.profileAction({
            profile_id: profileId,
            action: PROFILE_ACTION_NODES[nodeModel.value],
          });
        }
        console.log(`LD v2 Unipile ${nodeModel.value} ok:`, personName(lead));
      } catch (error) {
        console.error(`LD v2 Unipile ${nodeModel.value} failed:`, personName(lead), error.message);
      }
      if (i < list.length - 1) {
        await sleep(delayMs);
      }
    }

    return { success: true, via: "unipile", processed: list.length, campaignId: currentCampaign?.id };
  }

  async function handleUiAction(payload) {
    if (!payload || !payload.action) {
      return { handled: false, reason: "missing_action" };
    }

    const action = payload.action;

    if (action === "extension_sign_in") {
      const auth = await CrmClientV2.issueExtensionTokenAndStore(payload.email, payload.password);
      return { handled: true, auth };
    }
    if (action === "extension_sign_out") {
      await CrmClientV2.clearAuthSession("signed_out");
      return { handled: true };
    }
    if (action === "set_api_base") {
      const config = await CrmClientV2.setApiBase(payload.apiBase);
      return { handled: true, config };
    }
    if (action === "client_context") {
      const context = await CrmClientV2.getClientContext();
      const stored = await chrome.storage.local.get(["linkedempire_v2_email", "linkedempire_v2_org_name"]);
      return {
        handled: true,
        context: {
          ...context,
          email: stored.linkedempire_v2_email || "",
          organization_name: stored.linkedempire_v2_org_name || "",
        },
      };
    }
    if (action === "create_auth_link") {
      const response = await CrmClientV2.createHostedAuthLink(payload.input || {});
      return { handled: true, link: response?.data || response };
    }
    if (action === "list_integration_accounts") {
      const result = await CrmClientV2.listIntegrationAccounts(payload.query || {});
      return { handled: true, result };
    }
    if (action === "verify_integration_accounts") {
      const result = await CrmClientV2.verifyIntegrationAccounts();
      return { handled: true, result };
    }
    if (action === "search_leads") {
      const results = await CrmClientV2.searchLeads(payload.input || {});
      return { handled: true, results };
    }
    if (action === "list_sn_sources") {
      const sources = await CrmClientV2.listSnSources();
      return { handled: true, sources };
    }
    if (action === "list_sn_imported_leads") {
      const leads = await CrmClientV2.listSnImportedLeads(payload.query || {});
      return { handled: true, leads };
    }
    if (action === "import_sn_leads") {
      const result = await CrmClientV2.importSnLeads(payload.input || {});
      return { handled: true, result };
    }
    if (action === "list_campaigns") {
      const result = await CrmClientV2.listCampaigns();
      return { handled: true, campaigns: result.data || result };
    }
    if (action === "update_campaign_status") {
      const result = await CrmClientV2.updateCampaignStatus(payload.input || {});
      return { handled: true, result };
    }
    if (action === "run_campaign") {
      const run = await CrmClientV2.runCampaign(payload.campaignId, payload.input || {});
      return { handled: true, run };
    }
    if (action === "get_esp_config") {
      try {
        const config = await CrmClientV2.getEspConfig();
        return { handled: true, config };
      } catch (_error) {
        return { handled: true, config: { data: [] } };
      }
    }
    if (action === "esp_push_leads") {
      const result = await CrmClientV2.pushLeadsToEsp(payload.input || {});
      return { handled: true, result };
    }
    if (action === "list_sent_invitations") {
      const invitations = await CrmClientV2.listSentInvitations(payload.query || {});
      return { handled: true, invitations };
    }
    if (action === "list_search_parameters") {
      const parameters = await CrmClientV2.listSearchParameters(payload.query || {});
      return { handled: true, parameters };
    }
    if (action === "send_invite") {
      const input = { ...(payload.input || {}) };
      if (input.recipient_id && !isUnipileProviderId(input.recipient_id)) {
        input.recipient_id = await resolveRecipientId({ publicIdentifier: input.recipient_id });
      }
      const invite = await CrmClientV2.sendInvite(input);
      return { handled: true, invite };
    }
    if (action === "start_chat") {
      const input = { ...(payload.input || {}) };
      const ids = Array.isArray(input.attendee_ids) ? input.attendee_ids : [];
      input.attendee_ids = await Promise.all(
        ids.map((id) => resolveRecipientId({ publicIdentifier: id }))
      );
      const chat = await CrmClientV2.startChat(input);
      return { handled: true, chat };
    }
    if (action === "send_message") {
      const message = await CrmClientV2.sendMessage(payload.input || {});
      return { handled: true, message };
    }
    if (action === "read_li_at_cookie") {
      const liAt = await CrmClientV2.readLinkedInLiAt();
      return { handled: true, liAt, found: !!liAt };
    }
    if (action === "connect_linkedin_cookie") {
      const liAt = payload.liAt || (await CrmClientV2.readLinkedInLiAt());
      if (!liAt) {
        throw new Error("No li_at cookie found. Log in to linkedin.com in this browser first.");
      }
      const result = await CrmClientV2.connectLinkedInCookie(liAt, payload.userAgent || "");
      return { handled: true, result };
    }
    if (action === "connect_linkedin_credentials") {
      const result = await CrmClientV2.connectLinkedInCredentials(payload.email, payload.password);
      return { handled: true, result };
    }
    if (action === "disconnect_linkedin") {
      const result = await CrmClientV2.disconnectLinkedInAccount(payload.accountId);
      return { handled: true, result };
    }
    if (action === "list_relations") {
      const relations = await CrmClientV2.listRelations(payload.query || {});
      return { handled: true, relations };
    }
    if (action === "list_invitations") {
      const invitations = await CrmClientV2.listInvitations();
      return { handled: true, invitations };
    }
    if (action === "profile_action") {
      const input = { ...(payload.input || {}) };
      if (input.profile_id && !isUnipileProviderId(input.profile_id)) {
        input.profile_id = await resolveRecipientId({ publicIdentifier: input.profile_id });
      }
      const result = await CrmClientV2.profileAction(input);
      return { handled: true, result };
    }
    if (action === "withdraw_invitation") {
      const result = await CrmClientV2.withdrawInvitation(payload.input || {});
      return { handled: true, result };
    }
    if (action === "accept_invitation") {
      const result = await CrmClientV2.acceptInvitation(payload.input || {});
      return { handled: true, result };
    }
    if (action === "resolve_attendee") {
      const result = await CrmClientV2.resolveAttendee(payload.input || {});
      return { handled: true, resolved: result };
    }

    return { handled: false, reason: "unsupported_action" };
  }

  return {
    handleUiAction,
    sendInviteFromLead,
    sendMessageFromLead,
    handleConnectionInviteRequest,
    handlesCampaignNode,
    runCampaignNode,
    applyTokens,
    personName,
  };
})();
