(function renderUiShellV2() {
  function isCtxValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch (_error) {
      return false;
    }
  }

  function postUiAction(payload) {
    if (!isCtxValid()) {
      return;
    }
    try {
      chrome.runtime.sendMessage(
        {
          type: "v2:ui-action",
          payload,
        },
        function () {
          // Swallow extension context errors after reload.
          void chrome.runtime.lastError;
        }
      );
    } catch (_error) {
      // Extension context invalidated.
    }
  }

  function ensureButton() {
    if (!isCtxValid()) {
      return;
    }

    if (document.getElementById("linkedempire-v2-button")) {
      return;
    }

    const button = document.createElement("button");
    button.id = "linkedempire-v2-button";
    button.textContent = "LE V2";
    button.style.position = "fixed";
    button.style.right = "16px";
    button.style.bottom = "16px";
    button.style.zIndex = "99999";
    button.style.padding = "8px 12px";
    button.style.borderRadius = "8px";
    button.style.border = "none";
    button.style.background = "#1f6feb";
    button.style.color = "#fff";
    button.style.cursor = "pointer";

    button.addEventListener("click", function () {
      postUiAction({
        action: "open_panel",
        context: {
          url: window.location.href,
        },
      });
    });

    document.body.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton);
  } else {
    ensureButton();
  }
})();
