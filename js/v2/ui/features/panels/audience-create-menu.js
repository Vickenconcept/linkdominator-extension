(function initAudienceCreateMenu() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};

  LE2.panels["audience-create-menu"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Add leads to a CRM audience using search or a LinkedIn URL.</p>
        <button class="le2-btn le2-hub-btn" data-create="search">Search &amp; save (filters)</button>
        <button class="le2-btn le2-btn-ghost le2-hub-btn" data-create="url" style="margin-top:8px">Import from LinkedIn URL</button>
      `;
    },

    bind(container, ctx, meta) {
      const hubState = {
        panelKey: "audience-hub",
        title: meta.label || "Audience",
        color: meta.color,
        meta,
        item: meta,
        ctx,
        back: null,
      };
      const createBack = {
        panelKey: "audience-create-menu",
        title: "Create audience",
        color: meta.color,
        meta,
        item: meta,
        ctx,
        back: hubState,
      };

      container.querySelector('[data-create="search"]')?.addEventListener("click", () => {
        LE2.openActionSubPanel("audience-build", "Search audience", ctx, meta, createBack);
      });
      container.querySelector('[data-create="url"]')?.addEventListener("click", () => {
        LE2.openActionSubPanel("audience-import-url", "Import from URL", ctx, meta, createBack);
      });
    },
  };
})();
