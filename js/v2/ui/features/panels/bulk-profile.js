(function initBulkProfilePanels() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  function renderShell(container, desc) {
    container.innerHTML = `
      <p class="le2-panel-desc">${desc}</p>
      <div class="le2-field">
        <label>Audience <span style="color:#ef4444">*</span></label>
        <select class="le2-input" id="le2-bp-list">
          <option value="">Loading audiences…</option>
        </select>
      </div>
      <div class="le2-field">
        <label>Max people</label>
        <input class="le2-input" id="le2-bp-limit" type="number" min="1" max="100" value="25" placeholder="e.g. 25" />
      </div>
      <div class="le2-field">
        <label>Delay between actions (seconds)</label>
        <input class="le2-input" id="le2-bp-delay" type="number" min="15" value="30" placeholder="Minimum 15 seconds" />
      </div>
      <button class="le2-btn" id="le2-bp-start" data-le2-start>Start</button>
      <button class="le2-btn le2-btn-ghost" id="le2-bp-stop" data-le2-stop style="display:none;margin-top:8px">Stop</button>
    `;
  }

  async function loadAudienceLeads(ctx, listId, limit) {
    const res = await ctx.callAction("list_sn_imported_leads", {
      query: { source_external_id: listId },
    });
    return LE2.extractList(res.leads, "data")
      .slice(0, limit)
      .map((lead) => ({
        ...lead,
        name: lead.full_name || lead.name,
        headline: lead.headline,
        company: lead.company_name,
        provider_id: lead.provider_profile_id || lead.provider_id,
        public_identifier: lead.public_identifier || lead.provider_profile_id,
      }));
  }

  function bindRunner(container, ctx, action, title) {
    LE2.populateAudienceSelect(ctx, container.querySelector("#le2-bp-list"));

    container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
      const listId = LE2.readAudienceSelect(container, "#le2-bp-list");
      const limit = Math.max(1, Number(container.querySelector("#le2-bp-limit")?.value) || 25);
      const delaySec = Math.max(15, Number(container.querySelector("#le2-bp-delay")?.value) || 30);
      if (!listId) return ctx.toast("Select an audience first", "error");

      await R.runBatchAction(container, ctx, {
        startSelector: "#le2-bp-start",
        loadingTitle: "Loading audience…",
        loadingSub: "Preparing people from your CRM list",
        emptyMessage: "This audience has no leads yet.",
        progressTitle: `${title}…`,
        doneTitle: `${title} complete`,
        newLabel: "Run again",
        delayMs: delaySec * 1000,
        toastMessage: `${title} finished`,
        doneSummary: (result) => {
          if (result.fail === 0) return `Completed ${result.ok} of ${result.total}.`;
          if (action === "endorse") {
            return `Completed ${result.ok} of ${result.total}. Failures are often non-1st-degree profiles or skills already endorsed.`;
          }
          return `Completed ${result.ok} of ${result.total}.`;
        },
        loadItems: () => loadAudienceLeads(ctx, listId, limit),
        onItem: async (person) => {
          const profileId = LE2.profileId(person);
          if (!profileId) throw new Error("missing profile id");
          await ctx.callAction("profile_action", {
            input: { profile_id: profileId, action },
          });
        },
      });
    });
  }

  LE2.panels["bulk-profile-view"] = {
    render(container) {
      renderShell(
        container,
        "Visit profiles from a CRM audience (helps with visibility). Best for people already in your network."
      );
    },
    bind(container, ctx) {
      bindRunner(container, ctx, "view_profile", "View profiles");
    },
  };

  LE2.panels["bulk-profile-endorse"] = {
    render(container) {
      renderShell(
        container,
        "Endorse one skill for each person in a CRM audience. Requires 1st-degree connections with skills open for endorsement (LinkedIn only returns those IDs)."
      );
    },
    bind(container, ctx) {
      bindRunner(container, ctx, "endorse", "Endorse skills");
    },
  };
})();
