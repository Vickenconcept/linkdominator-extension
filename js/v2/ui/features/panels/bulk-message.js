(function initBulkMessagePanels() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  function renderMessageForm(container, desc, defaults) {
    container.innerHTML = `
      <p class="le2-panel-desc">${desc}</p>
      <div class="le2-field">
        <label>Max connections</label>
        <input class="le2-input" id="le2-bm-limit" type="number" min="1" max="100" value="${defaults.limit}" placeholder="e.g. 25" />
      </div>
      <div class="le2-field">
        <label>Delay between messages (seconds)</label>
        <input class="le2-input" id="le2-bm-delay" type="number" min="30" value="${defaults.delay}" placeholder="Minimum 30 seconds" />
      </div>
      <div class="le2-field">
        <label>Message</label>
        <textarea class="le2-textarea" id="le2-bm-message" placeholder="Hi {{name}}, hope you're doing well!">${defaults.message}</textarea>
        <div class="le2-token-row">
          <span class="le2-token" data-token="{{name}}">{{name}}</span>
          <span class="le2-token" data-token="{{firstName}}">{{firstName}}</span>
          <span class="le2-token" data-token="{{headline}}">{{headline}}</span>
          <span class="le2-token" data-token="{{company}}">{{company}}</span>
        </div>
      </div>
      <div class="le2-field" id="le2-bm-list-wrap" style="display:${defaults.showList ? "block" : "none"}">
        <label>Audience</label>
        <select class="le2-input" id="le2-bm-list-id">
          <option value="">Loading audiences…</option>
        </select>
      </div>
      <button class="le2-btn" id="le2-bm-start" data-le2-start>Start messaging</button>
      <button class="le2-btn le2-btn-ghost" id="le2-bm-stop" data-le2-stop style="display:none;margin-top:8px">Stop</button>
    `;

    container.querySelectorAll(".le2-token").forEach((chip) => {
      chip.addEventListener("click", () => {
        LE2.insertTokenAtCursor(container.querySelector("#le2-bm-message"), chip.dataset.token || "");
      });
    });
  }

  async function fetchListLeads(ctx, listId, limit) {
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
        provider_id: lead.provider_profile_id,
        public_identifier: lead.public_identifier || lead.provider_profile_id,
      }));
  }

  function bindMessagePanel(container, ctx, loadPeople) {
    container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
      const limit = Math.max(1, Number(container.querySelector("#le2-bm-limit")?.value) || 10);
      const delaySec = Math.max(30, Number(container.querySelector("#le2-bm-delay")?.value) || 30);
      const template = container.querySelector("#le2-bm-message")?.value.trim();
      if (!template) return ctx.toast("Message is required", "error");

      await R.runBatchAction(container, ctx, {
        startSelector: "#le2-bm-start",
        loadingTitle: "Loading people…",
        emptyMessage: "No people found for this action.",
        progressTitle: "Sending messages…",
        doneTitle: "Messaging batch complete",
        newLabel: "Send more messages",
        delayMs: delaySec * 1000,
        loadItems: () => loadPeople(limit),
        onItem: async (person) => {
          const profileId = LE2.profileId(person);
          if (!profileId) throw new Error("missing profile id");
          await ctx.callAction("start_chat", {
            input: { attendee_ids: [profileId], text: LE2.applyTokens(template, person) },
          });
        },
      });
    });
  }

  const defaults = {
    limit: 25,
    delay: 45,
    message: "Hi {{name}}, hope you're doing well!",
    showList: false,
  };

  LE2.panels["bulk-message-targeted"] = {
    render(container) {
      renderMessageForm(
        container,
        "Pick a CRM audience and message each lead with your template. LinkedIn only delivers DMs to 1st-degree connections — use Add Connects first for search audiences.",
        { ...defaults, showList: true }
      );
    },
    bind(container, ctx) {
      LE2.populateAudienceSelect(ctx, container.querySelector("#le2-bm-list-id"));
      bindMessagePanel(container, ctx, async (limit) => {
        const listId = LE2.readAudienceSelect(container, "#le2-bm-list-id");
        if (!listId) throw new Error("Select an audience first");
        return fetchListLeads(ctx, listId, limit);
      });
    },
  };
})();
