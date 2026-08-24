/**
 * ldRoot.js runs before jquery.js, so the append patch must be applied here.
 */
(function ldJqueryPatch() {
    if (typeof window.__ldPatchJQuery === 'function') {
        window.__ldPatchJQuery();
    }
})();
