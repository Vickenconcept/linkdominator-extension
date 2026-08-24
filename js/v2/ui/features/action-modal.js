(function initActionModal() {
  window.LE2 = window.LE2 || {};

  let modalEl = null;
  let bodyEl = null;
  let titleEl = null;
  let iconEl = null;
  let backBtn = null;
  let closeBtn = null;
  let activeItem = null;
  let activeCtx = null;
  let backState = null;
  /** @type {Set<string>} */
  const runningActionIds = new Set();
  /** @type {Map<string, HTMLElement>} */
  const panelHosts = new Map();

  function getActionId(item, meta) {
    return item?.id || meta?.id || null;
  }

  function wrapModalCtx(ctx, item) {
    if (!ctx) return ctx;
    const actionId = item?.id || null;
    return {
      ...ctx,
      setLoading(v) {
        ctx.setLoading(v);
        LE2.setActionPanelRunning(!!v, actionId || activeItem?.id || null);
      },
    };
  }

  function syncActionMenuActive() {
    LE2.syncActiveActionMenu?.(LE2.getActiveActionId?.());
  }

  function ensureModal() {
    if (modalEl) return;
    modalEl = document.createElement("div");
    modalEl.id = "le2-action-modal";
    modalEl.className = "le2-action-modal";
    modalEl.innerHTML = `
      <div class="le2-action-modal-backdrop" aria-hidden="true"></div>
      <div class="le2-action-modal-sheet" role="dialog" aria-modal="true">
        <div class="le2-action-modal-hdr">
          <button type="button" class="le2-action-modal-back" id="le2-action-modal-back" aria-label="Back" style="display:none">${LE2.icon("arrowLeft", 14)}</button>
          <span class="le2-action-modal-icon" id="le2-action-modal-icon"></span>
          <h3 id="le2-action-modal-title"></h3>
          <button type="button" class="le2-action-modal-close" id="le2-action-modal-close" aria-label="Close">${LE2.icon("close", 14)}</button>
        </div>
        <div class="le2-action-modal-body" id="le2-action-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modalEl);
    bodyEl = modalEl.querySelector("#le2-action-modal-body");
    titleEl = modalEl.querySelector("#le2-action-modal-title");
    iconEl = modalEl.querySelector("#le2-action-modal-icon");
    backBtn = modalEl.querySelector("#le2-action-modal-back");
    closeBtn = modalEl.querySelector("#le2-action-modal-close");

    closeBtn.addEventListener("click", () => LE2.closeActionModal());

    backBtn.addEventListener("click", () => {
      if (!backState) return;
      LE2.renderModalPanel(backState);
    });

    document.addEventListener("keydown", (e) => {
      if (!modalEl?.classList.contains("open")) return;
      if (e.key !== "Escape") return;
      if (LE2.isActionPanelRunning?.()) return;
      LE2.closeActionModal();
    });
  }

  function ensurePanelHost(actionId) {
    if (!actionId) return null;
    let host = panelHosts.get(actionId);
    if (host && host.isConnected) return host;

    host = document.createElement("div");
    host.className = "le2-action-panel-host";
    host.dataset.actionId = actionId;
    host.hidden = true;
    bodyEl.appendChild(host);
    panelHosts.set(actionId, host);
    return host;
  }

  function showPanelHost(actionId) {
    panelHosts.forEach((host, id) => {
      host.hidden = id !== actionId;
    });
  }

  function updateModalHeader(state) {
    const item = state.item || LE2.getActionItem?.(state.meta?.id);
    const color = state.color || item?.color || "#64748b";
    const iconName = item?.icon || state.meta?.icon || "actions";
    if (iconEl) {
      iconEl.style.background = color;
      iconEl.innerHTML = LE2.icon(iconName, 14);
    }
    titleEl.textContent = state.title || "Action";
    backBtn.style.display = state.back ? "inline-flex" : "none";
  }

  function mountPanel(panelKey, meta, ctx, item, back) {
    const actionId = getActionId(item, meta);
    if (!actionId) return false;

    const panel = LE2.panels[panelKey];
    if (!panel) {
      ctx.toast(`Panel not found: ${panelKey}`, "error");
      return false;
    }

    const host = ensurePanelHost(actionId);
    const mountedKey = host.dataset.panelKey || "";
    const alreadyMounted = host.dataset.mounted === "1" && mountedKey === panelKey;

    if (!alreadyMounted) {
      host.innerHTML = "";
      panel.render(host, meta);
      LE2.panelRunner?.initShell?.(host);
      panel.bind(host, ctx, meta);
      host.dataset.mounted = "1";
      host.dataset.panelKey = panelKey;
      LE2.decoratePanelButtons?.(host);
    }

    showPanelHost(actionId);
    return true;
  }

  function showModalOpen() {
    modalEl.classList.add("open");
    syncActionMenuActive();
  }

  LE2.setActionPanelRunning = function setActionPanelRunning(running, actionId) {
    const id = actionId || activeItem?.id || null;
    if (!id) {
      if (!running) runningActionIds.clear();
      syncActionMenuActive();
      return;
    }
    if (running) runningActionIds.add(id);
    else runningActionIds.delete(id);
    syncActionMenuActive();
  };

  LE2.isActionPanelRunning = function isActionPanelRunning(actionId) {
    if (actionId) return runningActionIds.has(actionId);
    return runningActionIds.size > 0;
  };

  LE2.getRunningActionId = function getRunningActionId() {
    return runningActionIds.values().next().value || null;
  };

  LE2.getRunningActionIds = function getRunningActionIds() {
    return [...runningActionIds];
  };

  LE2.renderModalPanel = function renderModalPanel(state) {
    ensureModal();
    if (!state?.ctx) return;

    activeCtx = wrapModalCtx(state.ctx, state.item);
    activeItem = state.item || null;
    backState = state.back || null;

    updateModalHeader(state);

    if (!mountPanel(state.panelKey, state.meta || {}, activeCtx, state.item, backState)) return;
    showModalOpen();
  };

  LE2.openActionModal = function openActionModal(item, ctx) {
    ensureModal();

    activeCtx = wrapModalCtx(ctx, item);
    activeItem = item;
    backState = null;

    const host = ensurePanelHost(item.id);
    const alreadyMounted = host?.dataset.mounted === "1";

    updateModalHeader({
      title: item.label,
      color: item.color,
      meta: item,
      item,
      back: null,
    });

    if (alreadyMounted) {
      showPanelHost(item.id);
      showModalOpen();
      return;
    }

    LE2.renderModalPanel({
      panelKey: item.panel,
      title: item.label,
      color: item.color,
      meta: item,
      item,
      ctx,
      back: null,
    });
  };

  LE2.openActionSubPanel = function openActionSubPanel(subPanelKey, subTitle, ctx, meta, hubState) {
    LE2.renderModalPanel({
      panelKey: subPanelKey,
      title: subTitle,
      color: hubState?.color || "#64748b",
      meta: meta || {},
      item: hubState?.item || null,
      ctx,
      back: hubState || null,
    });
  };

  function clearAllPanelHosts() {
    panelHosts.forEach((host) => host.remove());
    panelHosts.clear();
    if (bodyEl) bodyEl.innerHTML = "";
  }

  LE2.closeActionModal = function closeActionModal(options = {}) {
    if (!modalEl) return;

    const running = LE2.isActionPanelRunning();
    if (running && !options.force) {
      modalEl.classList.remove("open");
      syncActionMenuActive();
      return;
    }

    modalEl.classList.remove("open");
    clearAllPanelHosts();
    activeItem = null;
    activeCtx = null;
    backState = null;
    runningActionIds.clear();
    backBtn.style.display = "none";
    syncActionMenuActive();
  };

  LE2.getActiveActionId = function getActiveActionId() {
    return activeItem?.id || null;
  };

  LE2.getActionModalContext = function getActionModalContext() {
    return { item: activeItem, ctx: activeCtx, back: backState };
  };
})();
