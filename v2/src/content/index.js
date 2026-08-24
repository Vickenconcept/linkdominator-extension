(function bootstrapContentV2() {
  if (window.__linkedEmpireV2Mounted) {
    return;
  }

  function isCtxValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch (_error) {
      return false;
    }
  }

  // If extension was reloaded while LinkedIn tab stayed open, this old script
  // context becomes invalid. Never call runtime APIs in that state.
  if (!isCtxValid()) {
    return;
  }

  window.__linkedEmpireV2Mounted = true;

  try {
    chrome.runtime.sendMessage(
      {
        type: "v2:content-mounted",
        payload: {
          url: window.location.href,
          title: document.title,
        },
      },
      function () {
        // Read and ignore runtime error to avoid noisy console logs.
        void chrome.runtime.lastError;
      }
    );
  } catch (_error) {
    // Extension context invalidated between guard and sendMessage.
  }
})();
