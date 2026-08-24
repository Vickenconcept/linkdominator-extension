(function initOpenConnectPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  LE2.panels["open-connect"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc">Search for profiles open to connect, then send invites with a safe delay.</p>
        <div class="le2-field">
          <label>Keywords</label>
          <input class="le2-input" id="le2-oc-kw" placeholder="e.g. marketing manager" />
        </div>
        <div class="le2-field">
          <label>Location (optional)</label>
          <input class="le2-input" id="le2-oc-loc" placeholder="e.g. London, UK" />
        </div>
        <div class="le2-field">
          <label>Max invites</label>
          <input class="le2-input" id="le2-oc-limit" type="number" min="1" max="30" value="15" placeholder="e.g. 15" />
        </div>
        <div class="le2-field">
          <label>Delay (seconds)</label>
          <input class="le2-input" id="le2-oc-delay" type="number" min="30" value="45" placeholder="Minimum 30 seconds" />
        </div>
        <div class="le2-field">
          <label>Invite note (optional)</label>
          <textarea class="le2-textarea" id="le2-oc-note" placeholder="Optional — {{firstName}}, {{name}}, {{headline}}"></textarea>
        </div>
        <button class="le2-btn" data-le2-start>Search &amp; invite</button>
        <button class="le2-btn le2-btn-ghost" data-le2-stop style="display:none;margin-top:8px">Stop</button>
      `;
    },

    bind(container, ctx) {
      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        const keywords = R.readText(container, "#le2-oc-kw");
        const location = R.readText(container, "#le2-oc-loc");
        const limit = R.readNumber(container, "#le2-oc-limit", 15, 1);
        const delaySec = Math.max(30, R.readNumber(container, "#le2-oc-delay", 45, 30));
        const note = R.readText(container, "#le2-oc-note");
        if (!keywords) return ctx.toast("Keywords required", "error");

        let stop = false;
        R.bindStop(container, () => stop, (v) => { stop = v; });
        const startBtn = container.querySelector("[data-le2-start]");
        R.setFormDisabled(container, true);
        ctx.btnLoad(startBtn, "Searching…");
        ctx.setLoading(true);
        R.showStage(container, R.renderSpinner("Searching open profiles…", "Finding people open to connect"));

        try {
          const res = await ctx.callAction("search_leads", {
            input: {
              keywords,
              location: location || undefined,
              open_link: true,
              network_depths: ["S", "O"],
              limit,
              persist_results: true,
            },
          });
          const people = LE2.extractSearchResults(res, limit);
          if (!people.length) {
            R.showStage(container, R.renderEmpty("No open profiles found. Try different keywords.", "Try again"));
            R.bindNewAction(container, () => R.restoreForm(container, ctx, "[data-le2-start]"));
            return;
          }

          const result = await LE2.runBatch({
            items: people,
            delayMs: delaySec * 1000,
            shouldStop: () => stop,
            onProgress: ({ index, total, ok, fail, lastError }) => {
              R.showStage(
                container,
                R.renderProgress({
                  title: `Sending invites (${people.length} found)…`,
                  current: index,
                  total,
                  ok,
                  fail,
                  lastError,
                })
              );
              R.bindStop(container, () => stop, (v) => { stop = v; });
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

          R.showStage(
            container,
            R.renderResult({
              title: "Open connect complete",
              summary: `Found ${people.length} open profiles.`,
              ok: result.ok,
              fail: result.fail,
              total: result.total,
              stopped: result.stopped,
              errors: result.errors || [],
              newLabel: "Search again",
            })
          );
          R.bindNewAction(container, () => R.restoreForm(container, ctx, "[data-le2-start]"));
          ctx.toast("Open connect batch finished", result.fail ? "info" : "success");
        } catch (err) {
          R.showStage(container, R.renderError(err.message));
          R.bindNewAction(container, () => R.restoreForm(container, ctx, "[data-le2-start]"));
          ctx.toast(err.message, "error");
        } finally {
          R.setFormDisabled(container, false);
          ctx.btnReset(startBtn);
          R.setRunning(container, false);
          ctx.setLoading(false);
        }
      });
    },
  };
})();
