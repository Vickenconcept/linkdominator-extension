/**
 * Guard LinkedIn's DOM from extension bootstrap hooks when legacy modals are absent.
 * LE2 uses its own modal layer (#le2-action-modal); this file keeps jQuery modal
 * from attaching to LinkedIn UI if bootstrap is ever loaded again.
 */
(function linkedinCompat() {
    'use strict';

    function isExtensionModal(el) {
        if (!el || !el.getAttribute) return false;
        if (el.id === 'le2-action-modal') return true;
        if (el.classList && (el.classList.contains('le2-action-modal') || el.classList.contains('ld-ext-modal'))) {
            return true;
        }
        if (el.closest) {
            return !!el.closest('#ld-root, #mySidepanel, #le2-action-modal, .le2-action-modal');
        }
        return false;
    }

    function wrapBootstrapModal() {
        var $ = window.jQuery;
        if (!$ || !$.fn || !$.fn.modal || $.fn.modal.__ldPatched) return;

        var original = $.fn.modal;
        $.fn.modal = function () {
            var filtered = this.filter(function () {
                return isExtensionModal(this);
            });
            if (!filtered.length) return this;
            return original.apply(filtered, arguments);
        };
        $.fn.modal.Constructor = original.Constructor;
        $.fn.modal.noConflict = original.noConflict;
        $.fn.modal.__ldPatched = true;
    }

    window.LDCompat = { isExtensionModal: isExtensionModal };
    wrapBootstrapModal();
})();
