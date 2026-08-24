const CallWorkerV2 = (function () {
  async function pollPendingReminders() {
    try {
      return await CrmClientV2.request("/calls");
    } catch (_error) {
      return { items: [] };
    }
  }

  return {
    pollPendingReminders,
  };
})();
