/**
 * LinkedEmpire side panel adapter for the v2 Unipile UI.
 * CRM Bearer token owns the account (not LinkedIn lk-id / accessCheck).
 */
(function initLe2App() {
  window.LE2 = window.LE2 || {};
  window.LE2App = window.LE2App || {};

  const DEFAULT_API_BASE =
    (typeof PLATFORM_URL !== "undefined" ? PLATFORM_URL : "https://app.linkedempire.com") + "/api/v2";

  const S = {
    hasToken: false,
    linkedinConnected: false,
    linkedinDisconnected: false,
    _apiBase: DEFAULT_API_BASE,
  };

  LE2.injectStyles(
    "le2-app-styles",
    `
    .le2-input {
      width: 100%; box-sizing: border-box; padding: 10px 12px 10px 10px;
      border: 1px solid #cce8e4; border-left: 4px solid #14b8a6;
      border-radius: 2px; font-size: 13px; outline: none; transition: border-color .15s, box-shadow .15s;
      background: #f8fffe; color: #0c4a6e;
      box-shadow: inset 0 1px 2px rgba(6, 78, 59, 0.05);
    }
    .le2-input:focus { border-color: #99f6e4; border-left-color: #22d3ee; box-shadow: 0 0 0 2px rgba(34,211,238,.14), inset 0 1px 2px rgba(6,78,59,.05); }
    select.le2-input { appearance: none; background-color: #f8fffe; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230e7490' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; cursor: pointer; }
    .le2-textarea {
      width: 100%; box-sizing: border-box; padding: 10px 12px 10px 10px;
      border: 1px solid #cce8e4; border-left: 4px solid #14b8a6;
      border-radius: 2px; font-size: 13px; font-family: inherit; resize: vertical; min-height: 72px; outline: none;
      background: #f8fffe; color: #0c4a6e;
      box-shadow: inset 0 1px 2px rgba(6, 78, 59, 0.05);
    }
    .le2-textarea:focus { border-color: #99f6e4; border-left-color: #22d3ee; box-shadow: 0 0 0 2px rgba(34,211,238,.14), inset 0 1px 2px rgba(6,78,59,.05); }
    .le2-field label {
      display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.07em;
      text-transform: uppercase; color: #0e7490; margin-bottom: 5px;
    }
    .le2-btn {
      width: 100%; padding: 10px;
      background: linear-gradient(135deg, #14b8a6 0%, #0e7490 52%, #0a3d5c 100%);
      color: #fff; border: none; border-radius: 4px; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: filter .15s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      box-shadow: 0 2px 10px rgba(20, 184, 166, 0.3);
    }
    .le2-btn:hover { filter: brightness(1.08); }
    .le2-btn:disabled { opacity: .55; cursor: not-allowed; }
    .le2-btn-sm {
      padding: 5px 11px; background: linear-gradient(135deg, #14b8a6, #0e7490); color: #fff; border: none;
      border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(20, 184, 166, 0.25);
    }
    .le2-btn-sm:hover { filter: brightness(1.08); }
    .le2-btn-sm.green { background: #15803e; }
    .le2-btn-sm.green:hover { background: #166534; }
    .le2-btn-sm.red { background: #dc2626; }
    .le2-btn-sm.red:hover { background: #b91c1c; }
    .le2-btn-sm.gray { background: #64748b; }
    .le2-btn-sm.gray:hover { background: #475569; }
    .le2-btn-ghost {
      padding: 5px 11px; background: #fff; color: #0e7490; border: 1.5px solid #5eead4;
      border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;
    }
    .le2-btn-ghost:hover { background: #f0fdfa; }
    .le2-btn-danger { padding: 9px 16px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; width: 100%; }
    .le2-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      padding: 11px 13px; margin-bottom: 8px;
    }
    .le2-empty { padding: 28px 18px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6; }
    #le2-toast {
      position: fixed; right: 18px; bottom: 18px; z-index: 2147483646; max-width: 280px;
      padding: 10px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; color: #fff;
      box-shadow: 0 10px 30px rgba(15,23,42,.25); display: none;
    }
    #le2-toast.info { background: #0f172a; }
    #le2-toast.success { background: #15803d; }
    #le2-toast.error { background: #b91c1c; }
    #mySidepanel.sidepanel { overflow-y: auto; overflow-x: hidden; }
    #mySidepanel .menus { height: auto; overflow: visible; }
    @keyframes le2spin { to { transform: rotate(360deg); } }
    `
  );

  function contextFromResult(payload) {
    return payload?.context || payload || {};
  }

  function renderLinkedInStatusDot() {
    const dot = document.getElementById("le2-li-dot");
    if (!dot) return;
    if (!S.hasToken) {
      dot.style.display = "none";
      return;
    }
    dot.style.display = "block";
    if (S.linkedinDisconnected) {
      dot.style.background = "#f59e0b";
      dot.style.boxShadow = "0 0 6px rgba(245,158,11,0.6)";
      dot.title = "LinkedIn disconnected — detect and save your session";
      return;
    }
    dot.style.background = S.linkedinConnected ? "#22d3ee" : "#ef4444";
    dot.style.boxShadow = S.linkedinConnected
      ? "0 0 8px rgba(34,211,238,0.75)"
      : "0 0 6px rgba(239,68,68,0.5)";
    dot.title = S.linkedinConnected
      ? "LinkedIn connected"
      : "LinkedIn not connected — detect session or open CRM Integrations";
  }

  function applyMenuGate() {
    const menus = document.getElementById("menus");
    const divider = document.getElementById("ld-v2-actions-divider");
    const toolsHdr = document.getElementById("ld-tools-header");
    const showActions = S.hasToken && S.linkedinConnected;
    if (menus) {
      menus.style.display = showActions ? "" : "none";
      menus.style.opacity = showActions ? "1" : "0.5";
      menus.style.pointerEvents = showActions ? "auto" : "none";
    }
    if (divider) divider.style.display = "none";
    if (toolsHdr) toolsHdr.style.display = showActions ? "" : "none";
    const authCard = document.getElementById("authorize-button-container");
    if (authCard) authCard.style.display = "none";
  }

  function toast(msg, type) {
    let el = document.getElementById("le2-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "le2-toast";
      document.body.appendChild(el);
    }
    el.className = type === "error" ? "error" : type === "success" ? "success" : "info";
    el.textContent = String(msg || "");
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.style.display = "none";
    }, 3200);
  }

  function setLoading() {}

  function btnLoad(btn, label) {
    if (!btn) return;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span style="display:inline-block;width:11px;height:11px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:le2spin .6s linear infinite;vertical-align:middle;margin-right:4px"></span>${label}`;
    btn.disabled = true;
    btn.style.opacity = "0.75";
  }

  function btnReset(btn) {
    if (!btn) return;
    if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
    btn.disabled = false;
    btn.style.opacity = "";
  }

  function buildCtx() {
    return {
      S,
      callAction: function callAction(action, payload) {
        return LDV2.callAction(action, payload);
      },
      toast,
      setLoading,
      btnLoad,
      btnReset,
      get apiBase() {
        return S._apiBase;
      },
      get api_base() {
        return S._apiBase;
      },
    };
  }

  function renderMenus() {
    const menus = document.getElementById("menus");
    if (!menus || typeof LE2.renderActionsTab !== "function") return;
    LE2.renderActionsTab(menus, buildCtx());
    const footer = document.createElement("div");
    footer.className = "menu-divider";
    footer.style.marginTop = "20px";
    footer.innerHTML = '<span class="footer-text">&copy; LinkedEmpire</span>';
    menus.appendChild(footer);
  }

  async function refreshAuthGate() {
    if (!window.LDV2) {
      S.hasToken = false;
      LE2App.hasToken = false;
      applyMenuGate();
      renderLinkedInStatusDot();
      return false;
    }
    try {
      const ctxRes = await LDV2.callAction("client_context");
      const context = contextFromResult(ctxRes);
      S.hasToken = !!context.has_token;
      LE2App.hasToken = S.hasToken;
      if (context.api_base) S._apiBase = context.api_base;
      applyMenuGate();
      renderLinkedInStatusDot();
      return S.hasToken;
    } catch (_error) {
      S.hasToken = false;
      LE2App.hasToken = false;
      applyMenuGate();
      renderLinkedInStatusDot();
      return false;
    }
  }

  function syncLdProfileUi() {
    const show = !!(S.hasToken && S.linkedinConnected);
    const section = document.getElementById("ld-profile-section");
    const spot = document.getElementById("profileSpot");
    const identityText = document.getElementById("ld-identity-text");
    if (!section || !spot) return;
    if (show && window.__ldMeCardHtml) {
      spot.innerHTML = window.__ldMeCardHtml;
      section.classList.add("ld-show");
      section.style.display = "";
      if (identityText) identityText.style.display = "none";
    } else {
      spot.innerHTML = "";
      section.classList.remove("ld-show");
      section.style.display = "none";
    }
  }

  window.syncLdProfileUi = syncLdProfileUi;
  LE2App.syncProfileUi = syncLdProfileUi;

  LE2App.hasToken = false;
  LE2App.linkedinConnected = false;
  LE2App.refreshAuthGate = refreshAuthGate;
  LE2App.buildCtx = buildCtx;
  LE2App.toast = toast;

  LE2App.setLinkedInStatus = function setLinkedInStatus(state) {
    S.linkedinConnected = state === "connected";
    S.linkedinDisconnected = state === "disconnected";
    LE2App.linkedinConnected = S.linkedinConnected;
    applyMenuGate();
    renderLinkedInStatusDot();
    syncLdProfileUi();
  };

  LE2App.setSession = function setSession(options) {
    if (options && typeof options.hasToken === "boolean") {
      S.hasToken = options.hasToken;
      LE2App.hasToken = S.hasToken;
    }
    if (options && options.apiBase) S._apiBase = options.apiBase;
    applyMenuGate();
    renderLinkedInStatusDot();
    syncLdProfileUi();
  };

  const origOpen = LE2.openActionModal;
  if (typeof origOpen === "function") {
    LE2.openActionModal = function openActionModal(item, ctx) {
      if (!S.hasToken) {
        toast("Sign in to LinkedEmpire first", "error");
        const panel = document.getElementById("mySidepanel");
        if (panel) {
          panel.style.display = "block";
          panel.classList.add("ld-open");
        }
        document.getElementById("ld-v2-account")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (!S.linkedinConnected) {
        toast("Connect your LinkedIn session first", "error");
        const panel = document.getElementById("mySidepanel");
        if (panel) {
          panel.style.display = "block";
          panel.classList.add("ld-open");
        }
        document.getElementById("ld-v2-account")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const side = document.getElementById("mySidepanel");
      if (side) side.style.display = "none";
      return origOpen(item, ctx || buildCtx());
    };
  }

  window.checkAuthAndShowCard = function checkAuthAndShowCard() {
    refreshAuthGate().then((hasToken) => {
      if (hasToken) return;
      const sidePanel = document.getElementById("mySidepanel");
      if (sidePanel) sidePanel.style.display = "block";
      document.getElementById("ld-v2-account")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      renderMenus();
      refreshAuthGate();
    });
  } else {
    renderMenus();
    refreshAuthGate();
  }
})();
