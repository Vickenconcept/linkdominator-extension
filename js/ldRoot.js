/**
 * Isolation + dead-context latch (same approach as v2-extension).
 *
 * Do NOT wrap chrome.runtime.sendMessage / getURL / connect.
 * Do NOT wrap window.fetch or XMLHttpRequest — that patches LinkedIn's
 * own network stack and floods DevTools with GET chrome-extension://invalid/.
 */
(function ldRoot() {
    'use strict';

    var _dead = false;

    function ctxValid() {
        if (_dead) return false;
        try {
            if (!chrome || !chrome.runtime || !chrome.runtime.id) {
                _dead = true;
                return false;
            }
            return true;
        } catch (_e) {
            _dead = true;
            return false;
        }
    }

    function markDead() {
        if (_dead) return;
        _dead = true;
    }

    function isDeadError(err) {
        var msg = String((err && err.message) || err || '');
        return msg.indexOf('invalidated') !== -1 ||
            msg.indexOf('Extension context') !== -1 ||
            msg.indexOf('not established') !== -1 ||
            msg.indexOf('Receiving end does not exist') !== -1 ||
            msg.indexOf('chrome-extension://invalid') !== -1;
    }

    window.__ldCtxValid = ctxValid;
    window.__ldMarkDead = markDead;
    window.__ldIsDeadError = isDeadError;

    function watchContext() {
        if (!ctxValid()) return;
        try {
            var port = chrome.runtime.connect({ name: 'le-watchdog' });
            port.onDisconnect.addListener(function () {
                try {
                    if (chrome.runtime.id) return;
                } catch (_e) {}
                markDead();
            });
        } catch (_e) {
            markDead();
        }
    }
    watchContext();

    function ensureHostStyles() {
        if (document.getElementById('ld-host-styles')) return;
        var style = document.createElement('style');
        style.id = 'ld-host-styles';
        style.textContent = [
            '#ld-root{position:absolute!important;width:0!important;height:0!important;overflow:visible!important;',
            '-webkit-appearance:none!important;appearance:none!important;pointer-events:none!important;',
            'z-index:2147483000!important;transform:none!important;filter:none!important;}',
            '#ld-root>*{pointer-events:auto;}',
            '#open-nav,#open-nav.float-btn{position:fixed!important;left:16px!important;bottom:168px!important;',
            'width:64px!important;height:64px!important;display:flex!important;align-items:center!important;',
            'justify-content:center!important;visibility:visible!important;opacity:1!important;',
            'z-index:2147483646!important;pointer-events:auto!important;background:#fff!important;',
            'border-radius:50%!important;cursor:pointer!important;padding:0!important;margin:0!important;',
            'border:2px solid rgba(34,211,238,0.55)!important;box-shadow:0 8px 24px rgba(6,40,58,.22)!important;overflow:hidden!important;}',
            '#open-nav img,#open-nav .my-float{width:40px!important;height:40px!important;max-width:none!important;',
            'object-fit:contain!important;pointer-events:none!important;display:block!important;}',
            '#open-nav.ld-launcher-hidden{display:none!important;visibility:hidden!important;pointer-events:none!important;}',
            '#mySidepanel.ld-open{display:block!important;transform:none!important;translate:none!important;',
            'width:285px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;',
            'z-index:2147483645!important;left:0!important;top:60px!important;height:calc(100vh - 60px)!important;}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    }

    function ensureRoot() {
        ensureHostStyles();
        var root = document.getElementById('ld-root');
        if (root) return root;
        root = document.createElement('div');
        root.id = 'ld-root';
        root.setAttribute('data-ld-ui', '1');
        var host = document.body || document.documentElement;
        host.appendChild(root);
        return root;
    }

    if (document.body) {
        ensureRoot();
    } else {
        document.addEventListener('DOMContentLoaded', ensureRoot);
    }

    function patchJQuery() {
        var $ = window.jQuery;
        if (!$ || !$.fn || $.fn.append.__ldPatched) return;
        var origAppend = $.fn.append;
        $.fn.append = function () {
            if (this.length === 1 && (this[0] === document.body || (this[0] && this[0].id === 'ld-root'))) {
                var root = ensureRoot();
                if (this[0] === document.body && root) {
                    return origAppend.apply($(root), arguments);
                }
            }
            return origAppend.apply(this, arguments);
        };
        $.fn.append.__ldPatched = true;
    }

    window.__ldEnsureRoot = ensureRoot;
    window.__ldPatchJQuery = patchJQuery;
    patchJQuery();
})();
