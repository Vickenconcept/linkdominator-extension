const CrmClientV2 = (function () {
  const DEFAULT_API_BASE =
    (typeof PLATFORM_URL !== "undefined" ? PLATFORM_URL : "https://app.linkedempire.com") + "/api/v2";
  const API_BASE_KEY = "linkedempire_v2_api_base";
  const TOKEN_KEY = "linkedempire_v2_token";
  const ORG_ID_KEY = "linkedempire_v2_org_id";
  const TOKEN_API_BASE_KEY = "linkedempire_v2_token_api_base";
  const EMAIL_KEY = "linkedempire_v2_email";
  const ORG_NAME_KEY = "linkedempire_v2_org_name";
  const REAUTH_REASON_KEY = "linkedempire_v2_reauth_reason";

  /** Do not share tokens with the Socifusion v2 extension on the same Chrome profile. */
  const LEGACY_KEY_MAP = {};

  let legacyMigrationPromise = null;

  async function migrateLegacyStorageKeys() {
    if (legacyMigrationPromise) return legacyMigrationPromise;
    legacyMigrationPromise = (async () => {
      const legacyKeys = Object.keys(LEGACY_KEY_MAP);
      const stored = await chrome.storage.local.get(legacyKeys);
      const next = {};
      const remove = [];
      for (const [legacyKey, nextKey] of Object.entries(LEGACY_KEY_MAP)) {
        if (stored[legacyKey] == null || stored[legacyKey] === "") continue;
        const current = await chrome.storage.local.get([nextKey]);
        if (current[nextKey] == null || current[nextKey] === "") {
          next[nextKey] = stored[legacyKey];
        }
        remove.push(legacyKey);
      }
      if (Object.keys(next).length) {
        await chrome.storage.local.set(next);
      }
      if (remove.length) {
        await chrome.storage.local.remove(remove);
      }
    })().catch(() => {});
    return legacyMigrationPromise;
  }

  const AUTH_STORAGE_KEYS = [
    TOKEN_KEY,
    ORG_ID_KEY,
    TOKEN_API_BASE_KEY,
    EMAIL_KEY,
    ORG_NAME_KEY,
  ];

  function normalizeApiBase(url) {
    return String(url || "").trim().replace(/\/+$/, "");
  }

  function apiHostLabel(apiBase) {
    try {
      return new URL(apiBase).host || apiBase;
    } catch (_error) {
      return apiBase;
    }
  }

  async function getApiBase() {
    await migrateLegacyStorageKeys();
    const envBase = normalizeApiBase(DEFAULT_API_BASE);
    const result = await chrome.storage.local.get([API_BASE_KEY]);
    const stored = normalizeApiBase(result[API_BASE_KEY] || "");
    // env.js PLATFORM_URL is the source of truth (local Laravel vs production).
    if (envBase && stored !== envBase) {
      await chrome.storage.local.set({ [API_BASE_KEY]: envBase });
    }
    return envBase || stored;
  }

  async function getToken() {
    await migrateLegacyStorageKeys();
    const result = await chrome.storage.local.get([TOKEN_KEY]);
    return result[TOKEN_KEY] || null;
  }

  async function getOrganizationId() {
    await migrateLegacyStorageKeys();
    const result = await chrome.storage.local.get([ORG_ID_KEY]);
    return result[ORG_ID_KEY] || null;
  }

  async function clearAuthSession(reason = "") {
    await migrateLegacyStorageKeys();
    await chrome.storage.local.remove(AUTH_STORAGE_KEYS);
    if (reason) {
      await chrome.storage.local.set({ [REAUTH_REASON_KEY]: reason });
    } else {
      await chrome.storage.local.remove([REAUTH_REASON_KEY]);
    }
  }

  async function consumeReauthReason() {
    await migrateLegacyStorageKeys();
    const result = await chrome.storage.local.get([REAUTH_REASON_KEY]);
    const reason = result[REAUTH_REASON_KEY] || null;
    if (reason) {
      await chrome.storage.local.remove([REAUTH_REASON_KEY]);
    }
    return reason;
  }

  /**
   * Tokens are bound to one CRM API host. Switching local ↔ production must
   * force sign-in again so we never mix accounts/workspaces.
   */
  async function ensureSessionMatchesApiBase() {
    const apiBase = await getApiBase();
    const stored = await chrome.storage.local.get([TOKEN_KEY, TOKEN_API_BASE_KEY]);
    const token = stored[TOKEN_KEY] || null;
    if (!token) {
      return { cleared: false, api_base: apiBase };
    }

    const tokenApiBase = normalizeApiBase(stored[TOKEN_API_BASE_KEY] || "");
    if (tokenApiBase && tokenApiBase !== apiBase) {
      await clearAuthSession("api_base_changed");
      return { cleared: true, api_base: apiBase, reason: "api_base_changed" };
    }

    return { cleared: false, api_base: apiBase };
  }

  /**
   * Confirm the saved token still belongs to a living account on this CRM.
   * Deleted users / revoked tokens → clear local session and force re-login.
   */
  async function validateSession() {
    const apiMatch = await ensureSessionMatchesApiBase();
    if (apiMatch.cleared) {
      return { valid: false, cleared: true, reason: apiMatch.reason, api_base: apiMatch.api_base };
    }

    const apiBase = apiMatch.api_base;
    const token = await getToken();
    if (!token) {
      return { valid: false, cleared: false, api_base: apiBase };
    }

    try {
      const response = await fetch(`${apiBase}/access-check`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_error) {
        data = {};
      }

      if (response.status === 401 || data.error_code === "user_not_found") {
        const notFound = data.error_code === "user_not_found" || /not found/i.test(String(data.message || ""));
        await clearAuthSession(notFound ? "user_not_found" : "unauthorized");
        return {
          valid: false,
          cleared: true,
          reason: notFound ? "user_not_found" : "unauthorized",
          api_base: apiBase,
        };
      }

      // Bind token→API after first successful check (covers legacy sessions).
      const stored = await chrome.storage.local.get([TOKEN_API_BASE_KEY]);
      if (!normalizeApiBase(stored[TOKEN_API_BASE_KEY] || "")) {
        await chrome.storage.local.set({ [TOKEN_API_BASE_KEY]: apiBase });
      }

      if (data.user?.email) {
        const extras = { [EMAIL_KEY]: data.user.email };
        if (data.organization?.id) {
          extras[ORG_ID_KEY] = Number(data.organization.id);
        }
        await chrome.storage.local.set(extras);
      }

      return {
        valid: response.ok || response.status === 403,
        cleared: false,
        access: Boolean(data.access),
        error_code: data.error_code || null,
        api_base: apiBase,
        user: data.user || null,
      };
    } catch (_error) {
      // Network blip — keep local session; UI can retry.
      return { valid: true, cleared: false, offline: true, api_base: apiBase };
    }
  }

  function buildQuery(query) {
    if (!query || typeof query !== "object") {
      return "";
    }

    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      params.append(key, String(value));
    });

    const output = params.toString();
    return output ? `?${output}` : "";
  }

  function makeIdempotencyKey(prefix = "req") {
    const randomPart = Math.random().toString(36).slice(2);
    const nowPart = Date.now().toString(36);
    return `${prefix}-${nowPart}-${randomPart}`;
  }

  async function request(path, options = {}) {
    await ensureSessionMatchesApiBase();

    const apiBase = await getApiBase();
    const token = await getToken();
    const organizationId = await getOrganizationId();
    const headers = Object.assign(
      {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Bypass the ngrok browser-warning interstitial page in development
        "ngrok-skip-browser-warning": "true",
      },
      options.headers || {}
    );

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    if (organizationId && !path.startsWith("/auth/")) {
      headers["X-Organization-Id"] = String(organizationId);
    }

    if (options.idempotentScope && !headers["Idempotency-Key"]) {
      headers["Idempotency-Key"] = makeIdempotencyKey(options.idempotentScope);
    }

    const url = apiBase + path + buildQuery(options.query);

    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_error) {
      data = { raw: text };
    }

    if (!response.ok) {
      if (response.status === 401 && !path.startsWith("/auth/")) {
        const notFound = data.error_code === "user_not_found" || /not found/i.test(String(data.message || ""));
        await clearAuthSession(notFound ? "user_not_found" : "unauthorized");
      }
      const parts = [data.message || data.error || "CRM v2 request failed"];
      if (data.hint) parts.push(`Hint: ${data.hint}`);
      if (data.auth_redirect_url) parts.push(`Auth URL: ${data.auth_redirect_url}`);
      throw new Error(parts.join("\n"));
    }

    return data;
  }

  async function issueExtensionToken(email, password) {
    const apiBase = await getApiBase();
    const data = await request("/auth/extension-token", {
      method: "POST",
      body: {
        email,
        password,
        device_name: "LinkedEmpire Extension",
      },
    });

    if (data && data.token) {
      const payload = {
        [TOKEN_KEY]: data.token,
        [TOKEN_API_BASE_KEY]: apiBase,
      };
      if (data.organization && data.organization.id) {
        payload[ORG_ID_KEY] = data.organization.id;
      }

      await chrome.storage.local.set(payload);
      await chrome.storage.local.remove([REAUTH_REASON_KEY]);
    }

    return data;
  }

  function health() {
    return request("/health");
  }

  async function setApiBase(url) {
    const normalized = normalizeApiBase(url);
    if (!normalized) {
      throw new Error("API base URL cannot be empty");
    }

    const previous = await getApiBase();
    await chrome.storage.local.set({ [API_BASE_KEY]: normalized });

    let sessionCleared = false;
    if (previous !== normalized) {
      const hasToken = Boolean(await getToken());
      if (hasToken) {
        await clearAuthSession("api_base_changed");
        sessionCleared = true;
      }
    }

    return {
      api_base: normalized,
      previous_api_base: previous,
      session_cleared: sessionCleared,
      api_host: apiHostLabel(normalized),
    };
  }

  async function setOrganizationId(organizationId) {
    if (!organizationId) {
      throw new Error("Organization ID cannot be empty");
    }
    await chrome.storage.local.set({ [ORG_ID_KEY]: Number(organizationId) });
    return { organization_id: Number(organizationId) };
  }

  async function getClientContext() {
    const validation = await validateSession();
    const apiBase = validation.api_base || (await getApiBase());
    const token = await getToken();
    const organizationId = await getOrganizationId();
    const reauthReason = await consumeReauthReason();

    return {
      api_base: apiBase,
      api_host: apiHostLabel(apiBase),
      has_token: Boolean(token),
      organization_id: organizationId,
      session_cleared: validation.cleared || Boolean(reauthReason),
      reauth_reason: reauthReason,
      session_valid: Boolean(token) && validation.valid !== false,
      access: validation.access,
      error_code: validation.error_code || null,
    };
  }

  function listIntegrationAccounts(query = {}) {
    return request("/integration-accounts", { query });
  }

  function verifyIntegrationAccounts() {
    return request("/integration-accounts/verify", { method: "POST" });
  }

  function createHostedAuthLink(payload = {}) {
    return request("/integration-accounts/hosted-auth-link", {
      method: "POST",
      body: payload,
    });
  }

  function searchLeads(payload = {}) {
    return request("/leads/search", {
      method: "POST",
      body: payload,
    });
  }

  function sendInvite(payload = {}) {
    return request("/outreach/invite", {
      method: "POST",
      body: payload,
      idempotentScope: "outreach-invite",
    });
  }

  function startChat(payload = {}) {
    return request("/outreach/start-chat", {
      method: "POST",
      body: payload,
      idempotentScope: "outreach-start-chat",
    });
  }

  function sendMessage(payload = {}) {
    return request("/outreach/message", {
      method: "POST",
      body: payload,
      idempotentScope: "outreach-message",
    });
  }

  function listLeads() {
    return request("/leads");
  }

  function listSnSources() {
    return request("/leads/sn/sources");
  }

  function listSnImportedLeads(params = {}) {
    return request("/leads/sn/imported", {
      query: params,
    });
  }

  function importSnLeads(payload = {}) {
    return request("/leads/sn/import", {
      method: "POST",
      body: payload,
      idempotentScope: "sn-import",
    });
  }

  function listCampaigns() {
    return request("/campaigns");
  }

  function createCampaign(payload = {}) {
    return request("/campaigns", {
      method: "POST",
      body: payload,
    });
  }

  function runCampaign(campaignId, payload = {}) {
    return request(`/campaigns/${campaignId}/run`, {
      method: "POST",
      body: payload,
      idempotentScope: "campaign-run",
    });
  }

  function storeMiniStats(payload = {}) {
    return request("/stats/mini", {
      method: "POST",
      body: payload,
    });
  }

  function storeUserActivity(payload = {}) {
    return request("/stats/activities", {
      method: "POST",
      body: payload,
    });
  }

  function syncStatsSummary() {
    return request("/stats/sync", {
      method: "POST",
    });
  }

  function getStatsSummary() {
    return request("/stats/summary");
  }

  function getContentAnalytics(days = 14) {
    return request("/stats/content-analytics", {
      query: { days },
    });
  }

  function getContentCohorts(days = 30) {
    return request("/stats/content-analytics/cohorts", {
      query: { days },
    });
  }

  function getContentAttribution(days = 30) {
    return request("/stats/content-analytics/attribution", {
      query: { days },
    });
  }

  function listContentPosts() {
    return request("/content-creator/scheduled-posts");
  }

  function createContentPost(payload = {}) {
    return request("/content-creator/posts", {
      method: "POST",
      body: payload,
    });
  }

  function updateContentPostStatus(id, payload = {}) {
    return request(`/content-creator/posts/${id}/update-status`, {
      method: "POST",
      body: payload,
    });
  }

  function listInspirationPosts() {
    return request("/inspiration");
  }

  function saveInspirationPost(payload = {}) {
    return request("/inspiration/save-viral-post", {
      method: "POST",
      body: payload,
    });
  }

  function generatePostComment(payload = {}) {
    return request("/posts/generate-comment", {
      method: "POST",
      body: payload,
    });
  }

  function getEspConfig() {
    return request("/esp/config");
  }

  function saveEspConfig(payload = {}) {
    return request("/esp/config", {
      method: "POST",
      body: payload,
    });
  }

  function listEspDeliveries(params = {}) {
    return request("/esp/deliveries", {
      query: params,
    });
  }

  function pushLeadsToEsp(payload = {}) {
    return request("/esp/push-leads", {
      method: "POST",
      body: payload,
      idempotentScope: "esp-push-leads",
    });
  }

  function sendEspDeliveryFeedback(payload = {}) {
    return request("/esp/delivery-feedback", {
      method: "POST",
      body: payload,
    });
  }

  function listTeamMembers() {
    return request("/team/members");
  }

  function getTeamCapabilityTemplates() {
    return request("/team/capability-templates");
  }

  function getTeamRoleMatrix() {
    return request("/team/role-matrix");
  }

  function previewTeamTemplate(payload = {}) {
    return request("/team/preview-template", {
      method: "POST",
      body: payload,
    });
  }

  function bulkApplyTeamTemplate(payload = {}) {
    return request("/team/bulk-apply-template", {
      method: "POST",
      body: payload,
    });
  }

  function updateTeamMember(memberId, payload = {}) {
    return request(`/team/members/${memberId}`, {
      method: "PATCH",
      body: payload,
    });
  }

  function removeTeamMember(memberId) {
    return request(`/team/members/${memberId}`, {
      method: "DELETE",
    });
  }

  function listTeamInvites() {
    return request("/team/invites");
  }

  function inviteTeamMember(payload = {}) {
    return request("/team/invites", {
      method: "POST",
      body: payload,
    });
  }

  function acceptTeamInvite(token) {
    return request(`/team/invites/accept/${token}`, {
      method: "POST",
    });
  }

  function listInvitations() {
    return request("/outreach/invitations");
  }

  function listSentInvitations(params = {}) {
    return request("/outreach/invitations/sent", { query: params });
  }

  function listRelations(params = {}) {
    return request("/outreach/relations", { query: params });
  }

  function listSearchParameters(params = {}) {
    return request("/outreach/search-parameters", { query: params });
  }

  function acceptInvitation(payload = {}) {
    return request("/outreach/accept-invite", { method: "POST", body: payload });
  }

  function rejectInvitation(payload = {}) {
    return request("/outreach/reject-invite", { method: "POST", body: payload });
  }

  function withdrawInvitation(payload = {}) {
    return request("/outreach/withdraw-invite", { method: "POST", body: payload });
  }

  function profileAction(payload = {}) {
    return request("/outreach/profile-action", { method: "POST", body: payload });
  }

  function resolveAttendee(payload = {}) {
    return request("/outreach/resolve-attendee", { method: "POST", body: payload });
  }

  // ── Campaign API ────────────────────────────────────────────────────────

  function listCampaigns() {
    return request("/campaigns");
  }

  function getCampaignSequence(campaignId) {
    return request(`/campaigns/${campaignId}/sequence`);
  }

  function getCampaignLeads(campaignId) {
    return request(`/campaigns/${campaignId}/leads`);
  }

  function getCampaignProgress(campaignId) {
    return request(`/campaigns/${campaignId}/progress`);
  }

  function getCampaignActivity(campaignId, query = {}) {
    return request(`/campaigns/${campaignId}/activity`, { query });
  }

  function addCampaignLeads(campaignId, leads) {
    return request(`/campaigns/${campaignId}/leads`, {
      method: "POST",
      body: { leads },
    });
  }

  function updateCampaignNode(campaignId, nodeKey, runStatus) {
    return request(`/campaigns/${campaignId}/sequence/update-node`, {
      method: "POST",
      body: { node_key: nodeKey, run_status: runStatus },
    });
  }

  function updateLeadProgress(campaignId, leadId, progressData) {
    return request(`/campaigns/${campaignId}/progress/${leadId}`, {
      method: "POST",
      body: progressData,
    });
  }

  function updateCampaignStatus(payload = {}) {
    return request(`/campaigns/${payload.campaignId}/status`, {
      method: "POST",
      body: { status: payload.status },
    });
  }

  function getCampaignTemplates() {
    return request("/campaigns/templates");
  }

  /**
   * Read LinkedIn li_at from browser cookies (service worker only — content scripts cannot use chrome.cookies).
   */
  async function readLinkedInLiAt() {
    const urls = [
      "https://www.linkedin.com",
      "https://linkedin.com",
      "https://www.linkedin.com/feed",
    ];

    for (const url of urls) {
      try {
        const cookie = await chrome.cookies.get({ url, name: "li_at" });
        if (cookie?.value) return cookie.value;
      } catch (_) {
        // ignore and try next url
      }
    }

    try {
      const all = await chrome.cookies.getAll({ name: "li_at" });
      const match = all.find((c) => c.domain?.includes("linkedin.com") && c.value);
      return match?.value || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Connect LinkedIn via cookie (primary method).
   * Pass li_at + the browser user_agent so Unipile can register the account.
   */
  function connectLinkedInCookie(liAt, userAgent) {
    return request("/integration-accounts/connect-cookie", {
      method: "POST",
      body: { li_at: liAt, user_agent: userAgent },
    });
  }

  /**
   * Connect LinkedIn via email + password credentials.
   */
  function connectLinkedInCredentials(email, password) {
    return request("/integration-accounts/connect-credentials", {
      method: "POST",
      body: { email, password },
    });
  }

  /**
   * Disconnect a LinkedIn integration account.
   */
  function disconnectLinkedInAccount(id) {
    return request(`/integration-accounts/${id}/disconnect`, { method: "DELETE" });
  }

  /** @deprecated alias — use connectLinkedInCookie with userAgent from the browser */
  function syncLinkedInSession(liAt, userAgent = "") {
    return connectLinkedInCookie(liAt, userAgent);
  }

  // Persist email + org name on successful sign in for display purposes
  async function issueExtensionTokenAndStore(email, password) {
    const data = await issueExtensionToken(email, password);
    const extras = { [EMAIL_KEY]: email };
    if (data?.organization?.name) {
      extras[ORG_NAME_KEY] = data.organization.name;
    }
    await chrome.storage.local.set(extras);
    return data;
  }

  return {
    AUTH_STORAGE_KEYS,
    request,
    issueExtensionToken,
    setApiBase,
    setOrganizationId,
    getClientContext,
    clearAuthSession,
    consumeReauthReason,
    ensureSessionMatchesApiBase,
    validateSession,
    health,
    listIntegrationAccounts,
    verifyIntegrationAccounts,
    createHostedAuthLink,
    searchLeads,
    sendInvite,
    startChat,
    sendMessage,
    listLeads,
    listSnSources,
    listSnImportedLeads,
    importSnLeads,
    listCampaigns,
    createCampaign,
    runCampaign,
    storeMiniStats,
    storeUserActivity,
    getStatsSummary,
    syncStatsSummary,
    getContentAnalytics,
    getContentCohorts,
    getContentAttribution,
    listContentPosts,
    createContentPost,
    updateContentPostStatus,
    listInspirationPosts,
    saveInspirationPost,
    generatePostComment,
    getEspConfig,
    saveEspConfig,
    listEspDeliveries,
    pushLeadsToEsp,
    sendEspDeliveryFeedback,
    listTeamMembers,
    getTeamCapabilityTemplates,
    getTeamRoleMatrix,
    previewTeamTemplate,
    bulkApplyTeamTemplate,
    updateTeamMember,
    removeTeamMember,
    listTeamInvites,
    inviteTeamMember,
    acceptTeamInvite,
    listCampaigns,
    getCampaignSequence,
    getCampaignLeads,
    getCampaignProgress,
    getCampaignActivity,
    addCampaignLeads,
    updateCampaignNode,
    updateLeadProgress,
    updateCampaignStatus,
    getCampaignTemplates,
    readLinkedInLiAt,
    syncLinkedInSession,
    connectLinkedInCookie,
    connectLinkedInCredentials,
    disconnectLinkedInAccount,
    issueExtensionTokenAndStore,
    listInvitations,
    listSentInvitations,
    listRelations,
    listSearchParameters,
    acceptInvitation,
    rejectInvitation,
    withdrawInvitation,
    profileAction,
    resolveAttendee,
  };
})();
