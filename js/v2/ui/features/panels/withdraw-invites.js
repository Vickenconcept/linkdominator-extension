(function initWithdrawInvitesPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  function syncWithdrawLimits(container) {
    const fetchEl = container.querySelector("#le2-wsi-limit");
    const maxEl = container.querySelector("#le2-wsi-max");
    if (!fetchEl || !maxEl) return;
    const fetchVal = Math.max(1, Number(fetchEl.value) || 50);
    maxEl.max = String(fetchVal);
    if (Number(maxEl.value) > fetchVal) {
      maxEl.value = String(fetchVal);
    }
  }

  function extractInvitationPage(res) {
    const root = res?.invitations?.data ?? res?.invitations ?? res?.data ?? res ?? {};
    return {
      items: LE2.extractList(res?.invitations ?? res, "data", "items"),
      cursor: root?.cursor || null,
    };
  }

  async function fetchSentInvitationsPaginated(ctx, scanLimit) {
    const collected = [];
    let cursor = null;

    while (collected.length < scanLimit) {
      const limit = Math.min(100, scanLimit - collected.length);
      const query = { limit };
      if (cursor) query.cursor = cursor;

      const res = await ctx.callAction("list_sent_invitations", { query });
      const page = extractInvitationPage(res);
      if (!page.items.length) break;

      collected.push(...page.items);
      cursor = page.cursor;
      if (!cursor || page.items.length < limit) break;
    }

    return collected.slice(0, scanLimit);
  }

  LE2.panels["withdraw-invites"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Cancel pending sent invitations with a safe delay between each withdraw.</p>
        <div class="le2-field">
          <label>Max to scan</label>
          <input class="le2-input" id="le2-wsi-limit" type="number" min="1" max="500" value="100" placeholder="e.g. 100" />
          <p class="le2-field-error-msg" style="color:#94a3b8;margin-top:4px">How many pending invites to check (use 100+ to reach older ones)</p>
        </div>
        <div class="le2-field">
          <label>Older than (days)</label>
          <input class="le2-input" id="le2-wsi-days" type="number" min="0" value="7" placeholder="0 = no age filter · 60 ≈ 2 months" />
        </div>
        <div class="le2-field">
          <label>Max to withdraw</label>
          <input class="le2-input" id="le2-wsi-max" type="number" min="1" max="50" value="25" placeholder="Cannot exceed scan limit" />
          <p class="le2-field-error-msg" style="color:#94a3b8;margin-top:4px">Capped by max to scan</p>
        </div>
        <div class="le2-field">
          <label>Delay between withdraws (seconds)</label>
          <input class="le2-input" id="le2-wsi-delay" type="number" min="10" value="30" placeholder="Minimum 10 seconds" />
        </div>
        <button class="le2-btn" id="le2-wsi-start" data-le2-start>Start withdraw</button>
        <button class="le2-btn le2-btn-ghost" id="le2-wsi-stop" data-le2-stop style="display:none;margin-top:8px">Stop</button>
      `;
    },

    bind(container, ctx) {
      syncWithdrawLimits(container);
      container.querySelector("#le2-wsi-limit")?.addEventListener("input", () => syncWithdrawLimits(container));
      container.querySelector("#le2-wsi-limit")?.addEventListener("change", () => syncWithdrawLimits(container));

      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        syncWithdrawLimits(container);
        const scanLimit = R.readNumber(container, "#le2-wsi-limit", 100);
        const minDays = Math.max(0, R.readNumber(container, "#le2-wsi-days", 7, 0));
        const maxWithdraw = Math.min(R.readNumber(container, "#le2-wsi-max", 25), scanLimit);
        const delaySec = Math.max(10, R.readNumber(container, "#le2-wsi-delay", 30, 10));

        await R.runBatchAction(container, ctx, {
          startSelector: "#le2-wsi-start",
          loadingTitle: "Loading sent invitations…",
          loadingSub: `Scanning up to ${scanLimit} pending invite${scanLimit === 1 ? "" : "s"}`,
          emptyMessage: "No pending sent invitations found on LinkedIn.",
          progressTitle: "Withdrawing invitations…",
          doneTitle: "Withdraw batch complete",
          newLabel: "Withdraw more",
          delayMs: delaySec * 1000,
          loadItems: async () => {
            const scanned = await fetchSentInvitationsPaginated(ctx, scanLimit);
            if (!scanned.length) {
              return [];
            }

            let items = scanned;
            if (minDays > 0) {
              items = scanned.filter((item) => {
                const ageDays = LE2.invitationAgeDays(item);
                if (ageDays == null) return false;
                return ageDays >= minDays;
              });
            }

            if (!items.length) {
              const youngest = scanned
                .map((item) => LE2.invitationAgeDays(item))
                .filter((age) => age != null)
                .sort((a, b) => a - b)[0];
              const youngestLabel =
                youngest != null ? `newest scanned invite is ~${Math.max(0, Math.floor(youngest))} days old` : "could not read invite dates";
              throw new Error(
                `Scanned ${scanned.length} pending invite${scanned.length === 1 ? "" : "s"}; none were older than ${minDays} days (${youngestLabel}). Increase max to scan (e.g. 100+) or lower the age filter (0 = all pending).`
              );
            }

            return items.slice(0, maxWithdraw);
          },
          onItem: async (item) => {
            const id = LE2.invitationId(item);
            if (!id) throw new Error("missing id");
            await ctx.callAction("withdraw_invitation", { input: { invitation_id: id } });
          },
        });
      });
    },
  };
})();
