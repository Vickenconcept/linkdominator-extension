(function initAddConnectionPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  LE2.panels["add-connection"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Send connection invites to leads in a CRM audience. Leave the note empty for a plain invite — LinkedIn limits invites <em>with</em> a note to about 5 per period.</p>
        <div class="le2-field">
          <label>Audience</label>
          <select class="le2-input" id="le2-ac-list">
            <option value="">Loading audiences…</option>
          </select>
        </div>
        <div class="le2-field">
          <label>Max invites</label>
          <input class="le2-input" id="le2-ac-limit" type="number" min="1" max="50" value="20" placeholder="e.g. 20" />
        </div>
        <div class="le2-field">
          <label>Delay between invites (seconds)</label>
          <input class="le2-input" id="le2-ac-delay" type="number" min="30" value="45" placeholder="Minimum 30 seconds" />
        </div>
        <div class="le2-field">
          <label>Invite note (optional)</label>
          <textarea class="le2-textarea" id="le2-ac-note" placeholder="Optional — {{firstName}}, {{name}}, {{headline}}, {{company}}"></textarea>
        </div>
        <button class="le2-btn" data-le2-start>Start invites</button>
        <button class="le2-btn le2-btn-ghost" data-le2-stop style="display:none;margin-top:8px">Stop</button>
      `;
      LE2.wireTokenChips(container, "le2-ac-note");
    },

    bind(container, ctx) {
      LE2.populateAudienceSelect(ctx, container.querySelector("#le2-ac-list"));

      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        const listId = LE2.readAudienceSelect(container, "#le2-ac-list");
        const limit = R.readNumber(container, "#le2-ac-limit", 20);
        const delaySec = Math.max(30, R.readNumber(container, "#le2-ac-delay", 45, 30));
        const note = R.readText(container, "#le2-ac-note");
        if (!listId) return ctx.toast("Select an audience first", "error");

        await R.runBatchAction(container, ctx, {
          loadingTitle: "Loading audience…",
          loadingSub: "Preparing your invite list",
          emptyMessage: "This audience has no leads yet.",
          progressTitle: "Sending invites…",
          doneTitle: "Invite batch complete",
          newLabel: "Send more invites",
          delayMs: delaySec * 1000,
          loadItems: async () => {
            const res = await ctx.callAction("list_sn_imported_leads", { query: { source_external_id: listId } });
            return LE2.extractList(res.leads, "data").slice(0, limit);
          },
          onItem: async (person) => {
            const recipientId = LE2.profileId(person);
            if (!recipientId) throw new Error("missing id");
            await ctx.callAction("send_invite", {
              input: {
                recipient_id: recipientId,
                message: note ? LE2.applyTokens(note, person) : undefined,
              },
            });
          },
        });
      });
    },
  };
})();
