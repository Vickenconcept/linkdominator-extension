(function initLe2Core() {
  window.LE2 = window.LE2 || {};

  LE2.ICONS = {
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  };

  LE2.extractList = function extractList(payload, ...keys) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
    }
    const data = payload.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      for (const key of ["items", "elements", "relations", "invitations", "results"]) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    for (const key of ["items", "elements", "relations", "invitations", "results"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
  };

  LE2.clampLimit = function clampLimit(value, fallback = 10, min = 1, max = 100) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
  };

  LE2.limitItems = function limitItems(items, limit) {
    const list = Array.isArray(items) ? items : [];
    if (limit == null || limit === "") return list;
    return list.slice(0, LE2.clampLimit(limit, list.length, 1, Math.max(list.length, 1)));
  };

  LE2.extractSearchResults = function extractSearchResults(payload, limit) {
    const raw = payload?.results || payload;
    const items =
      raw?.data?.items ??
      raw?.data?.data?.items ??
      raw?.data ??
      raw?.items ??
      raw?.leads ??
      [];
    const list = Array.isArray(items) ? items : LE2.extractList(items, "data", "items", "results", "leads");
    return LE2.limitItems(list, limit);
  };

  LE2.LINKEDIN_SEARCH_URL_PATTERNS = [
    /\/search\/results\/people/i,
    /\/search\/results\/all/i,
    /\/search\/results\/companies/i,
    /\/search\/results\/content/i,
    /\/sales\/search\/people/i,
    /\/sales\/search\/company/i,
    /\/talent\/search/i,
  ];

  LE2.isValidLinkedInSearchUrl = function isValidLinkedInSearchUrl(url) {
    if (!url || !String(url).includes("linkedin.com")) return false;
    return LE2.LINKEDIN_SEARCH_URL_PATTERNS.some((pattern) => pattern.test(url));
  };

  LE2.isValidLinkedInProfileUrl = function isValidLinkedInProfileUrl(url) {
    if (!url || !String(url).includes("linkedin.com")) return false;
    return /linkedin\.com\/in\/[^/?#]+/i.test(String(url));
  };

  LE2.isValidLinkedInImportUrl = function isValidLinkedInImportUrl(url) {
    return LE2.isValidLinkedInSearchUrl(url) || LE2.isValidLinkedInProfileUrl(url);
  };

  LE2.linkedinImportUrlKind = function linkedinImportUrlKind(url) {
    if (LE2.isValidLinkedInProfileUrl(url)) return "profile";
    if (LE2.isValidLinkedInSearchUrl(url)) return "search";
    return null;
  };

  LE2.personName = function personName(item) {
    if (!item || typeof item !== "object") return "Connection";
    if (item.name) return String(item.name);
    const first = item.first_name || item.firstName || "";
    const last = item.last_name || item.lastName || "";
    const full = `${first} ${last}`.trim();
    return full || item.public_identifier || item.headline || "Connection";
  };

  LE2.personInitials = function personInitials(item) {
    const name = LE2.personName(item);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  LE2.renderSavedSearchResults = function renderSavedSearchResults(container, opts = {}) {
    if (!container) return;
    const people = Array.isArray(opts.people) ? opts.people : [];
    const found = opts.found ?? people.length;
    const stored = opts.stored ?? found;
    const limit = opts.previewLimit ?? 15;

    if (!found) {
      container.innerHTML = `
        <div class="le2-search-empty">No results matched your filters.<br>Try different keywords or fewer filters.</div>`;
      return;
    }

    const rows = people
      .slice(0, limit)
      .map((p) => {
        const name = LE2.personName(p);
        const headline = (p.headline || p.title || p.company_name || "").trim();
        return `
          <div class="le2-lead-row">
            <div class="le2-lead-avatar">${LE2.personInitials(p)}</div>
            <div class="le2-lead-info">
              <div class="le2-lead-name">${name}</div>
              ${headline ? `<div class="le2-lead-headline">${headline}</div>` : ""}
            </div>
          </div>`;
      })
      .join("");

    const more = found > limit ? `<div class="le2-lead-row" style="justify-content:center;color:#94a3b8;font-size:10px">+ ${found - limit} more in CRM</div>` : "";

    container.innerHTML = `
      <div class="le2-search-success">
        <div class="le2-search-success-icon">${LE2.ICONS.check}</div>
        <div>
          <p class="le2-search-success-title">${stored} lead${stored !== 1 ? "s" : ""} saved to CRM</p>
          <p class="le2-search-success-sub">${opts.audienceName ? `Audience “${opts.audienceName}” · ` : ""}Found ${found} on LinkedIn · open CRM → Leads to manage them</p>
        </div>
      </div>
      <div class="le2-search-results-head">
        <span>Preview</span>
        <span>${Math.min(found, limit)} of ${found}</span>
      </div>
      <div class="le2-lead-list">${rows}${more}</div>`;
  };

  LE2.profileId = function profileId(item) {
    if (!item || typeof item !== "object") return "";
    return String(
      item.provider_id ||
        item.provider_profile_id ||
        item.profile_id ||
        item.public_identifier ||
        item.id ||
        item.member_id ||
        ""
    );
  };

  LE2.isUnipileProviderId = function isUnipileProviderId(value) {
    const id = String(value || "").trim();
    return /^(ACo|ADo|ACw|AE)/i.test(id);
  };

  LE2.resolveAttendeeId = async function resolveAttendeeId(ctx, identifier) {
    const raw = String(identifier || "").trim();
    if (!raw) return "";
    if (LE2.isUnipileProviderId(raw)) return raw;

    const res = await ctx.callAction("resolve_attendee", { input: { identifier: raw } });
    const providerId = res?.resolved?.data?.provider_id || res?.data?.provider_id;
    return String(providerId || "").trim();
  };

  LE2.fetchAudiences = async function fetchAudiences(ctx) {
    const res = await ctx.callAction("list_sn_sources");
    const sources = LE2.extractList(res?.sources ?? res, "data");
    return sources
      .map((s) => ({
        id: String(s.source_external_id || s.id || ""),
        name: String(s.source_name || s.source_external_id || s.id || "Audience"),
        count: Number(s.leads_count) || 0,
      }))
      .filter((s) => s.id);
  };

  LE2.populateAudienceSelect = async function populateAudienceSelect(ctx, selectEl, options = {}) {
    if (!selectEl) return [];
    const placeholder = options.placeholder || "Select an audience…";
    const previous = selectEl.value;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    selectEl.disabled = true;

    try {
      const audiences = await LE2.fetchAudiences(ctx);
      audiences.forEach((audience) => {
        const opt = document.createElement("option");
        opt.value = audience.id;
        opt.textContent = `${audience.name} (${audience.count})`;
        selectEl.appendChild(opt);
      });

      if (!audiences.length) {
        selectEl.options[0].textContent = "No audiences yet — create one first";
      } else if (previous && audiences.some((a) => a.id === previous)) {
        selectEl.value = previous;
      }

      return audiences;
    } catch (_) {
      selectEl.options[0].textContent = "Could not load audiences";
      return [];
    } finally {
      selectEl.disabled = false;
    }
  };

  LE2.readAudienceSelect = function readAudienceSelect(container, selector) {
    const el = typeof container === "string" ? document.querySelector(container) : container?.querySelector?.(selector);
    const select = el?.matches?.("select") ? el : container?.querySelector?.(selector);
    return String(select?.value || "").trim();
  };

  LE2.invitationId = function invitationId(item) {
    if (!item || typeof item !== "object") return "";
    return String(item.id || item.invitation_id || item.invite_id || "");
  };

  /** Best-effort sent/received timestamp from a Unipile invitation item. */
  LE2.invitationSentAt = function invitationSentAt(item) {
    if (!item || typeof item !== "object") return "";
    return String(
      item.parsed_datetime
        || item.date
        || item.sent_at
        || item.created_at
        || item.invited_at
        || ""
    ).trim();
  };

  LE2.invitationAgeDays = function invitationAgeDays(item, nowMs = Date.now()) {
    const sentAt = LE2.invitationSentAt(item);
    if (!sentAt) return null;
    const ts = new Date(sentAt).getTime();
    if (!Number.isFinite(ts)) return null;
    return (nowMs - ts) / (1000 * 60 * 60 * 24);
  };

  /** Payload required by Unipile to accept/decline a received invitation. */
  LE2.invitationAcceptPayload = function invitationAcceptPayload(item) {
    if (!item || typeof item !== "object") {
      return { invitation_id: "", shared_secret: "" };
    }
    return {
      invitation_id: LE2.invitationId(item),
      shared_secret: String(
        item.shared_secret
          || item.specifics?.shared_secret
          || item.specific_invite_connection?.shared_secret
          || item.invitation?.shared_secret
          || ""
      ),
    };
  };

  LE2.applyTokens = function applyTokens(template, person) {
    const name = LE2.personName(person);
    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || name;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    const headline = person?.headline || person?.occupation || person?.title || "";
    const company = person?.company || person?.company_name || "";
    return String(template || "")
      .replace(/\{\{name\}\}/gi, name)
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{lastName\}\}/gi, lastName)
      .replace(/\{\{headline\}\}/gi, headline)
      .replace(/\{\{company\}\}/gi, company)
      .replace(/@name/gi, name)
      .replace(/@firstName/gi, firstName)
      .replace(/@lastName/gi, lastName);
  };

  LE2.sleep = function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  LE2.runBatch = async function runBatch(options) {
    const items = options.items || [];
    const delayMs = Math.max(0, Number(options.delayMs) || 0);
    const onItem = options.onItem;
    const onProgress = options.onProgress;
    const shouldStop = options.shouldStop || (() => false);
    let ok = 0;
    let fail = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      if (shouldStop()) break;
      try {
        await onItem(items[i], i);
        ok++;
      } catch (err) {
        fail++;
        const msg = String(err?.message || err || "Failed").trim();
        if (msg && errors.length < 5 && !errors.includes(msg)) {
          errors.push(msg);
        }
      }
      if (onProgress) onProgress({ index: i + 1, total: items.length, ok, fail, lastError: errors[errors.length - 1] || null, errors: [...errors] });
      if (i < items.length - 1 && delayMs > 0) await LE2.sleep(delayMs);
    }

    return { ok, fail, total: items.length, stopped: shouldStop(), errors };
  };

  LE2.injectStyles = function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  };

  LE2.injectStyles("le2-actions-styles", `
    .le2-actions-list-wrap { padding: 0 0 12px; }
    .le2-actions-list-hdr {
      font-size: 12px; font-weight: 700; color: #64748b; padding: 8px 14px 6px;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .le2-actions-list { display: flex; flex-direction: column; }
    .le2-action-item {
      display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer;
      font-size: 12px; color: #334155; border-left: 3px solid transparent; transition: background .12s;
    }
    .le2-action-item:hover { background: #f1f5f9; border-left-color: #cbd5e1; }
    .le2-action-item.active {
      background: #f0fdfa; border-left-color: var(--le2-action-accent, #14b8a6); color: #0f172a;
    }
    .le2-action-item.active .le2-action-label { font-weight: 700; color: #0e7490; }
    .le2-action-item.active .le2-action-icon {
      box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--le2-action-accent, #14b8a6);
    }
    .le2-action-running:not([hidden]) {
      display: inline-flex; align-items: center; gap: 3px; margin-left: auto; flex-shrink: 0;
    }
    .le2-action-running[hidden] { display: none !important; }
    .le2-action-running:not([hidden]) span {
      width: 4px; height: 4px; border-radius: 50%;
      background: var(--le2-action-accent, #14b8a6);
      animation: le2-action-dot-bounce 1.2s infinite ease-in-out;
    }
    .le2-action-running span:nth-child(2) { animation-delay: .15s; }
    .le2-action-running span:nth-child(3) { animation-delay: .3s; }
    @keyframes le2-action-dot-bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: .35; }
      40% { transform: translateY(-4px); opacity: 1; }
    }
    .le2-action-modal-backdrop { cursor: default; }
    .le2-action-icon {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      color: #fff; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
    }
    .le2-action-icon svg { display: block; }

    /* Sketch-draw icons on hover (same idea as CRM sidebar) */
    .le2-sketch-icon {
      display: inline-flex; align-items: center; justify-content: center;
    }
    .le2-sketch-icon svg { overflow: visible; display: block; }
    .le2-sketch-icon svg path,
    .le2-sketch-icon svg line,
    .le2-sketch-icon svg circle,
    .le2-sketch-icon svg polyline,
    .le2-sketch-icon svg rect,
    .le2-sketch-icon svg polygon {
      stroke-dasharray: 64;
      stroke-dashoffset: 0;
    }
    .le2-action-item:hover .le2-sketch-icon,
    .le2-tab:hover .le2-sketch-icon {
      animation: le2-icon-pop 0.75s cubic-bezier(0.34, 1.25, 0.64, 1);
    }
    .le2-action-item:hover .le2-sketch-icon svg path,
    .le2-action-item:hover .le2-sketch-icon svg line,
    .le2-action-item:hover .le2-sketch-icon svg circle,
    .le2-action-item:hover .le2-sketch-icon svg polyline,
    .le2-action-item:hover .le2-sketch-icon svg rect,
    .le2-action-item:hover .le2-sketch-icon svg polygon,
    .le2-tab:hover .le2-sketch-icon svg path,
    .le2-tab:hover .le2-sketch-icon svg line,
    .le2-tab:hover .le2-sketch-icon svg circle,
    .le2-tab:hover .le2-sketch-icon svg polyline,
    .le2-tab:hover .le2-sketch-icon svg rect,
    .le2-tab:hover .le2-sketch-icon svg polygon {
      animation: le2-icon-sketch 0.95s ease-in-out forwards;
    }
    @keyframes le2-icon-sketch {
      0% { stroke-dashoffset: 64; opacity: 0.2; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
    @keyframes le2-icon-pop {
      0% { transform: scale(1); }
      38% { transform: scale(1.14); }
      68% { transform: scale(0.94); }
      100% { transform: scale(1); }
    }

    .le2-action-label { flex: 1; font-weight: 500; }
    .le2-panel-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .le2-panel-desc { font-size: 11px; color: #64748b; margin: 0 0 12px; line-height: 1.45; }
    .le2-field { margin-bottom: 10px; }
    .le2-field label { display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; }
    .le2-field-error-msg { font-size: 10px; color: #b91c1c; margin: 4px 0 0; line-height: 1.35; }
    .le2-input-error, textarea.le2-input-error {
      border-color: #ef4444 !important; box-shadow: 0 0 0 2px rgba(239,68,68,.15) !important;
    }
    .le2-progress { font-size: 11px; color: #475569; margin-top: 10px; line-height: 1.5; white-space: pre-wrap; }
    .le2-token-row { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 10px; }
    .le2-token {
      font-size: 10px; padding: 2px 6px; border-radius: 999px; background: #f1f5f9; color: #475569;
      border: 1px solid #e2e8f0; cursor: pointer;
    }
    .le2-token:hover { background: #e2e8f0; }
    .le2-action-modal {
      position: fixed; inset: 0; z-index: 2147483640; display: none;
      align-items: center; justify-content: center; font-family: inherit;
    }
    .le2-action-modal.open { display: flex; }
    .le2-action-modal-backdrop {
      position: absolute; inset: 0; background: rgba(15,23,42,.45);
    }
    .le2-action-modal-sheet {
      position: relative; width: min(420px, calc(100vw - 24px)); max-height: min(88vh, 720px);
      background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.22);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .le2-action-modal-hdr {
      display: flex; align-items: center; gap: 8px; padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0; background: #f8fafc;
    }
    .le2-action-modal-hdr h3 { margin: 0; flex: 1; font-size: 14px; font-weight: 700; color: #0f172a; }
    .le2-action-modal-icon {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center; color: #fff;
    }
    .le2-action-modal-icon svg { display: block; }
    .le2-action-modal-close {
      border: none; background: #e2e8f0; color: #475569; width: 28px; height: 28px;
      border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .le2-action-modal-back {
      border: none; background: #e2e8f0; color: #475569; width: 28px; height: 28px;
      border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .le2-action-modal-body { padding: 14px; overflow-y: auto; flex: 1; }
    .le2-action-panel-host { display: block; }
    .le2-action-panel-host[hidden] { display: none !important; }
    .le2-hub-btn { width: 100%; justify-content: center; }
    .le2-mini-list { border: 1px solid #e2e8f0; border-radius: 8px; max-height: 160px; overflow-y: auto; font-size: 11px; }
    .le2-mini-row { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; gap: 8px; }
    .le2-mini-row:last-child { border-bottom: none; }

    /* Search form + results layout */
    .le2-search-layout { display: flex; flex-direction: column; gap: 12px; }
    .le2-search-form-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;
    }
    .le2-search-form-card .le2-field { margin-bottom: 8px; }
    .le2-search-form-card .le2-field:last-of-type { margin-bottom: 0; }
    .le2-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .le2-search-grid .le2-field-full { grid-column: 1 / -1; }
    .le2-search-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
    .le2-search-check {
      display: flex; align-items: center; gap: 7px; font-size: 11px; color: #475569;
      margin: 8px 0 10px; cursor: pointer;
    }
    .le2-search-check input { width: 14px; height: 14px; margin: 0; }
    .le2-search-results-wrap { display: flex; flex-direction: column; gap: 8px; }
    .le2-search-success {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
      background: linear-gradient(135deg, #ecfdf5, #dcfce7); border: 1px solid #86efac;
      border-radius: 10px; color: #14532d;
    }
    .le2-search-success-icon {
      width: 22px; height: 22px; border-radius: 50%; background: #16a34a; color: #fff;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .le2-search-success-title { font-size: 12px; font-weight: 700; margin: 0 0 2px; color: #15803d; }
    .le2-search-success-sub { font-size: 10px; color: #166534; margin: 0; line-height: 1.4; }
    .le2-search-results-head {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8;
    }
    .le2-lead-list {
      border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
      max-height: 220px; overflow-y: auto;
    }
    .le2-lead-row {
      display: flex; align-items: center; gap: 10px; padding: 9px 11px;
      border-bottom: 1px solid #f1f5f9;
    }
    .le2-lead-row:last-child { border-bottom: none; }
    .le2-lead-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: #dbeafe; color: #1d4ed8;
      display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;
    }
    .le2-lead-info { flex: 1; min-width: 0; }
    .le2-lead-name { font-size: 12px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .le2-lead-headline { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .le2-search-empty {
      padding: 20px 14px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;
      border: 1px dashed #e2e8f0; border-radius: 10px; background: #fafafa;
    }

    /* Panel stage (loading / progress / results) */
    .le2-panel-shell { position: relative; }
    .le2-panel-form[hidden] { display: none !important; }
    .le2-panel-stage { animation: le2StageIn .2s ease; }
    @keyframes le2StageIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .le2-stage-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 18px 16px; text-align: center;
    }
    .le2-stage-loading { padding: 28px 16px; }
    .le2-stage-spinner {
      width: 32px; height: 32px; margin: 0 auto 14px;
      border: 3px solid #d1fae5; border-top-color: #14b8a6;
      border-radius: 50%; animation: le2spin .7s linear infinite;
    }
    @keyframes le2spin { to { transform: rotate(360deg); } }
    .le2-stage-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .le2-stage-sub { font-size: 11px; color: #64748b; margin: 0; line-height: 1.45; }
    .le2-stage-note { font-size: 10px; color: #94a3b8; margin: 8px 0 0; min-height: 14px; }
    .le2-stage-progress-track {
      height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 12px 0 10px;
    }
    .le2-stage-progress-fill {
      height: 100%; background: linear-gradient(90deg, #0e7490, #2dd4bf);
      border-radius: 999px; transition: width .25s ease;
    }
    .le2-stat-ok { color: #15803d; font-weight: 600; }
    .le2-stat-fail { color: #b91c1c; font-weight: 600; }
    .le2-stage-stats {
      display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 12px;
    }
    .le2-stage-stat {
      font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
      background: #f1f5f9; color: #475569;
    }
    .le2-stage-stat.ok { background: #dcfce7; color: #15803d; }
    .le2-stage-stat.fail { background: #fee2e2; color: #b91c1c; }
    .le2-stage-result-icon {
      width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 12px;
      display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800;
    }
    .le2-stage-result-icon.ok { background: #dcfce7; color: #15803d; }
    .le2-stage-result-icon.fail { background: #fee2e2; color: #b91c1c; }
    .le2-stage-result-icon.warn { background: #fef3c7; color: #92400e; }
    .le2-stage-search { text-align: left; padding: 12px; }
    .le2-stage-search .le2-search-success { margin-bottom: 10px; }
    .le2-stage-search .le2-lead-list { max-height: 240px; }
    .le2-loc-picker { position: relative; width: 100%; }
    .le2-loc-picker .le2-loc-input-wrap { position: relative; display: flex; align-items: center; }
    .le2-loc-picker .le2-loc-input-wrap .le2-input { padding-right: 28px; width: 100%; }
    .le2-loc-picker.has-value .le2-loc-input-wrap .le2-input {
      background: #ecfdf5;
      border-color: #6ee7b7;
      color: #065f46;
    }
    .le2-loc-picker [data-le2-loc-clear] {
      position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
      border: none; background: transparent; color: #94a3b8; cursor: pointer;
      font-size: 14px; line-height: 1; padding: 2px 4px; display: none; z-index: 2;
    }
    .le2-loc-picker.has-value [data-le2-loc-clear] { display: inline-flex; color: #059669; }
    .le2-loc-picker [data-le2-loc-clear]:hover { color: #047857; }
    .le2-loc-dropdown {
      position: absolute; z-index: 50; left: 0; right: 0; top: calc(100% + 2px);
      max-height: 180px; overflow-y: auto; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    .le2-loc-dropdown[hidden] { display: none !important; }
    .le2-loc-option {
      display: block; width: 100%; text-align: left; border: none; background: #fff;
      padding: 8px 10px; font-size: 12px; color: #334155; cursor: pointer;
    }
    .le2-loc-option:hover, .le2-loc-option.active { background: #eff6ff; color: #1d4ed8; }
    .le2-loc-empty, .le2-loc-loading {
      padding: 8px 10px; font-size: 11px; color: #94a3b8;
    }
  `);

  /**
   * Mount a Unipile LOCATION typeahead on a host element.
   * Stores selected LinkedIn location ID (not free text) for search filters.
   *
   * @param {HTMLElement} hostEl
   * @param {{
   *   inputId?: string,
   *   hiddenId?: string,
   *   placeholder?: string,
   *   initialId?: string,
   *   initialLabel?: string,
   *   fetchSuggestions: (keywords: string) => Promise<Array<{id: string, label: string}>>,
   *   onChange?: (value: {id: string, label: string}) => void,
   * }} options
   */
  LE2.mountLocationPicker = function mountLocationPicker(hostEl, options = {}) {
    if (!hostEl) return null;

    const fetchSuggestions = options.fetchSuggestions;
    if (typeof fetchSuggestions !== "function") {
      throw new Error("mountLocationPicker requires fetchSuggestions");
    }

    if (hostEl._le2LocAbort) {
      try {
        hostEl._le2LocAbort.abort();
      } catch (_) {
        /* ignore */
      }
    }
    const abort = new AbortController();
    hostEl._le2LocAbort = abort;
    const { signal } = abort;

    const inputId = options.inputId || "le2-loc";
    const hiddenId = options.hiddenId || `${inputId}-id`;
    const placeholder = options.placeholder || "Search city or country…";
    let selectedId = String(options.initialId || "");
    let selectedLabel = String(options.initialLabel || "");
    let debounceTimer = null;
    let requestSeq = 0;
    let activeIndex = -1;
    let currentItems = [];

    hostEl.innerHTML = `
      <div class="le2-loc-picker${selectedId ? " has-value" : ""}" data-le2-loc-picker>
        <input type="hidden" id="${hiddenId}" data-le2-loc-id value="${selectedId.replace(/"/g, "&quot;")}" />
        <div class="le2-loc-input-wrap">
          <input
            class="le2-input"
            id="${inputId}"
            data-le2-loc-query
            type="text"
            autocomplete="off"
            placeholder="${placeholder.replace(/"/g, "&quot;")}"
            value="${selectedLabel.replace(/"/g, "&quot;")}"
          />
          <button type="button" data-le2-loc-clear aria-label="Clear location">&times;</button>
          <div class="le2-loc-dropdown" data-le2-loc-dropdown hidden></div>
        </div>
      </div>
    `;

    const root = hostEl.querySelector("[data-le2-loc-picker]");
    const hidden = hostEl.querySelector("[data-le2-loc-id]");
    const input = hostEl.querySelector("[data-le2-loc-query]");
    const dropdown = hostEl.querySelector("[data-le2-loc-dropdown]");
    const clearBtn = hostEl.querySelector("[data-le2-loc-clear]");

    function emitChange() {
      if (typeof options.onChange === "function") {
        options.onChange({ id: selectedId, label: selectedLabel });
      }
    }

    function setSelected(id, label) {
      selectedId = String(id || "");
      selectedLabel = String(label || "");
      if (hidden) hidden.value = selectedId;
      if (input) input.value = selectedLabel;
      root?.classList.toggle("has-value", !!selectedId);
      emitChange();
    }

    function hideDropdown() {
      if (dropdown) {
        dropdown.hidden = true;
        dropdown.innerHTML = "";
      }
      activeIndex = -1;
      currentItems = [];
    }

    function renderItems(items, meta = {}) {
      if (!dropdown) return;
      currentItems = Array.isArray(items) ? items : [];
      activeIndex = -1;

      if (meta.loading) {
        dropdown.innerHTML = `<div class="le2-loc-loading">Searching locations…</div>`;
        dropdown.hidden = false;
        return;
      }

      if (currentItems.length === 0) {
        dropdown.innerHTML = `<div class="le2-loc-empty">${meta.empty || "No locations found"}</div>`;
        dropdown.hidden = false;
        return;
      }

      dropdown.innerHTML = currentItems
        .map(
          (item, index) =>
            `<button type="button" class="le2-loc-option" data-index="${index}" data-id="${String(item.id).replace(/"/g, "&quot;")}">${String(item.label || item.id)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</button>`
        )
        .join("");
      dropdown.hidden = false;
    }

    function pickIndex(index) {
      const item = currentItems[index];
      if (!item) return;
      setSelected(item.id, item.label || item.id);
      hideDropdown();
    }

    async function runSearch(keywords) {
      const q = String(keywords || "").trim();
      if (q.length < 2) {
        hideDropdown();
        return;
      }

      const seq = ++requestSeq;
      renderItems([], { loading: true });

      try {
        const items = await fetchSuggestions(q);
        if (seq !== requestSeq) return;
        const normalized = (Array.isArray(items) ? items : [])
          .map((row) => ({
            id: String(row?.id ?? ""),
            label: String(row?.label ?? row?.title ?? row?.name ?? row?.id ?? ""),
          }))
          .filter((row) => row.id !== "");
        renderItems(normalized, { empty: "No locations match that text" });
      } catch (_) {
        if (seq !== requestSeq) return;
        renderItems([], { empty: "Could not load locations — try again" });
      }
    }

    input?.addEventListener(
      "input",
      () => {
        const value = input.value;
        if (selectedId && value !== selectedLabel) {
          selectedId = "";
          selectedLabel = "";
          if (hidden) hidden.value = "";
          root?.classList.remove("has-value");
          emitChange();
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => runSearch(value), 280);
      },
      { signal }
    );

    input?.addEventListener(
      "keydown",
      (event) => {
        if (dropdown?.hidden) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          activeIndex = Math.min(currentItems.length - 1, activeIndex + 1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          activeIndex = Math.max(0, activeIndex - 1);
        } else if (event.key === "Enter" && activeIndex >= 0) {
          event.preventDefault();
          pickIndex(activeIndex);
          return;
        } else if (event.key === "Escape") {
          hideDropdown();
          return;
        } else {
          return;
        }

        dropdown.querySelectorAll(".le2-loc-option").forEach((el, i) => {
          el.classList.toggle("active", i === activeIndex);
        });
      },
      { signal }
    );

    dropdown?.addEventListener(
      "mousedown",
      (event) => {
        const btn = event.target.closest(".le2-loc-option");
        if (!btn) return;
        event.preventDefault();
        pickIndex(Number(btn.dataset.index));
      },
      { signal }
    );

    clearBtn?.addEventListener(
      "click",
      () => {
        setSelected("", "");
        hideDropdown();
        input?.focus();
      },
      { signal }
    );

    document.addEventListener(
      "click",
      (event) => {
        if (!root?.contains(event.target)) hideDropdown();
      },
      { capture: true, signal }
    );

    return {
      getValue: () => ({ id: selectedId, label: selectedLabel }),
      setValue: setSelected,
      clear: () => setSelected("", ""),
    };
  };

  LE2.readLocationPicker = function readLocationPicker(root, querySelector = "[data-le2-loc-id]") {
    const host = typeof root === "string" ? document.querySelector(root) : root;
    if (!host) return { id: "", label: "" };
    const scope = host.matches?.("[data-le2-loc-picker]") ? host : host.querySelector?.("[data-le2-loc-picker]") || host;
    const id = String(scope.querySelector?.(querySelector)?.value || "").trim();
    const label = String(scope.querySelector?.("[data-le2-loc-query]")?.value || "").trim();
    return { id, label };
  };

  /**
   * Location is optional, but typed text without a dropdown selection is invalid.
   * @returns {{ ok: boolean, id: string, label: string, incomplete: boolean }}
   */
  LE2.validateLocationPicker = function validateLocationPicker(root) {
    const value = LE2.readLocationPicker(root);
    const incomplete = value.label !== "" && value.id === "";
    return {
      ok: !incomplete,
      id: value.id,
      label: value.label,
      incomplete,
    };
  };

  LE2.insertTokenAtCursor = function insertTokenAtCursor(textarea, token) {
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.value = textarea.value.slice(0, start) + token + textarea.value.slice(end);
    textarea.focus();
    const pos = start + token.length;
    textarea.setSelectionRange(pos, pos);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  };

  LE2.wireTokenChips = function wireTokenChips(root, textareaId) {
    root?.querySelectorAll(".le2-token-chip, .le2-token").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ta = document.getElementById(textareaId) || btn.closest(".le2-actions-panel")?.querySelector("textarea");
        LE2.insertTokenAtCursor(ta, btn.dataset.token || "");
      });
    });
  };
})();
