var userData;

// Global error handler for JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    
    // Handle extension context invalidated error
    if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
        console.log('🔄 Extension context invalidated - extension was reloaded/updated');
        // Don't show error message for this case as it's expected behavior
        return;
    }
    
    // Handle other extension-related errors
    if (event.error && event.error.message && (
        event.error.message.includes('Extension context') ||
        event.error.message.includes('chrome.runtime') ||
        event.error.message.includes('Receiving end does not exist')
    )) {
        console.log('🔄 Extension communication error - likely due to reload/update');
        return;
    }
    
    // Use console.error instead of NotificationSystem to avoid circular dependencies
    console.error('A system error occurred. Please refresh the page.');
});

var ldLogoSrc = 'https://linkedempire.com/images/logo-1.png';
try {
    if (chrome && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        ldLogoSrc = chrome.runtime.getURL('images/logo-1.png');
    }
} catch (_e) {}

var mainMenu = `
<div id="mySidepanel" class="sidepanel ld-empire-panel" style="width:285px;display:none; z-index: 2147483645;">
    <div class="ld-panel-top">
        <div class="ld-brand-row">
            <div class="ld-mark-wrap"><img id="ld-header-mark" src="${ldLogoSrc}" alt="" /></div>
            <div class="ld-identity">
                <div class="profile-section" id="ld-profile-section" style="display:none;">
                    <a href="${LINKEDIN_URL}/in/me" id="profileSpot" class="profile-link"></a>
                </div>
                <div id="ld-identity-text" style="min-width:0;">
                    <div class="ld-identity-name" id="ld-identity-name">LinkedEmpire</div>
                    <div class="ld-identity-sub" id="ld-identity-sub">Sign in to start</div>
                </div>
            </div>
            <div class="ld-header-actions">
                <span id="le2-li-dot" style="display:none;" title="LinkedIn status"></span>
                <button type="button" class="ld-header-signout" id="ld-header-signout" style="display:none;">Sign out</button>
                <button type="button" class="ld-close-btn" id="close-nav" aria-label="Close">&times;</button>
            </div>
        </div>
    </div>
    <div id="ld-profile-ids" style="display:none;"></div>
    <div id="ld-v2-account" class="ld-account-card">
        <div class="ld-account-title" id="ld-v2-account-title">Account</div>
        <div id="ld-v2-status">Sign in to connect your LinkedIn account.</div>
        <div id="ld-v2-li-badge" style="display:none;"></div>
        <div id="ld-v2-error" style="display:none;"></div>
        <div id="ld-v2-signed-out">
            <input id="ld-v2-email" class="ld-input" type="email" placeholder="Email" />
            <input id="ld-v2-password" class="ld-input" type="password" placeholder="Password" />
            <button id="ld-v2-signin-btn" type="button" class="ld-btn-primary">Sign in</button>
        </div>
        <div id="ld-v2-signed-in" style="display:none;">
            <button id="ld-v2-detect-btn" type="button" class="ld-btn-primary" style="margin-bottom:8px;">Detect &amp; save LinkedIn session</button>
            <a id="ld-v2-integrations-link" class="ld-btn-secondary" href="#" target="_blank" rel="noopener noreferrer">Open CRM Integrations</a>
            <button id="ld-v2-verify-btn" type="button" class="ld-btn-ghost" style="margin-bottom:8px;">Verify connection</button>
            <details style="margin-bottom:8px;font-size:10px;color:#64748b;">
                <summary style="cursor:pointer;margin-bottom:6px;">Paste session cookie manually</summary>
                <textarea id="ld-v2-liat" class="ld-input" rows="2" placeholder="Paste LinkedIn session cookie" style="resize:vertical;margin-bottom:6px;"></textarea>
                <button id="ld-v2-paste-btn" type="button" class="ld-btn-primary">Save pasted cookie</button>
            </details>
            <button id="ld-v2-signout-btn" type="button" class="ld-btn-ghost">Sign out</button>
        </div>
        <div id="ld-v2-connected-bar" style="display:none;"></div>
    </div>
    <div id="ld-v2-actions-divider" style="display:none;"></div>
    <div id="ld-tools-header" class="ld-tools-hdr" style="display:none;">Empire Tools</div>
    <div id="menus" class="menus" style="display:none;"></div>
</div>
`;

(function mountLinkedEmpireUi() {
    var root = typeof window.__ldEnsureRoot === 'function'
        ? window.__ldEnsureRoot()
        : document.getElementById('ld-root');
    if (root && window.jQuery) {
        window.jQuery(root).append(mainMenu);
    } else if (window.jQuery) {
        window.jQuery('body').append(mainMenu);
    }

    function syncLauncherVisibility(isOpen) {
        var btn = document.getElementById('open-nav');
        if (!btn) return;
        if (isOpen) {
            btn.classList.add('ld-launcher-hidden');
        } else {
            btn.classList.remove('ld-launcher-hidden');
        }
    }

    window.toggleLinkedEmpirePanel = function toggleLinkedEmpirePanel(force) {
        var panel = document.getElementById('mySidepanel');
        if (!panel) return false;
        var shouldOpen = force === true || (force !== false && !panel.classList.contains('ld-open'));
        if (shouldOpen) {
            panel.classList.add('ld-open');
            panel.style.display = 'block';
            panel.style.transform = 'none';
            panel.style.width = '285px';
            panel.style.visibility = 'visible';
            panel.style.opacity = '1';
            syncLauncherVisibility(true);
            if (typeof window.checkAuthAndShowCard === 'function') {
                window.checkAuthAndShowCard();
            }
        } else {
            panel.classList.remove('ld-open');
            panel.style.display = 'none';
            syncLauncherVisibility(false);
        }
        return shouldOpen;
    };

    function buildLauncherButton() {
        var btn = document.createElement('button');
        btn.id = 'open-nav';
        btn.type = 'button';
        btn.className = 'float-btn';
        btn.setAttribute('aria-label', 'Open LinkedEmpire');
        btn.title = 'LinkedEmpire';
        var img = document.createElement('img');
        img.className = 'my-float';
        img.alt = '';
        img.width = 40;
        img.height = 40;
        img.src = ldLogoSrc;
        img.addEventListener('error', function onLogoError() {
            img.removeEventListener('error', onLogoError);
            img.src = 'https://linkedempire.com/images/logo-1.png';
        });
        btn.appendChild(img);
        return btn;
    }

    var btn = document.getElementById('open-nav');
    if (!btn) {
        btn = buildLauncherButton();
        (document.body || document.documentElement).appendChild(btn);
    } else if (!btn.querySelector('img')) {
        btn.textContent = '';
        btn.appendChild(buildLauncherButton().querySelector('img').cloneNode(true));
    }
    btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.toggleLinkedEmpirePanel();
    }, true);
})();

getUserProfile();

// CRM Bearer token owns the account — same gate as v2-extension.
const checkAuthAndShowCard = () => {
    if (typeof window.LE2App?.refreshAuthGate === 'function') {
        window.LE2App.refreshAuthGate().then((hasToken) => {
            if (hasToken) return;
            const $sidePanel = $('#mySidepanel');
            if ($sidePanel.is(':hidden')) $sidePanel.show();
            document.getElementById('ld-v2-account')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
    }
    $('#authorize-button-container').hide();
};

window.checkAuthAndShowCard = checkAuthAndShowCard;

$(document).on('click', '#close-nav', function() {
    if (typeof window.toggleLinkedEmpirePanel === 'function') {
        window.toggleLinkedEmpirePanel(false);
        return;
    }
    $('#mySidepanel').removeClass('ld-open').hide();
});
