(function initCampaignHub() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};

  const TYPE_LABELS = {
    lead_gen: "Lead Gen",
    endorse: "Endorse",
    profile_views: "Profile Views",
    custom: "Custom",
  };
  const TYPE_COLORS = {
    lead_gen: "#3b82f6",
    endorse: "#f59e0b",
    profile_views: "#8b5cf6",
    custom: "#64748b",
  };
  const STATUS_STYLES = {
    active: { bg: "#dcfce7", color: "#15803d" },
    running: { bg: "#dbeafe", color: "#1d4ed8" },
    draft: { bg: "#f1f5f9", color: "#64748b" },
    paused: { bg: "#fef9c3", color: "#92400e" },
    stopped: { bg: "#fee2e2", color: "#b91c1c" },
    completed: { bg: "#dcfce7", color: "#15803d" },
  };

  function typePill(type) {
    const color = TYPE_COLORS[type] || "#64748b";
    const label = TYPE_LABELS[type] || type || "Custom";
    return `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px;background:${color}18;color:${color};border:1px solid ${color}40">${label}</span>`;
  }

  function statusPill(status) {
    const key = String(status || "draft").toLowerCase();
    const s = STATUS_STYLES[key] || STATUS_STYLES.draft;
    return `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px;background:${s.bg};color:${s.color};text-transform:capitalize">${key}</span>`;
  }

  function crmBaseFromCtx(ctx) {
    const raw = String(
      ctx?.apiBase ||
        ctx?.api_base ||
        ctx?.S?._apiBase ||
        (typeof PLATFORM_URL !== "undefined" ? PLATFORM_URL + "/api/v2" : "https://app.linkedempire.com/api/v2")
    ).trim();
    const base = raw.replace(/\/api\/v2\/?$/i, "").replace(/\/+$/, "");
    return base || "https://app.linkedempire.com";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function loadCampaigns(container, ctx) {
    const listEl = container.querySelector("#le2-ch-list");
    listEl.innerHTML = `<div style="padding:18px 12px;text-align:center;color:#94a3b8;font-size:12px">Loading campaigns…</div>`;

    try {
      const res = await ctx.callAction("list_campaigns");
      const campaigns = LE2.extractList(res.campaigns, "data") || res.campaigns?.data || [];
      if (!campaigns.length) {
        listEl.innerHTML = `
          <div style="padding:22px 14px;text-align:center">
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px">No campaigns yet</div>
            <div style="font-size:11px;color:#64748b;line-height:1.4">Create one in the CRM, then run or pause it from here.</div>
          </div>`;
        return;
      }

      const isRunning = (c) => c.status === "running" || c.status === "active";
      const crmBase = crmBaseFromCtx(ctx);

      listEl.innerHTML = campaigns
        .map((c) => {
          const accent = TYPE_COLORS[c.sequence_type] || "#94a3b8";
          const name = escapeHtml(c.name || "Untitled");
          return `
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px 12px 10px;background:#fff;border-left:3px solid ${accent}">
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
              ${typePill(c.sequence_type || "custom")}
              ${statusPill(c.status || "draft")}
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              ${
                isRunning(c)
                  ? `<button type="button" class="le2-btn-sm" data-pause="${c.id}" style="background:#fef9c3;color:#92400e;border-color:#fde68a">${LE2.btnLabel("Pause", "pause")}</button>`
                  : `<button type="button" class="le2-btn-sm green" data-run="${c.id}">${LE2.btnLabel("Run", "play")}</button>`
              }
              <a href="${crmBase}/campaigns/${c.id}/edit"
                target="_blank" rel="noopener noreferrer"
                style="margin-left:auto;font-size:11px;color:#3b82f6;text-decoration:none;font-weight:600">Open in CRM &rarr;</a>
            </div>
          </div>`;
        })
        .join("");

      listEl.querySelectorAll("[data-run]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          ctx.setLoading(true);
          try {
            const campaignId = Number(btn.dataset.run);
            await ctx.callAction("update_campaign_status", {
              input: { campaignId, status: "running" },
            });
            await ctx.callAction("run_campaign", { campaignId });
            ctx.toast("Campaign started", "success");
            loadCampaigns(container, ctx);
          } catch (err) {
            ctx.toast(err.message, "error");
          } finally {
            ctx.setLoading(false);
          }
        });
      });

      listEl.querySelectorAll("[data-pause]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          ctx.setLoading(true);
          try {
            await ctx.callAction("update_campaign_status", {
              input: { campaignId: Number(btn.dataset.pause), status: "paused" },
            });
            ctx.toast("Campaign paused", "success");
            loadCampaigns(container, ctx);
          } catch (err) {
            ctx.toast(err.message, "error");
          } finally {
            ctx.setLoading(false);
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div style="padding:14px;font-size:12px;color:#b91c1c">${escapeHtml(err.message)}</div>`;
    }
  }

  LE2.panels["campaign-hub"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Run or pause campaigns from here. Step-by-step activity lives in the CRM.</p>
        <div id="le2-ch-list" style="display:flex;flex-direction:column;gap:10px"></div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
          <button type="button" class="le2-btn-ghost" id="le2-ch-refresh" style="width:100%">${LE2.btnLabel("Refresh", "refresh")}</button>
          <button type="button" class="le2-btn" id="le2-ch-stop-all" style="width:100%;background:#b91c1c">${LE2.btnLabel("Pause all running", "pause")}</button>
        </div>
      `;
    },

    bind(container, ctx) {
      loadCampaigns(container, ctx);
      container.querySelector("#le2-ch-refresh")?.addEventListener("click", () => loadCampaigns(container, ctx));
      container.querySelector("#le2-ch-stop-all")?.addEventListener("click", async () => {
        ctx.setLoading(true);
        try {
          const res = await ctx.callAction("list_campaigns");
          const campaigns = LE2.extractList(res.campaigns, "data") || res.campaigns?.data || [];
          const running = campaigns.filter((c) => c.status === "running" || c.status === "active");
          for (const c of running) {
            await ctx.callAction("update_campaign_status", {
              input: { campaignId: Number(c.id), status: "paused" },
            });
          }
          ctx.toast(running.length ? `Paused ${running.length} campaign(s)` : "Nothing running", "success");
          loadCampaigns(container, ctx);
        } catch (err) {
          ctx.toast(err.message, "error");
        } finally {
          ctx.setLoading(false);
        }
      });
    },
  };
})();
