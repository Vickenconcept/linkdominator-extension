(function initMessageFollowupPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  LE2.panels["message-followup"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Send a follow-up message to leads in a CRM audience.</p>
        <div class="le2-field">
          <label>Audience</label>
          <select class="le2-input" id="le2-mf-list">
            <option value="">Loading audiences…</option>
          </select>
        </div>
        <div class="le2-field">
          <label>Max messages</label>
          <input class="le2-input" id="le2-mf-limit" type="number" min="1" max="50" value="20" placeholder="e.g. 20" />
        </div>
        <div class="le2-field">
          <label>Delay (seconds)</label>
          <input class="le2-input" id="le2-mf-delay" type="number" min="30" value="45" placeholder="Minimum 30 seconds" />
        </div>
        <div class="le2-field">
          <label>Follow-up message</label>
          <textarea class="le2-textarea" id="le2-mf-msg" placeholder="Hi {{firstName}}, just following up…">Hi {{firstName}}, just following up on my last message. Would love to hear from you!</textarea>
          <div class="le2-token-row">
            <span class="le2-token" data-token="{{name}}">{{name}}</span>
            <span class="le2-token" data-token="{{firstName}}">{{firstName}}</span>
          </div>
        </div>
        <button class="le2-btn" data-le2-start>Start follow-up</button>
        <button class="le2-btn le2-btn-ghost" data-le2-stop style="display:none;margin-top:8px">Stop</button>
      `;
      LE2.wireTokenChips(container, "le2-mf-msg");
    },

    bind(container, ctx) {
      LE2.populateAudienceSelect(ctx, container.querySelector("#le2-mf-list"));

      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        const listId = LE2.readAudienceSelect(container, "#le2-mf-list");
        const limit = R.readNumber(container, "#le2-mf-limit", 20);
        const delaySec = Math.max(30, R.readNumber(container, "#le2-mf-delay", 45, 30));
        const template = R.readText(container, "#le2-mf-msg");
        if (!listId || !template) return ctx.toast("Select an audience and enter a message", "error");

        await R.runBatchAction(container, ctx, {
          loadingTitle: "Loading audience…",
          emptyMessage: "No leads found in this audience.",
          progressTitle: "Sending follow-ups…",
          doneTitle: "Follow-up batch complete",
          newLabel: "Send more follow-ups",
          delayMs: delaySec * 1000,
          loadItems: async () => {
            const res = await ctx.callAction("list_sn_imported_leads", { query: { source_external_id: listId } });
            return LE2.extractList(res.leads, "data").slice(0, limit);
          },
          onItem: async (person) => {
            let profileId = LE2.profileId(person);
            if (!profileId) throw new Error("missing id");
            if (!LE2.isUnipileProviderId(profileId)) {
              profileId = await LE2.resolveAttendeeId(ctx, profileId);
            }
            if (!profileId) throw new Error("could not resolve profile id");
            await ctx.callAction("start_chat", {
              input: {
                attendee_ids: [profileId],
                text: LE2.applyTokens(template, person),
              },
            });
          },
        });
      });
    },
  };
})();
