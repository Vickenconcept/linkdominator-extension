const CrmClientV2 = (function () {
  const API_BASE = "https://app.linkedempire.com/api/v2";
  const TOKEN_KEY = "linkedempire_v2_token";

  async function getToken() {
    const result = await chrome.storage.local.get([TOKEN_KEY]);
    return result[TOKEN_KEY] || null;
  }

  async function request(path, options = {}) {
    const token = await getToken();
    const headers = Object.assign(
      {
        "Content-Type": "application/json",
      },
      options.headers || {}
    );

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_error) {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(data.message || "CRM v2 request failed");
    }

    return data;
  }

  return {
    request,
  };
})();
