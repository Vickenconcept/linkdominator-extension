(function initLe2ActionRegistry() {
  window.LE2 = window.LE2 || {};

  /** LinkedEmpire palette — navy/cyan family, distinct from v2 Socifusion rainbow squares. */
  LE2.actionItems = [
    { id: "audience", panel: "audience-hub", label: "Audience", icon: "briefcase", color: "#0e7490", hint: "Create audiences via search or URL import" },
    { id: "campaign", panel: "campaign-hub", label: "Campaign", icon: "sparkles", color: "#b45309", hint: "Run, pause, and stop campaigns" },
    { id: "message-targeted", panel: "bulk-message-targeted", label: "Msg Targeted", icon: "target", color: "#0f766e", hint: "Message leads from a CRM list" },
    { id: "message-followup", panel: "message-followup", label: "Msg Follow-up", icon: "reply", color: "#7c3aed", hint: "Follow-up message to a CRM list" },
    { id: "view-connections", panel: "bulk-profile-view", label: "View Connects", icon: "stats", color: "#475569", hint: "View profiles from a CRM audience" },
    { id: "endorse", panel: "bulk-profile-endorse", label: "Endorse Skills", icon: "star", color: "#c2410c", hint: "Endorse skills for 1st-degree connections in a CRM audience" },
    { id: "add-connection", panel: "add-connection", label: "Add Connects", icon: "follow", color: "#0284c7", hint: "Send connection invites from a CRM audience" },
    { id: "open-connect", panel: "open-connect", label: "Open to Connect", icon: "userCheck", color: "#059669", hint: "Search LinkedIn for open-to-connect people and invite them" },
    { id: "withdraw", panel: "withdraw-invites", label: "Withdraw Invites", icon: "refresh", color: "#64748b", hint: "Cancel pending sent invitations" },
    { id: "accept-invites", panel: "accept-invites", label: "Accept Invites", icon: "check", color: "#15803e", hint: "Bulk accept received invitations" },
  ];

  LE2.getActionItem = function getActionItem(id) {
    return LE2.actionItems.find((item) => item.id === id) || LE2.actionItems[0];
  };
})();
