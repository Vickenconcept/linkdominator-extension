const CampaignRunnerV2 = (function () {
  async function handleUiAction(payload) {
    if (!payload || !payload.action) {
      return { handled: false, reason: "missing_action" };
    }

    if (payload.action === "open_panel") {
      return { handled: true, status: "accepted" };
    }

    return { handled: false, reason: "unsupported_action" };
  }

  async function syncCampaignStatus() {
    return CrmClientV2.request("/campaigns");
  }

  return {
    handleUiAction,
    syncCampaignStatus,
  };
})();
