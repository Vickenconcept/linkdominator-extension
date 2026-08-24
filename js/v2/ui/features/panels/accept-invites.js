(function initAcceptInvitesPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  LE2.panels["accept-invites"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Accept pending connection invitations in bulk with a safe delay between each.</p>
        <div class="le2-field">
          <label>Max to accept</label>
          <input class="le2-input" id="le2-ai-max" type="number" min="1" max="100" value="25" placeholder="e.g. 25" />
        </div>
        <div class="le2-field">
          <label>Delay between accepts (seconds)</label>
          <input class="le2-input" id="le2-ai-delay" type="number" min="10" value="20" placeholder="Minimum 10 seconds" />
        </div>
        <button class="le2-btn" data-le2-start>Start accepting</button>
        <button class="le2-btn le2-btn-ghost" data-le2-stop style="display:none;margin-top:8px">Stop</button>
      `;
    },

    bind(container, ctx) {
      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        const max = R.readNumber(container, "#le2-ai-max", 25);
        const delaySec = Math.max(10, R.readNumber(container, "#le2-ai-delay", 20, 10));

        await R.runBatchAction(container, ctx, {
          loadingTitle: "Loading invitations…",
          loadingSub: "Fetching your pending connection requests",
          emptyMessage: "No pending invitations to accept right now.",
          progressTitle: "Accepting invitations…",
          doneTitle: "Accept batch complete",
          newLabel: "Accept more",
          delayMs: delaySec * 1000,
          loadItems: async () => {
            const res = await ctx.callAction("list_invitations");
            return LE2.extractList(res.invitations, "data", "items").slice(0, max);
          },
          onItem: async (item) => {
            const payload = LE2.invitationAcceptPayload(item);
            if (!payload.invitation_id) throw new Error("missing invitation id");
            if (!payload.shared_secret) {
              throw new Error("Missing invitation token — reload invitations and try again");
            }
            await ctx.callAction("accept_invitation", { input: payload });
          },
        });
      });
    },
  };
})();
