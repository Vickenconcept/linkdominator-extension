(function initAudienceHub() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};

  LE2.panels["audience-hub"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Build and manage CRM audiences — same flow as the classic extension.</p>
        <button class="le2-btn le2-hub-btn" data-hub="create">
          <span>Create a new audience</span>
        </button>
        <button class="le2-btn le2-btn-ghost le2-hub-btn" data-hub="manage" style="margin-top:8px">
          <span>Manage audiences</span>
        </button>
      `;
    },

    bind(container, ctx, meta) {
      const hubState = {
        panelKey: meta.panel,
        title: meta.label,
        color: meta.color,
        meta,
        item: meta,
        ctx,
        back: null,
      };

      container.querySelector('[data-hub="create"]')?.addEventListener("click", () => {
        LE2.openActionSubPanel("audience-create-menu", "Create audience", ctx, meta, hubState);
      });

      container.querySelector('[data-hub="manage"]')?.addEventListener("click", () => {
        LE2.openActionSubPanel("audience-manage", "Manage audiences", ctx, meta, hubState);
      });
    },
  };
})();
