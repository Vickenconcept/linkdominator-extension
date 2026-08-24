(function initActionsTab() {
  window.LE2 = window.LE2 || {};

  LE2.renderActionsTab = function renderActionsTab(body, ctx) {
    const menuHtml = LE2.actionItems
      .map((item) => `
        <div class="le2-action-item" data-action-id="${item.id}" title="${item.hint || item.label}">
          ${LE2.iconBadge(item.icon || "actions", item.color, 14)}
          <span class="le2-action-label">${item.label}</span>
          <span class="le2-action-running" hidden aria-hidden="true"><span></span><span></span><span></span></span>
        </div>
      `)
      .join("");

    body.innerHTML = `
      <div class="le2-actions-list-wrap">
        <div class="le2-actions-list-hdr">Actions</div>
        <div class="le2-actions-list">${menuHtml}</div>
      </div>
    `;

    body.querySelectorAll(".le2-action-item").forEach((el) => {
      el.addEventListener("click", () => {
        const item = LE2.getActionItem(el.dataset.actionId);
        LE2.openActionModal(item, ctx);
      });
    });

    LE2.syncActiveActionMenu?.(LE2.getActiveActionId?.());
  };

  LE2.syncActiveActionMenu = function syncActiveActionMenu(actionId) {
    const runningIds = new Set(LE2.getRunningActionIds?.() || []);
    document.querySelectorAll(".le2-action-item").forEach((el) => {
      const itemId = el.dataset.actionId;
      const isActive = Boolean(actionId && itemId === actionId);
      const isRunning = Boolean(itemId && runningIds.has(itemId));
      el.classList.toggle("active", isActive);
      el.classList.toggle("running", isRunning);
      el.setAttribute("aria-current", isActive ? "true" : "false");
      const runningEl = el.querySelector(".le2-action-running");
      if (runningEl) {
        runningEl.hidden = !isRunning;
        runningEl.setAttribute("aria-hidden", isRunning ? "false" : "true");
      }
      if (isActive || isRunning) {
        const item = LE2.getActionItem(itemId);
        el.style.setProperty("--le2-action-accent", item?.color || "#22d3ee");
      } else {
        el.style.removeProperty("--le2-action-accent");
      }
    });
  };
})();
