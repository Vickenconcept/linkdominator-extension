(function initAudienceBuildPanel() {
  window.LE2 = window.LE2 || {};
  LE2.panels = LE2.panels || {};
  const R = LE2.panelRunner;

  function validateBuildForm(container) {
    R.clearValidation(container);
    const nameOk = R.validateFields(container, [
      { selector: "#le2-ab-name", required: true, message: "Enter an audience name to save leads under" },
    ]);
    const kw = R.readText(container, "#le2-ab-kw");
    const title = R.readText(container, "#le2-ab-title");
    const company = R.readText(container, "#le2-ab-co");
    const locCheck = LE2.validateLocationPicker(container);
    const loc = locCheck.id || "";

    if (locCheck.incomplete) {
      container.querySelector("#le2-ab-loc")?.classList.add("le2-input-error");
      const field = container.querySelector("#le2-ab-loc-host")?.closest(".le2-field")
        || container.querySelector("#le2-ab-loc")?.closest(".le2-field");
      if (field && !field.querySelector(".le2-field-error-msg")) {
        const msg = document.createElement("p");
        msg.className = "le2-field-error-msg";
        msg.textContent = "Select a location from the list (typed text alone is not enough)";
        field.appendChild(msg);
      }
      return false;
    }

    if (!kw && !title && !company && !loc) {
      ["#le2-ab-kw", "#le2-ab-title", "#le2-ab-co", "#le2-ab-loc"].forEach((sel) => {
        container.querySelector(sel)?.classList.add("le2-input-error");
      });
      const field = container.querySelector("#le2-ab-kw")?.closest(".le2-field");
      if (field && !field.querySelector(".le2-field-error-msg")) {
        const msg = document.createElement("p");
        msg.className = "le2-field-error-msg";
        msg.textContent = "Enter at least one filter: keywords, title, company, or location";
        field.appendChild(msg);
      }
      return false;
    }
    return nameOk;
  }

  LE2.panels["audience-build"] = {
    render(container) {
      container.innerHTML = `
        <p class="le2-panel-desc" style="margin-top:0">Search LinkedIn and save matching profiles to a named CRM audience.</p>
        <div class="le2-field">
          <label>Audience name <span style="color:#ef4444">*</span></label>
          <input class="le2-input" id="le2-ab-name" placeholder="e.g. UK CEOs March 2026" />
        </div>
        <div class="le2-search-grid">
          <div class="le2-field le2-field-full">
            <label>Keywords</label>
            <input class="le2-input" id="le2-ab-kw" placeholder="e.g. marketing manager, SaaS founder" />
          </div>
          <div class="le2-field">
            <label>Job title</label>
            <input class="le2-input" id="le2-ab-title" placeholder="e.g. CEO, CTO" />
          </div>
          <div class="le2-field">
            <label>Current company</label>
            <input class="le2-input" id="le2-ab-co" placeholder="e.g. Google" />
          </div>
          <div class="le2-field">
            <label>Past company</label>
            <input class="le2-input" id="le2-ab-past" placeholder="Former employer" />
          </div>
          <div class="le2-field">
            <label>School</label>
            <input class="le2-input" id="le2-ab-school" placeholder="e.g. Stanford" />
          </div>
          <div class="le2-field">
            <label>Location</label>
            <div id="le2-ab-loc-host"></div>
          </div>
        </div>
        <div class="le2-search-options">
          <div class="le2-field" style="margin:0">
            <label>Network</label>
            <select class="le2-input" id="le2-ab-net">
              <option value="">Any connection</option>
              <option value="F">1st connections</option>
              <option value="S">2nd connections</option>
              <option value="O">3rd+ connections</option>
            </select>
          </div>
          <div class="le2-field" style="margin:0">
            <label>Max results</label>
            <select class="le2-input" id="le2-ab-limit">
              <option value="10">10 results</option>
              <option value="20" selected>20 results</option>
              <option value="50">50 results</option>
              <option value="100">100 results</option>
            </select>
          </div>
        </div>
        <label class="le2-search-check">
          <input type="checkbox" id="le2-ab-open" />
          Open to connect only
        </label>
        <button class="le2-btn" data-le2-start type="button">Search &amp; save to CRM</button>
      `;
    },

    bind(container, ctx) {
      const locHost = container.querySelector("#le2-ab-loc-host");
      if (locHost && typeof LE2.mountLocationPicker === "function") {
        LE2.mountLocationPicker(locHost, {
          inputId: "le2-ab-loc",
          hiddenId: "le2-ab-loc-id",
          placeholder: "Search city or country…",
          fetchSuggestions: async (keywords) => {
            const res = await ctx.callAction("list_search_parameters", {
              query: { type: "LOCATION", keywords, limit: 20 },
            });
            return LE2.extractList(res?.parameters ?? res, "data", "items");
          },
        });
      }

      container.querySelector("[data-le2-start]")?.addEventListener("click", async () => {
        if (!validateBuildForm(container)) {
          const locCheck = LE2.validateLocationPicker(container);
          return ctx.toast(
            locCheck.incomplete
              ? "Pick a location from the dropdown, or clear the field"
              : "Fix the highlighted fields",
            "error"
          );
        }

        const audienceName = R.readText(container, "#le2-ab-name");
        const net = container.querySelector("#le2-ab-net")?.value;
        const locId = LE2.readLocationPicker(container).id || undefined;
        const input = {
          audience_name: audienceName,
          keywords: R.readText(container, "#le2-ab-kw") || undefined,
          title: R.readText(container, "#le2-ab-title") || undefined,
          current_company: R.readText(container, "#le2-ab-co") || undefined,
          past_company: R.readText(container, "#le2-ab-past") || undefined,
          school: R.readText(container, "#le2-ab-school") || undefined,
          location: locId,
          open_link: container.querySelector("#le2-ab-open")?.checked || undefined,
          network_depths: net ? [net] : undefined,
          limit: R.readNumber(container, "#le2-ab-limit", 20),
          persist_results: true,
        };

        await R.runSearchAction(container, ctx, {
          startLabel: "Searching…",
          newLabel: "New search",
          runSearch: async () => {
            const res = await ctx.callAction("search_leads", { input });
            const people = LE2.extractSearchResults(res, input.limit);
            return {
              people,
              stored: res?.stored_count ?? res?.results?.stored_count ?? people.length,
              audienceName:
                res?.audience_name ??
                res?.results?.audience_name ??
                res?.meta?.audience_name ??
                audienceName,
              found: people.length,
            };
          },
        });
      });
    },
  };
})();
