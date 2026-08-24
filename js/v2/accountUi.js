$(function () {
  const $card = $("#ld-v2-account");
  if (!$card.length) return;

  const $signedOut = $("#ld-v2-signed-out");
  const $signedIn = $("#ld-v2-signed-in");
  const $status = $("#ld-v2-status");
  const $badge = $("#ld-v2-li-badge");
  const $err = $("#ld-v2-error");
  const $menus = $("#menus");
  const $actionsDivider = $("#ld-v2-actions-divider");
  const $toolsHdr = $("#ld-tools-header");
  const $accountTitle = $("#ld-v2-account-title");
  const $identityText = $("#ld-identity-text");
  const $identityName = $("#ld-identity-name");
  const $identitySub = $("#ld-identity-sub");
  const $headerSignout = $("#ld-header-signout");

  let lastLiState = "missing";
  let autoSyncAttempted = false;

  function crmOrigin(apiBase) {
    const raw = String(
      apiBase ||
        (typeof PLATFORM_URL !== "undefined" ? PLATFORM_URL : "https://app.linkedempire.com")
    ).trim();
    return raw.replace(/\/api\/v2\/?$/i, "").replace(/\/+$/, "") || "https://app.linkedempire.com";
  }

  function showError(message) {
    if (!message) {
      $err.hide().text("");
      return;
    }
    $err.text(message).show();
  }

  function formatConnectError(message) {
    const text = String(message || "");
    if (/401|invalid.credentials|invalid_credentials|Invalid credentials/i.test(text)) {
      return "LinkedIn session cookie was rejected (expired or invalid). Log out and back into linkedin.com in this browser, then click Detect again.";
    }
    if (text.includes("Hint:")) return text;
    return text || "Could not save LinkedIn session.";
  }

  function setBusy($btn, label) {
    const original = $btn.data("orig-html") || $btn.html();
    $btn.data("orig-html", original);
    $btn.prop("disabled", true).html(label + "…");
    return original;
  }

  function clearBusy($btn) {
    $btn.prop("disabled", false).html($btn.data("orig-html") || $btn.html());
  }

  function accountList(payload) {
    const apiData = payload?.result?.result ?? payload?.result ?? payload;
    const list = apiData?.data ?? apiData?.accounts ?? apiData;
    return Array.isArray(list) ? list : [];
  }

  function applyLinkedInStatus(list) {
    const linkedin = list.find((a) => !a.provider || a.provider === "linkedin") || null;
    const liveStatus = linkedin?.live_status || null;
    const dbStatus = linkedin?.status || null;
    const hasUnipileId = !!(linkedin?.unipile_account_id);
    const disconnected =
      liveStatus === "disconnected" || dbStatus === "disconnected" || (!!linkedin && !hasUnipileId);
    const connected = !disconnected && dbStatus === "active" && liveStatus !== "disconnected" && hasUnipileId;
    $badge.show();
    if (disconnected) {
      $badge.css({ background: "#fff7ed", color: "#9a3412" }).text("Disconnected");
      return "disconnected";
    }
    if (connected) {
      $badge.css({ background: "#dcfce7", color: "#166534" }).text("Connected");
      return "connected";
    }
    $badge.css({ background: "#fee2e2", color: "#991b1b" }).text("Not connected");
    return "missing";
  }

  /** Compact header + hide account card when LinkedIn is connected. */
  function updateHeaderIdentity(hasToken, connected, email) {
    const $profile = $("#ld-profile-section");
    if (!hasToken) {
      $identityText.show();
      $identityName.text("LinkedEmpire");
      $identitySub.text("Sign in to start");
      $profile.removeClass("ld-show").hide();
      $headerSignout.hide();
      return;
    }
    $headerSignout.show();
    if (connected) {
      $identityText.hide();
      $profile.addClass("ld-show").show();
      if (typeof window.syncLdProfileUi === "function") window.syncLdProfileUi();
      return;
    }
    $identityText.show();
    $profile.removeClass("ld-show").hide();
    const label = String(email || "Account").split("@")[0];
    $identityName.text(label.charAt(0).toUpperCase() + label.slice(1));
    $identitySub.text("Connect LinkedIn to unlock tools");
  }

  function syncPanelLayout(hasToken, liState, email) {
    lastLiState = liState;
    const connected = hasToken && liState === "connected";
    updateHeaderIdentity(hasToken, connected, email);

    if (!hasToken) {
      $card.show().removeClass("ld-compact");
      $accountTitle.text("Account");
      $signedOut.show();
      $signedIn.hide();
      $badge.hide();
      $menus.hide();
      $actionsDivider.hide();
      $toolsHdr.hide();
      $status.text("Sign in with your LinkedEmpire account.");
      return;
    }

    if (!connected) {
      $card.show().removeClass("ld-compact");
      $accountTitle.text("LinkedIn session");
      $signedOut.hide();
      $signedIn.show();
      $menus.hide();
      $actionsDivider.hide();
      $toolsHdr.hide();
      $status.text(
        liState === "disconnected"
          ? "Session disconnected — detect & save again, or paste cookie below."
          : "Detect your browser session or paste cookie to connect."
      );
      return;
    }

    $card.hide().addClass("ld-compact");
    $signedOut.hide();
    $signedIn.hide();
    $badge.hide();
    $status.text("");
    $menus.show();
    $actionsDivider.hide();
    $toolsHdr.show();
  }

  async function loadAccounts(verifyLive) {
    const res = await LDV2.callAction(verifyLive ? "verify_integration_accounts" : "list_integration_accounts");
    return accountList(res);
  }

  async function syncLinkedInSession(options) {
    const silent = !options || options.silent !== false;
    const $btn = options && options.$btn ? options.$btn : null;
    if ($btn) setBusy($btn, options.busyLabel || "Detecting session");
    showError("");
    try {
      const cookieRes = await LDV2.callAction("read_li_at_cookie");
      const liAt = cookieRes?.liAt || null;
      if (!liAt) {
        if (!silent) {
          showError("No LinkedIn session cookie found. Log in to linkedin.com in this browser first.");
        }
        return { ok: false, reason: "no_cookie" };
      }
      if ($btn) setBusy($btn, "Saving session");
      await LDV2.callAction("connect_linkedin_cookie", {
        liAt,
        userAgent: navigator.userAgent,
      });
      await refresh({ verifyLive: true, skipAutoSync: true });
      if (!silent && window.LE2App && LE2App.toast) {
        LE2App.toast("LinkedIn session saved", "success");
      }
      return { ok: true };
    } catch (error) {
      if (!silent) {
        showError(formatConnectError(error.message));
      }
      return { ok: false, error };
    } finally {
      if ($btn) clearBusy($btn);
    }
  }

  async function refresh(options) {
    const verifyLive = !options || options.verifyLive !== false;
    const skipAutoSync = options && options.skipAutoSync;
    if (!window.LDV2) return;
    showError("");
    try {
      const ctxRes = await LDV2.callAction("client_context");
      const context = ctxRes?.context || ctxRes;
      const origin = crmOrigin(context.api_base);
      $("#ld-v2-integrations-link").attr("href", origin + "/social-account");

      if (!context?.has_token) {
        syncPanelLayout(false, "missing");
        if (window.LE2App) {
          LE2App.setSession({ hasToken: false, apiBase: context.api_base });
          LE2App.setLinkedInStatus("missing");
        }
        return;
      }

      const email = context.email || "Signed in";
      let liState = "missing";
      try {
        liState = applyLinkedInStatus(await loadAccounts(verifyLive));
      } catch (_error) {
        $badge.show().css({ background: "#fef3c7", color: "#92400e" }).text("Check connection");
        liState = "missing";
      }

      syncPanelLayout(true, liState, email);

      if (window.LE2App) {
        LE2App.setSession({ hasToken: true, apiBase: context.api_base });
        LE2App.setLinkedInStatus(liState);
      }

      if (!skipAutoSync && liState !== "connected" && !autoSyncAttempted) {
        autoSyncAttempted = true;
        await syncLinkedInSession({ silent: true });
      }
    } catch (error) {
      syncPanelLayout(false, "missing");
      showError(error.message);
      if (window.LE2App) {
        LE2App.setSession({ hasToken: false });
        LE2App.setLinkedInStatus("missing");
      }
    }
  }

  async function signOut() {
    try {
      await LDV2.callAction("extension_sign_out");
    } catch (_error) {
      /* still refresh */
    }
    autoSyncAttempted = false;
    await refresh({ verifyLive: false, skipAutoSync: true });
  }

  $("#ld-v2-signin-btn").on("click", async function () {
    const email = $("#ld-v2-email").val().trim();
    const password = $("#ld-v2-password").val();
    showError("");
    if (!email || !password) {
      showError("Enter email and password.");
      return;
    }
    const $btn = $(this);
    setBusy($btn, "Signing in");
    try {
      await LDV2.callAction("extension_sign_in", { email, password });
      $("#ld-v2-password").val("");
      autoSyncAttempted = false;
      await refresh({ verifyLive: false, skipAutoSync: true });
      clearBusy($btn);
      await syncLinkedInSession({ silent: true });
    } catch (error) {
      showError(error.message || "Sign in failed.");
      clearBusy($btn);
    }
  });

  $("#ld-v2-password").on("keydown", function (e) {
    if (e.key === "Enter") $("#ld-v2-signin-btn").click();
  });

  $("#ld-v2-detect-btn").on("click", async function () {
    await syncLinkedInSession({ silent: false, $btn: $(this), busyLabel: "Detecting session" });
  });

  $("#ld-v2-paste-btn").on("click", async function () {
    const liAt = $("#ld-v2-liat").val().trim();
    if (!liAt) {
      showError("Paste the li_at cookie first.");
      return;
    }
    const $btn = $(this);
    setBusy($btn, "Saving");
    showError("");
    try {
      await LDV2.callAction("connect_linkedin_cookie", { liAt, userAgent: navigator.userAgent });
      await refresh({ verifyLive: true, skipAutoSync: true });
      $("#ld-v2-liat").val("");
      if (window.LE2App && LE2App.toast) LE2App.toast("LinkedIn session saved", "success");
    } catch (error) {
      showError(formatConnectError(error.message));
    } finally {
      clearBusy($btn);
    }
  });

  $("#ld-v2-verify-btn").on("click", async function () {
    const $btn = $(this);
    showError("");
    setBusy($btn, "Checking");
    try {
      await refresh({ verifyLive: true, skipAutoSync: true });
    } catch (error) {
      showError(error.message || "Could not verify connection.");
    } finally {
      clearBusy($btn);
    }
  });

  $("#ld-v2-signout-btn, #ld-header-signout").on("click", signOut);

  refresh({ verifyLive: false, skipAutoSync: false });
});
