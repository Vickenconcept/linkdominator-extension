(function initAudienceManagePanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  async function loadEspProviders(ctx) {
    try {
      const res = await ctx.callAction("get_esp_config");
      const rows = LE2.extractList(res.config, "data");
      return rows.filter((r) => r.enabled !== false);
    } catch (_) {
      return [];
    }
  }

  async function exportListCsv(ctx, sourceId, name) {
    const res = await ctx.callAction("list_sn_imported_leads", {
      query: { source_external_id: sourceId, limit: 500 },
    });
    const leads = LE2.extractList(res.leads, "data");
    if (!leads.length) throw new Error("No leads in this list.");
    R.downloadCsv(`${(name || sourceId).replace(/[^\w.-]+/g, "-")}.csv`, leads, [
      { label: "Name", value: (l) => l.full_name || l.name || "" },
      { key: "headline", label: "Headline" },
      { key: "company_name", label: "Company" },
      { key: "location", label: "Location" },
      { key: "email", label: "Email" },
      { key: "public_identifier", label: "LinkedIn ID" },
      { key: "profile_url", label: "Profile URL" },
    ]);
  }

  async function pushListToEsp(ctx, sourceId, provider) {
    const res = await ctx.callAction("list_sn_imported_leads", {
      query: { source_external_id: sourceId, limit: 200 },
    });
    const leads = LE2.extractList(res.leads, "data");
    const leadIds = leads.map((l) => l.id).filter(Boolean);
    if (!leadIds.length) throw new Error("No CRM lead ids found for ESP push.");
    const pushRes = await ctx.callAction("esp_push_leads", {
      input: { provider, lead_ids: leadIds },
    });
    const data = pushRes?.data ?? pushRes?.result?.data ?? pushRes ?? {};
    return {
      sent: Number(data.sent ?? 0),
      failed: Number(data.failed ?? 0),
      total: Number(data.total ?? leadIds.length),
      message: data.message || "",
      errors: Array.isArray(data.errors) ? data.errors : [],
    };
  }

  async function renderLists(container, ctx) {
    const listEl = container.querySelector("#le2-am-list");
    const espHint = container.querySelector("#le2-am-esp-hint");
    listEl.innerHTML = "<div class='le2-mini-row'>Loading…</div>";

    const [sourcesRes, esps] = await Promise.all([
      ctx.callAction("list_sn_sources"),
      loadEspProviders(ctx),
    ]);
    const sources = LE2.extractList(sourcesRes?.sources ?? sourcesRes, "data");

    if (espHint) {
      espHint.textContent = esps.length
        ? `ESP configured: ${esps.map((e) => e.provider).join(", ")}`
        : "No ESP configured in CRM — CSV export still available.";
    }

    if (!sources.length) {
      listEl.innerHTML = "<div class='le2-mini-row'>No audiences yet. Create one first.</div>";
      return;
    }

    listEl.innerHTML = sources
      .map((s) => {
        const id = s.source_external_id || s.id || "";
        const name = s.source_name || id;
        const count = s.leads_count ?? 0;
        const espBtns = esps.length
          ? esps
              .map(
                (e) =>
                  `<button class="le2-btn-sm" data-esp="${id}" data-provider="${e.provider}">ESP: ${e.provider}</button>`
              )
              .join("")
          : "";
        return `
        <div class="le2-mini-row" style="flex-direction:column;align-items:stretch;gap:6px">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <div>
              <strong>${name}</strong>
              <div style="color:#64748b;font-size:10px">${count} contacts</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button class="le2-btn-sm gray" data-csv="${id}" data-name="${name}">Export CSV</button>
            ${espBtns}
          </div>
        </div>`;
      })
      .join("");

    listEl.querySelectorAll("[data-csv]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        ctx.btnLoad(btn, "Exporting…");
        try {
          await exportListCsv(ctx, btn.dataset.csv, btn.dataset.name);
          ctx.toast("CSV downloaded", "success");
        } catch (err) {
          ctx.toast(err.message || "CSV export failed", "error");
        } finally {
          ctx.btnReset(btn);
        }
      });
    });

    listEl.querySelectorAll("[data-esp]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const provider = btn.dataset.provider || "ESP";
        ctx.btnLoad(btn, `Pushing…`);
        try {
          const result = await pushListToEsp(ctx, btn.dataset.esp, provider);
          if (result.failed > 0 && result.sent === 0) {
            const detail = result.errors[0] || result.message || "Push failed";
            ctx.toast(`${provider}: ${detail}`, "error");
          } else if (result.failed > 0) {
            ctx.toast(
              `${provider}: ${result.sent} subscribed, ${result.failed} failed`,
              "success"
            );
          } else {
            ctx.toast(
              result.message || `Subscribed ${result.sent} to ${provider}`,
              "success"
            );
          }
        } catch (err) {
          ctx.toast(err.message || `Push to ${provider} failed`, "error");
        } finally {
          ctx.btnReset(btn);
        }
      });
    });
  }

  LE2.panels["audience-manage"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Export each audience to CSV or push to your configured ESP (CRM settings).</p>
        <div id="le2-am-esp-hint" style="font-size:10px;color:#64748b;margin-bottom:10px"></div>
        <div class="le2-mini-list" id="le2-am-list"></div>
        <button class="le2-btn-ghost" id="le2-am-refresh" style="margin-top:10px">Refresh lists</button>
      `;
    },

    bind(container, ctx) {
      renderLists(container, ctx);
      container.querySelector("#le2-am-refresh")?.addEventListener("click", () => renderLists(container, ctx));
    },
  };
})();
