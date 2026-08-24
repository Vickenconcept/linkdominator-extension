(function initLe2PanelRunner() {
  window.LE2 = window.LE2 || {};

  const R = {
    bindStop(container, getStop, setStop) {
      if (container._le2StopHandler) return;
      container._le2StopHandler = (e) => {
        if (!e.target.closest("[data-le2-stop], [data-le2-stop-stage]")) return;
        setStop(true);
        const note = container.querySelector("[data-le2-stop-note]");
        if (note) note.textContent = "Stopping after the current item…";
      };
      container.addEventListener("click", container._le2StopHandler);
      return container.querySelector("[data-le2-stop]");
    },

    setRunning(container, running) {
      const start = container.querySelector("[data-le2-start], #le2-bm-start, #le2-bp-start, #le2-gr-start, #le2-wsi-start");
      const stop = container.querySelector("[data-le2-stop], #le2-bm-stop, #le2-bp-stop, #le2-gr-stop, #le2-wsi-stop");
      if (start) start.disabled = running;
      if (stop) stop.style.display = running ? "block" : "none";
    },

    progressEl(container) {
      return container.querySelector("[data-le2-progress]");
    },

    readNumber(container, id, fallback, min = 1) {
      return Math.max(min, Number(container.querySelector(id)?.value) || fallback);
    },

    readText(container, id) {
      return String(container.querySelector(id)?.value || "").trim();
    },

    downloadCsv(filename, rows, columns) {
      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = columns.map((c) => escape(c.label)).join(",");
      const body = rows
        .map((row) => columns.map((c) => escape(typeof c.value === "function" ? c.value(row) : row[c.key])).join(","))
        .join("\n");
      const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },

    initShell(container) {
      if (!container || container.querySelector("[data-le2-panel-shell]")) return container;
      const html = container.innerHTML;
      container.innerHTML = `
        <div class="le2-panel-shell" data-le2-panel-shell>
          <div class="le2-panel-form" data-le2-form>${html}</div>
          <div class="le2-panel-stage" data-le2-stage hidden></div>
        </div>`;
      return container;
    },

    restoreForm(container, ctx, startSelector) {
      R.showForm(container);
      R.clearValidation(container);
      R.setFormDisabled(container, false);
      R.setRunning(container, false);
      const startBtn = container.querySelector(
        startSelector || "[data-le2-start], #le2-bm-start, #le2-bp-start, #le2-gr-start, #le2-wsi-start, #le2-aiu-run, #le2-acol-run"
      );
      if (startBtn && ctx?.btnReset) {
        ctx.btnReset(startBtn);
      } else if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = "";
      }
    },

    /** Single delegated handler so stage back buttons always work after re-renders. */
    bindStageBack(container, fn) {
      if (!container) return;
      if (!container._le2StageBackHandler) {
        container._le2StageBackHandler = (e) => {
          const btn = e.target.closest("[data-le2-new-action]");
          if (!btn || !container.contains(btn)) return;
          if (typeof container._le2StageBackFn === "function") {
            container._le2StageBackFn(e);
          }
        };
        container.addEventListener("click", container._le2StageBackHandler);
      }
      container._le2StageBackFn = fn;
    },

    bindNewAction(container, fn) {
      R.bindStageBack(container, fn);
    },

    showForm(container) {
      const form = container.querySelector("[data-le2-form]");
      const stage = container.querySelector("[data-le2-stage]");
      if (form) form.hidden = false;
      if (stage) {
        stage.hidden = true;
        stage.innerHTML = "";
      }
    },

    showStage(container, html) {
      const form = container.querySelector("[data-le2-form]");
      const stage = container.querySelector("[data-le2-stage]");
      if (form) form.hidden = true;
      if (stage) {
        stage.innerHTML = html;
        stage.hidden = false;
        LE2.decoratePanelButtons?.(stage);
      }
    },

    setFormDisabled(container, disabled) {
      container.querySelectorAll(
        "[data-le2-form] input, [data-le2-form] select, [data-le2-form] textarea, [data-le2-form] button:not([data-le2-stop])"
      ).forEach((el) => {
        el.disabled = disabled;
      });
    },

    clearValidation(container) {
      container.querySelectorAll(".le2-input-error").forEach((el) => el.classList.remove("le2-input-error"));
      container.querySelectorAll(".le2-field-error-msg").forEach((el) => el.remove());
    },

    /** @param {Array<{selector:string, required?:boolean, label?:string, message?:string, test?:(value:string, container:Element)=>boolean}>} rules */
    validateFields(container, rules) {
      R.clearValidation(container);
      let ok = true;
      for (const rule of rules) {
        const el = container.querySelector(rule.selector);
        if (!el) continue;
        const value = el.type === "checkbox" ? (el.checked ? "1" : "") : String(el.value || "").trim();
        let invalid = false;
        if (rule.required && !value) invalid = true;
        if (!invalid && typeof rule.test === "function" && !rule.test(value, container)) invalid = true;
        if (invalid) {
          ok = false;
          el.classList.add("le2-input-error");
          const field = el.closest(".le2-field") || el.parentElement;
          if (field && !field.querySelector(".le2-field-error-msg")) {
            const msg = document.createElement("p");
            msg.className = "le2-field-error-msg";
            msg.textContent = rule.message || `${rule.label || "This field"} is required`;
            field.appendChild(msg);
          }
        }
      }
      return ok;
    },

    backToForm(container, onBack) {
      R.showForm(container);
      if (typeof onBack === "function") onBack();
    },

    renderSpinner(title, subtitle = "") {
      return `
        <div class="le2-stage-card le2-stage-loading">
          <div class="le2-stage-spinner" aria-hidden="true"></div>
          <p class="le2-stage-title">${title}</p>
          ${subtitle ? `<p class="le2-stage-sub">${subtitle}</p>` : ""}
        </div>`;
    },

    renderProgress({ title, current, total, ok, fail, lastError = null, showStop = true }) {
      const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
      const errNote = lastError
        ? `<p class="le2-stage-note" style="color:#b45309;margin-top:8px">${LE2.escapeHtml ? LE2.escapeHtml(lastError) : String(lastError).replace(/</g, "&lt;")}</p>`
        : `<p class="le2-stage-note" data-le2-stop-note></p>`;
      return `
        <div class="le2-stage-card le2-stage-progress">
          <p class="le2-stage-title">${title || "Working…"}</p>
          <div class="le2-stage-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="le2-stage-progress-fill" style="width:${pct}%"></div>
          </div>
          <p class="le2-stage-sub">${current} of ${total} · <span class="le2-stat-ok">${ok} succeeded</span> · <span class="le2-stat-fail">${fail} failed</span></p>
          ${errNote}
          ${showStop ? `<button type="button" class="le2-btn le2-btn-ghost le2-stage-stop" data-le2-stop-stage style="margin-top:10px;width:100%">${LE2.btnLabel("Stop", "pause")}</button>` : ""}
        </div>`;
    },

    renderResult({ title, summary, ok, fail, total, stopped, errors = [], newLabel = "Run again", tone = "default" }) {
      const icon =
        tone === "success" || (fail === 0 && ok > 0)
          ? `<div class="le2-stage-result-icon ok">${LE2.ICONS.check}</div>`
          : tone === "error" || (ok === 0 && fail > 0)
            ? `<div class="le2-stage-result-icon fail">!</div>`
            : `<div class="le2-stage-result-icon warn">~</div>`;
      const esc = (s) => (LE2.escapeHtml ? LE2.escapeHtml(s) : String(s).replace(/</g, "&lt;"));
      const errorBlock =
        Array.isArray(errors) && errors.length
          ? `<ul class="le2-stage-sub" style="text-align:left;margin:10px 0 0;padding-left:18px;color:#b45309">${errors
              .slice(0, 3)
              .map((e) => `<li>${esc(e)}</li>`)
              .join("")}</ul>`
          : "";
      return `
        <div class="le2-stage-card le2-stage-result">
          ${icon}
          <p class="le2-stage-title">${title}</p>
          ${summary ? `<p class="le2-stage-sub">${summary}</p>` : ""}
          <div class="le2-stage-stats">
            <span class="le2-stage-stat ok">${ok} succeeded</span>
            <span class="le2-stage-stat fail">${fail} failed</span>
            <span class="le2-stage-stat">${total} total</span>
          </div>
          ${errorBlock}
          ${stopped ? `<p class="le2-stage-note">Stopped before finishing all items.</p>` : ""}
          <button type="button" class="le2-btn" data-le2-new-action style="margin-top:14px;width:100%">${LE2.btnLabel(newLabel, "refresh")}</button>
        </div>`;
    },

    renderEmpty(message, newLabel = "Back to form") {
      return `
        <div class="le2-stage-card le2-stage-empty">
          <p class="le2-stage-title">Nothing to do</p>
          <p class="le2-stage-sub">${message}</p>
          <button type="button" class="le2-btn le2-btn-ghost" data-le2-new-action style="margin-top:12px;width:100%">${LE2.btnLabel(newLabel, "search")}</button>
        </div>`;
    },

    renderError(message, newLabel = "Try again") {
      return `
        <div class="le2-stage-card le2-stage-result">
          <div class="le2-stage-result-icon fail">!</div>
          <p class="le2-stage-title">Something went wrong</p>
          <p class="le2-stage-sub">${message}</p>
          <button type="button" class="le2-btn" data-le2-new-action style="margin-top:14px;width:100%">${LE2.btnLabel(newLabel, "refresh")}</button>
        </div>`;
    },

    renderSearchStage(container, opts, newLabel = "New search") {
      const wrap = document.createElement("div");
      LE2.renderSavedSearchResults(wrap, opts);
      return `
        <div class="le2-stage-card le2-stage-search">
          ${wrap.innerHTML}
          <button type="button" class="le2-btn le2-btn-ghost" data-le2-new-action style="margin-top:12px;width:100%">${LE2.btnLabel(newLabel, "search")}</button>
        </div>`;
    },

    async runBatchAction(container, ctx, config) {
      let stop = false;
      R.bindStop(container, () => stop, (v) => { stop = v; });

      const startBtn =
        container.querySelector(config.startSelector || "[data-le2-start], #le2-bm-start, #le2-bp-start, #le2-gr-start, #le2-wsi-start");
      R.setFormDisabled(container, true);
      if (startBtn && ctx.btnLoad) ctx.btnLoad(startBtn, config.startLabel || "Starting…");
      R.setRunning(container, true);
      ctx.setLoading(true);
      R.showStage(container, R.renderSpinner(config.loadingTitle || "Loading…", config.loadingSub || ""));

      try {
        const items = await config.loadItems();
        if (!items?.length) {
          R.showStage(container, R.renderEmpty(config.emptyMessage || "No items matched your settings.", config.newLabel || "Run again"));
          R.bindNewAction(container, () => R.restoreForm(container, ctx, config.startSelector));
          return;
        }

        const result = await LE2.runBatch({
          items,
          delayMs: config.delayMs || 0,
          shouldStop: () => stop,
          onProgress: ({ index, total, ok, fail, lastError }) => {
            R.showStage(
              container,
              R.renderProgress({
                title: config.progressTitle || "Processing…",
                current: index,
                total,
                ok,
                fail,
                lastError,
              })
            );
          },
          onItem: config.onItem,
        });

        const summary =
          typeof config.doneSummary === "function"
            ? config.doneSummary(result)
            : config.doneSummary || `Completed ${result.ok} of ${result.total} items.`;

        R.showStage(
          container,
          R.renderResult({
            title: config.doneTitle || "Finished",
            summary,
            ok: result.ok,
            fail: result.fail,
            total: result.total,
            stopped: result.stopped,
            errors: result.errors || [],
            newLabel: config.newLabel || "Run again",
            tone: result.fail === 0 ? "success" : result.ok === 0 ? "error" : "default",
          })
        );
        R.bindNewAction(container, () => {
          stop = false;
          R.restoreForm(container, ctx, config.startSelector);
        });
        if (config.toast !== false) {
          ctx.toast(config.toastMessage || "Batch finished", result.fail ? "info" : "success");
        }
      } catch (err) {
        R.showStage(container, R.renderError(err.message, config.newLabel || "Try again"));
        R.bindNewAction(container, () => R.restoreForm(container, ctx, config.startSelector));
        ctx.toast(err.message, "error");
      } finally {
        R.setFormDisabled(container, false);
        if (startBtn && ctx.btnReset) ctx.btnReset(startBtn);
        R.setRunning(container, false);
        ctx.setLoading(false);
      }
    },

    async runSearchAction(container, ctx, config) {
      const startBtn = container.querySelector(config.startSelector || "[data-le2-start]");
      R.setFormDisabled(container, true);
      if (startBtn && ctx.btnLoad) ctx.btnLoad(startBtn, config.startLabel || "Searching…");
      ctx.setLoading(true);
      R.showStage(
        container,
        R.renderSpinner(config.loadingTitle || "Searching LinkedIn…", config.loadingSub || "Saving matches to your CRM")
      );

      try {
        const data = await config.runSearch();
        const people = data.people || [];
        if (!people.length) {
          R.showStage(
            container,
            R.renderEmpty(config.emptyMessage || "No results matched your search.", config.newLabel || "New search")
          );
          R.bindNewAction(container, () => R.restoreForm(container, ctx, config.startSelector));
          if (config.toast !== false) ctx.toast("No results found", "info");
          return;
        }

        R.showStage(
          container,
          R.renderSearchStage(
            container,
            {
              people,
              found: data.found ?? people.length,
              stored: data.stored ?? people.length,
              audienceName: data.audienceName,
              previewLimit: config.previewLimit ?? 15,
            },
            config.newLabel || "New search"
          )
        );
        R.bindNewAction(container, () => R.restoreForm(container, ctx, config.startSelector));
        if (config.toast !== false) {
          ctx.toast(
            config.toastMessage?.(data) ||
              `${data.stored ?? people.length} leads saved${data.audienceName ? ` to “${data.audienceName}”` : ""}`,
            "success"
          );
        }
      } catch (err) {
        R.showStage(container, R.renderError(err.message, config.newLabel || "Try again"));
        R.bindNewAction(container, () => R.restoreForm(container, ctx, config.startSelector));
        ctx.toast(err.message, "error");
      } finally {
        R.setFormDisabled(container, false);
        if (startBtn && ctx.btnReset) ctx.btnReset(startBtn);
        ctx.setLoading(false);
      }
    },
  };

  LE2.panelRunner = R;
})();
