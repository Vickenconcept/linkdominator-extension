/** LinkedEmpire visual identity — navy + cyan (launcher colors). Not v2 Socifusion blue. */
(function initLdBrand() {
  window.LD_BRAND = {
    navy: "#06283a",
    navyMid: "#0a3d5c",
    cyan: "#22d3ee",
    cyanDark: "#0891b2",
    surface: "#ecfeff",
    border: "#a5f3fc",
    text: "#0c4a6e",
    muted: "#64748b",
  };

  const css = `
    #mySidepanel.ld-empire-panel {
      --ld-navy: #06283a;
      --ld-navy-mid: #0a3d5c;
      --ld-cyan: #22d3ee;
      --ld-cyan-dk: #0891b2;
      --ld-surface: #ecfeff;
      --ld-border: #99f6e4;
      --ld-accent: #22d3ee;
      max-height: none !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: linear-gradient(180deg, #f0fdfa 0%, #fff 48px) !important;
      border-right: 2px solid var(--ld-border) !important;
      box-shadow: 4px 0 24px rgba(6, 40, 58, 0.12) !important;
    }
    #mySidepanel .ld-panel-top {
      background: linear-gradient(135deg, var(--ld-navy) 0%, var(--ld-navy-mid) 55%, #0e7490 100%);
      padding: 10px 12px 12px;
      margin: 0;
    }
    #mySidepanel .ld-brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
    }
    #mySidepanel .ld-mark-wrap {
      width: 36px; height: 36px; flex-shrink: 0;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(34,211,238,0.45);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    #mySidepanel .ld-mark-wrap img { width: 24px; height: 24px; object-fit: contain; }
    #mySidepanel .ld-identity {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;
    }
    #mySidepanel .ld-identity #ld-profile-section {
      display: none !important; margin: 0 !important; padding: 0 !important;
    }
    #mySidepanel .ld-identity #ld-profile-section.ld-show {
      display: block !important;
    }
    #mySidepanel .ld-identity #profileSpot {
      display: flex !important; align-items: center; gap: 8px;
      text-decoration: none; color: #fff; min-width: 0;
    }
    #mySidepanel .ld-identity #profileSpot img,
    #mySidepanel .ld-identity .ld-mini-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      border: 2px solid var(--ld-cyan); object-fit: cover; flex-shrink: 0;
    }
    #mySidepanel .ld-identity-name {
      font-size: 13px; font-weight: 700; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #mySidepanel .ld-identity-sub {
      font-size: 10px; color: rgba(255,255,255,0.72);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #mySidepanel .ld-header-actions {
      display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    }
    #mySidepanel #le2-li-dot {
      width: 8px; height: 8px; border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.9);
      box-shadow: 0 0 6px rgba(34,211,238,0.6);
    }
    #mySidepanel .ld-close-btn {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: rgba(255,255,255,0.12); color: #fff; font-size: 18px;
      line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    #mySidepanel .ld-close-btn:hover { background: rgba(34,211,238,0.25); }
    #mySidepanel .ld-header-signout {
      border: none; background: transparent; color: rgba(255,255,255,0.75);
      font-size: 10px; cursor: pointer; text-decoration: underline; padding: 0;
    }
    #mySidepanel .sidebar-header-dashboard,
    #mySidepanel .menu-divider-menu:first-of-type { display: none !important; }
    #mySidepanel .ld-account-card {
      margin: 10px 12px; padding: 14px;
      background: #fff; border: 1px solid var(--ld-border);
      border-radius: 10px; box-shadow: 0 2px 8px rgba(6, 40, 58, 0.06);
    }
    #mySidepanel .ld-account-card.ld-compact { display: none !important; }
    #mySidepanel .ld-account-title {
      font-size: 11px; font-weight: 800; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--ld-navy-mid); margin-bottom: 4px;
    }
    #mySidepanel .ld-account-card .ld-input {
      width: 100%; box-sizing: border-box; margin-bottom: 8px;
      padding: 9px 11px; border-radius: 6px; border: 1.5px solid #cffafe;
      font-size: 12px; background: var(--ld-surface); color: var(--ld-navy);
    }
    #mySidepanel .ld-account-card .ld-input:focus {
      outline: none; border-color: var(--ld-cyan); box-shadow: 0 0 0 2px rgba(34,211,238,0.25);
    }
    #mySidepanel .ld-btn-primary {
      width: 100%; padding: 9px; border: none; border-radius: 6px;
      background: linear-gradient(180deg, var(--ld-cyan-dk) 0%, var(--ld-navy-mid) 100%);
      color: #fff; font-weight: 700; font-size: 12px; cursor: pointer;
    }
    #mySidepanel .ld-btn-primary:hover { filter: brightness(1.08); }
    #mySidepanel .ld-btn-secondary {
      width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 6px;
      border-radius: 6px; background: var(--ld-surface); color: var(--ld-navy-mid);
      font-weight: 600; font-size: 11px; text-align: center; text-decoration: none;
      border: 1px solid var(--ld-border); display: block; cursor: pointer;
    }
    #mySidepanel .ld-btn-ghost {
      width: 100%; padding: 8px; border: 1px solid var(--ld-border);
      border-radius: 6px; background: #fff; color: var(--ld-muted);
      font-size: 11px; cursor: pointer; color: #64748b;
    }
    #mySidepanel #ld-v2-status { font-size: 11px; color: var(--ld-muted); margin-bottom: 10px; line-height: 1.4; }
    #mySidepanel #ld-v2-error {
      font-size: 11px; color: #b91c1c; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 6px; padding: 8px; margin-bottom: 8px;
    }
    #mySidepanel #ld-v2-li-badge {
      font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
      width: fit-content; margin-bottom: 8px;
    }
    #mySidepanel .ld-tools-hdr {
      font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--ld-cyan-dk);
      padding: 8px 14px 6px; border-top: 2px solid var(--ld-border);
      margin-top: 4px;
    }
    #mySidepanel .le2-actions-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 0 10px 12px; }
    #mySidepanel .le2-action-item {
      flex-direction: column; align-items: flex-start; gap: 6px;
      padding: 10px 8px; border-radius: 8px; border: 1px solid #e0f2fe;
      border-left: none !important; background: #fff;
      box-shadow: 0 1px 2px rgba(6,40,58,0.04);
    }
    #mySidepanel .le2-action-item:hover {
      border-color: var(--ld-cyan); background: var(--ld-surface);
    }
    #mySidepanel .le2-action-item.active {
      border-color: var(--ld-cyan-dk); background: #ecfeff;
    }
    #mySidepanel .le2-action-item.active .le2-action-label { color: var(--ld-navy); }
    #mySidepanel .le2-action-icon {
      width: 32px; height: 32px; border-radius: 6px !important;
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    }
    #mySidepanel .le2-action-label { font-size: 10px; font-weight: 600; line-height: 1.25; }
    #mySidepanel .le2-actions-list-hdr { display: none; }
    #mySidepanel .le2-btn, #mySidepanel .le2-btn-sm {
      background: linear-gradient(135deg, #14b8a6, #0e7490) !important;
      border: none !important; border-radius: 4px !important;
    }
    .le2-action-modal-sheet {
      border-radius: 8px !important;
      border: 2px solid var(--ld-navy-mid, #0a3d5c) !important;
      box-shadow: 0 20px 50px rgba(6, 40, 58, 0.35) !important;
      background: #fff !important;
    }
    .le2-action-modal-hdr {
      background: linear-gradient(90deg, #06283a, #0e7490) !important;
      border-bottom: 2px solid #22d3ee !important;
    }
    .le2-action-modal-hdr h3 { color: #fff !important; font-size: 13px !important; }
    .le2-action-modal-close, .le2-action-modal-back {
      background: rgba(255,255,255,0.15) !important; color: #fff !important;
      border-radius: 4px !important;
    }
    #mySidepanel .ld-identity #profileSpot .ld-identity-name {
      font-size: 13px; font-weight: 700; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #mySidepanel .ld-avatar-fallback {
      display: inline-flex !important; align-items: center; justify-content: center;
      background: rgba(34,211,238,0.22); color: #fff; font-weight: 800; font-size: 13px;
      border: 2px solid var(--ld-cyan); border-radius: 50%; width: 32px; height: 32px;
    }
    .le2-action-modal-body {
      background: #fff !important;
      color: #0f172a;
    }
    .le2-action-modal .le2-card,
    .le2-action-modal .le2-search-form-card {
      background: #fff !important;
      border-color: #cce8e4 !important;
    }
    .le2-panel-title { color: var(--ld-navy-mid, #0a3d5c) !important; }
    .le2-panel-desc { color: #475569 !important; }
    .le2-token { background: #ecfeff !important; border-color: #a5f3fc !important; color: #0e7490 !important; }
    .le2-action-modal-icon {
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      border-radius: 0 !important;
    }

    /* ── LinkedEmpire controls (global — modals + panels, not v2 blue pills) ── */
    .le2-btn,
    .le2-hub-btn,
    button.le2-btn[data-le2-start],
    button.le2-btn[data-le2-new-action],
    #le2-wsi-start,
    #le2-bm-start,
    #le2-bp-start,
    #le2-ch-stop-all {
      background: linear-gradient(135deg, #14b8a6 0%, #0e7490 52%, #0a3d5c 100%) !important;
      border: none !important;
      border-radius: 4px !important;
      box-shadow: 0 2px 10px rgba(20, 184, 166, 0.3) !important;
      color: #fff !important;
      font-weight: 700 !important;
      letter-spacing: 0.02em;
    }
    .le2-btn:hover:not(:disabled),
    .le2-hub-btn:hover:not(:disabled) { filter: brightness(1.06) !important; }
    .le2-btn-sm:not(.gray):not(.red):not(.green) {
      background: linear-gradient(135deg, #14b8a6, #0e7490) !important;
      border-radius: 4px !important;
      box-shadow: 0 1px 4px rgba(20, 184, 166, 0.25) !important;
    }
    .le2-btn-ghost {
      background: #fff !important;
      color: #0e7490 !important;
      border: 1.5px solid #5eead4 !important;
      border-radius: 4px !important;
      box-shadow: none !important;
      font-weight: 600 !important;
    }
    .le2-btn-ghost:hover { background: #f0fdfa !important; }

    /* Inputs — left teal accent bar, square corners (v2 uses soft rounded gray boxes) */
    .le2-input,
    .le2-textarea,
    select.le2-input,
    .le2-action-modal .le2-input,
    .le2-action-modal .le2-textarea,
    .le2-action-modal select.le2-input {
      border: 1px solid #cce8e4 !important;
      border-left: 4px solid #14b8a6 !important;
      border-radius: 2px !important;
      background: #f8fffe !important;
      padding: 10px 12px 10px 10px !important;
      font-size: 13px !important;
      color: #0c4a6e !important;
      box-shadow: inset 0 1px 2px rgba(6, 78, 59, 0.05) !important;
    }
    .le2-input:focus,
    .le2-textarea:focus,
    select.le2-input:focus {
      border-color: #99f6e4 !important;
      border-left-color: #22d3ee !important;
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.14), inset 0 1px 2px rgba(6, 78, 59, 0.05) !important;
      outline: none !important;
    }
    .le2-field label {
      font-size: 10px !important;
      font-weight: 800 !important;
      letter-spacing: 0.07em !important;
      text-transform: uppercase !important;
      color: #0e7490 !important;
    }
    select.le2-input {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230e7490' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
      background-repeat: no-repeat !important;
      background-position: right 10px center !important;
      padding-right: 28px !important;
    }

    /* Progress / loading — teal not v2 blue */
    .le2-stage-spinner {
      border-color: #d1fae5 !important;
      border-top-color: #14b8a6 !important;
    }
    .le2-stage-progress-bar {
      background: linear-gradient(90deg, #0e7490, #2dd4bf) !important;
    }
    .le2-action-item.active {
      border-left-color: #14b8a6 !important;
      background: #f0fdfa !important;
    }
    .le2-action-item.active .le2-action-label { color: #0e7490 !important; }
  `;

  if (window.LE2 && LE2.injectStyles) {
    LE2.injectStyles("ld-brand-styles", css);
  } else {
    const el = document.createElement("style");
    el.id = "ld-brand-styles";
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
