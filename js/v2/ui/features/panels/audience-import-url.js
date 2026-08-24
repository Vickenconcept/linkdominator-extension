(function initAudienceImportUrlPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  function defaultUrl() {
    const href = window.location.href;
    return LE2.isValidLinkedInImportUrl(href) ? href : "";
  }

  function syncLimitVisibility(container) {
    const url = R.readText(container, "#le2-aiu-url");
    const limitWrap = container.querySelector("#le2-aiu-limit-wrap");
    const isProfile = LE2.linkedinImportUrlKind(url) === "profile";
    if (limitWrap) {
      limitWrap.style.display = isProfile ? "none" : "block";
    }
  }

  function validateUrlForm(container) {
    R.clearValidation(container);
    const nameOk = R.validateFields(container, [
      { selector: "#le2-aiu-name", required: true, message: "Enter an audience name to save leads under" },
    ]);
    const urlOk = R.validateFields(container, [
      { selector: "#le2-aiu-url", required: true, message: "Paste a LinkedIn search or profile URL" },
      {
        selector: "#le2-aiu-url",
        test: (v) => LE2.isValidLinkedInImportUrl(v),
        message: "Use a people search URL or a profile URL (linkedin.com/in/username)",
      },
    ]);
    return nameOk && urlOk;
  }

  function buildSearchInput(container) {
    const audienceName = R.readText(container, "#le2-aiu-name");
    const linkedinUrl = R.readText(container, "#le2-aiu-url");
    const kind = LE2.linkedinImportUrlKind(linkedinUrl);

    if (kind === "profile") {
      return {
        audience_name: audienceName,
        profile_url: linkedinUrl,
        limit: 1,
        persist_results: true,
      };
    }

    return {
      audience_name: audienceName,
      linkedin_url: linkedinUrl,
      limit: R.readNumber(container, "#le2-aiu-limit", 20),
      persist_results: true,
    };
  }

  LE2.panels["audience-import-url"] = {
    render(container) {
      const presetUrl = defaultUrl();
      container.innerHTML = `
        <p class="le2-panel-desc" style="margin-top:0">Paste a LinkedIn people search URL or a single profile URL (<code>/in/username</code>) and save matching profiles to a CRM audience.</p>
        <div class="le2-field">
          <label>Audience name <span style="color:#ef4444">*</span></label>
          <input class="le2-input" id="le2-aiu-name" placeholder="e.g. Sales Nav export March" />
        </div>
        <div class="le2-field">
          <label>LinkedIn URL <span style="color:#ef4444">*</span></label>
          <input class="le2-input" id="le2-aiu-url" placeholder="https://www.linkedin.com/search/results/people?… or /in/username" value="${presetUrl.replace(/"/g, "&quot;")}" />
        </div>
        <button class="le2-btn-ghost" data-aiu-use-current type="button" style="width:100%;justify-content:center;font-size:11px;margin-bottom:10px">Use current page URL</button>
        <div class="le2-field" id="le2-aiu-limit-wrap">
          <label>Max results</label>
          <select class="le2-input" id="le2-aiu-limit">
            <option value="10">10 results</option>
            <option value="20" selected>20 results</option>
            <option value="50">50 results</option>
            <option value="100">100 results</option>
          </select>
        </div>
        <button class="le2-btn" data-le2-start type="button">Import &amp; save to CRM</button>
      `;
    },

    bind(container, ctx) {
      container.querySelector("#le2-aiu-url")?.addEventListener("input", () => syncLimitVisibility(container));
      syncLimitVisibility(container);

      container.querySelector("[data-aiu-use-current]")?.addEventListener("click", () => {
        const href = window.location.href;
        if (!LE2.isValidLinkedInImportUrl(href)) {
          ctx.toast("Current page is not a LinkedIn search or profile URL", "error");
          return;
        }
        const input = container.querySelector("#le2-aiu-url");
        if (input) input.value = href;
        syncLimitVisibility(container);
      });

      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        if (!validateUrlForm(container)) {
          return ctx.toast("Fix the highlighted fields", "error");
        }

        const input = buildSearchInput(container);
        const limit = input.limit || 20;
        const isProfile = Boolean(input.profile_url);

        await R.runSearchAction(container, ctx, {
          startLabel: "Importing…",
          newLabel: "Import another URL",
          loadingTitle: isProfile ? "Importing profile…" : "Importing from URL…",
          loadingSub: isProfile
            ? "Fetching profile and saving to your CRM"
            : "Fetching profiles and saving to your CRM",
          runSearch: async () => {
            const res = await ctx.callAction("search_leads", { input });
            const people = LE2.extractSearchResults(res, limit);
            return {
              people,
              stored: res?.stored_count ?? res?.results?.stored_count ?? people.length,
              audienceName:
                res?.audience_name ??
                res?.results?.audience_name ??
                res?.meta?.audience_name ??
                input.audience_name,
              found: people.length,
            };
          },
        });
      });
    },
  };
})();
