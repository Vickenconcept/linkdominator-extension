/**
 * LinkedIn Feed Comment Generator
 * Adds AI comment generation feature to LinkedIn feed posts
 */

(function() {
    'use strict';

    // Configuration - access from global scope (set by env.js and appConfig.js)
    const PLATFORM_URL = (typeof window.PLATFORM_URL !== 'undefined' ? window.PLATFORM_URL : 'https://linkedempire.com');
    
    // Get LinkedIn ID from global scope (set by appConfig.js)
    function getLinkedInId() {
        // Try window.linkedinId first (set by appConfig.js)
        if (typeof window.linkedinId !== 'undefined' && window.linkedinId) {
            return window.linkedinId;
        }
        // Fallback to jQuery selector (if jQuery is loaded)
        if (typeof $ !== 'undefined' && $('#me-publicIdentifier').length) {
            return $('#me-publicIdentifier').val();
        }
        return '';
    }
    
    const LINKEDIN_ID = getLinkedInId();
    
    // Wait a bit for appConfig.js to set linkedinId
    if (!LINKEDIN_ID) {
        setTimeout(() => {
            const id = getLinkedInId();
            if (id) {
                window.ldCommentGenLinkedInId = id;
            }
        }, 2000);
    }
    
    // Check if current page is a feed page, search results, company, hashtag, group, posts, or events page
    function isFeedPage() {
        return window.location.href.includes('linkedin.com/feed') || 
               window.location.pathname === '/feed' || 
               window.location.pathname.startsWith('/feed/') ||
               window.location.pathname.includes('/search/results/') ||
               window.location.pathname.includes('/company/') ||
               window.location.pathname.includes('/groups/') ||
               window.location.pathname.includes('/posts/') ||
               window.location.pathname.includes('/events/');
    }
    
    // Check if we're on the main feed page (not a single post)
    function isMainFeedPage() {
        return window.location.pathname === '/feed' || 
               (window.location.pathname.startsWith('/feed/') && 
                !window.location.pathname.includes('/feed/update/') && 
                !window.location.pathname.includes('/feed/hashtag/'));
    }
    
    // Check if we're on a single post page
    function isSinglePostPage() {
        return window.location.pathname.includes('/feed/update/') || 
               window.location.pathname.includes('/posts/');
    }
    
    // Check if we're on a /posts/ page (individual post page)
    function isPostsPage() {
        return window.location.pathname.includes('/posts/');
    }
    
    // Check if we're on a search results page
    function isSearchResultsPage() {
        return window.location.pathname.includes('/search/results/');
    }
    
    // Check if we're on a company page
    function isCompanyPage() {
        return window.location.pathname.includes('/company/');
    }
    
    // Check if we're on a hashtag feed page
    function isHashtagFeedPage() {
        return window.location.pathname.includes('/feed/hashtag/');
    }
    
    // Check if we're on a group page
    function isGroupPage() {
        return window.location.pathname.includes('/groups/');
    }
    
    // Only run on LinkedIn feed pages, search results, company, hashtag, group, or posts pages
    if (!isFeedPage()) {
        return;
    }

    // CSS for the comment generator button and modal
    const style = document.createElement('style');
    style.textContent = `
        .ld-comment-gen-btn {
            position: absolute;
            top: 12px;
            right: 48px;
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #0077b5 0%, #005885 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 119, 181, 0.3);
            border: 2px solid white;
            user-select: none;
            touch-action: none;
        }
        
        .ld-comment-gen-btn:active {
            cursor: grabbing;
        }
        
        .ld-comment-gen-btn.dragging {
            opacity: 1 !important;
            transition: none;
            z-index: 10001;
            box-shadow: 0 8px 20px rgba(0, 119, 181, 0.5);
        }
        
        .feed-shared-update-v2:hover .ld-comment-gen-btn,
        .occludable-update:hover .ld-comment-gen-btn,
        [data-test-id="main-feed-activity-card"]:hover .ld-comment-gen-btn,
        .search-results__search-feed-update:hover .ld-comment-gen-btn,
        [role="listitem"]:hover .ld-comment-gen-btn,
        [data-testid="main-feed-activity-card"]:hover .ld-comment-gen-btn,
        .feed-shared-update-v2__update-content-wrapper:hover .ld-comment-gen-btn,
        .feed-container-theme .feed-shared-update-v2:hover .ld-comment-gen-btn {
            opacity: 1;
        }
        
        .ld-comment-gen-btn:hover:not(.dragging) {
            background: linear-gradient(135deg, #005885 0%, #004d6f 100%);
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 119, 181, 0.4);
        }
        
        .ld-comment-gen-btn:active:not(.dragging) {
            transform: scale(1.05);
        }
        
        .ld-comment-gen-btn svg {
            width: 20px;
            height: 20px;
            fill: white;
            pointer-events: none;
        }
        
        .ld-comment-gen-btn.loading {
            opacity: 1;
            background: #666;
            cursor: not-allowed;
        }
        
        .ld-comment-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        }
        
        .ld-comment-modal.active {
            display: flex;
        }
        
        .ld-comment-modal-content {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        
        .ld-comment-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .ld-comment-modal-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #000;
        }
        
        .ld-comment-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .ld-comment-modal-close:hover {
            color: #000;
        }
        
        .ld-comment-textarea {
            width: 100%;
            min-height: 120px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            margin-bottom: 16px;
        }
        
        .ld-comment-modal-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        
        .ld-comment-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .ld-comment-btn:active {
            transform: translateY(1px);
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .ld-comment-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        
        .ld-comment-btn-primary {
            background: linear-gradient(135deg, #0077b5 0%, #005885 100%);
            color: white;
        }
        
        .ld-comment-btn-primary:hover {
            background: linear-gradient(135deg, #005885 0%, #004d6f 100%);
            box-shadow: 0 4px 8px rgba(0, 119, 181, 0.3);
        }
        
        .ld-comment-btn-secondary {
            background: #f3f2ef;
            color: #000;
        }
        
        .ld-comment-btn-secondary:hover {
            background: #e9e9e9;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .ld-comment-loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .ld-comment-error {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 16px;
        }
        
        .ld-comment-btn-regenerate {
            background: #f3f2ef;
            color: #0077b5;
            border: 1px solid #0077b5;
        }
        
        .ld-comment-btn-regenerate:hover {
            background: #e8f4f8;
            border-color: #005885;
            color: #005885;
            box-shadow: 0 4px 8px rgba(0, 119, 181, 0.2);
        }
        
        .ld-comment-btn-primary.copied {
            background: linear-gradient(135deg, #28a745 0%, #218838 100%);
        }
        
        .ld-comment-btn-primary.copied:hover {
            background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
        }
    `;
    document.head.appendChild(style);

    // Create modal HTML
    const modalHTML = `
        <div class="ld-comment-modal" id="ldCommentModal">
            <div class="ld-comment-modal-content">
                <div class="ld-comment-modal-header">
                    <h3>AI Generated Comment</h3>
                    <button class="ld-comment-modal-close" id="ldCommentModalClose">&times;</button>
                </div>
                <div id="ldCommentModalBody">
                    <div class="ld-comment-loading">Generating comment...</div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('ldCommentModal');
    const modalBody = document.getElementById('ldCommentModalBody');
    const modalClose = document.getElementById('ldCommentModalClose');

    // Close modal
    modalClose.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Storage key prefix for localStorage
    const STORAGE_KEY_PREFIX = 'ld_ai_comment_';
    const MAX_STORED_COMMENTS = 100; // Limit stored comments to prevent localStorage bloat
    
    // Track current post hash and element references for regenerate functionality
    let currentPostHash = null;
    let currentPostContent = null;
    let currentPostElement = null;
    let currentGenButton = null;

    /**
     * Generate a simple hash from post content
     */
    function hashPostContent(content) {
        let hash = 0;
        const str = content.trim().toLowerCase();
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get stored comment for a post
     */
    function getStoredComment(postHash) {
        try {
            const key = STORAGE_KEY_PREFIX + postHash;
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error reading stored comment:', error);
        }
        return null;
    }

    /**
     * Save comment to localStorage
     */
    function saveComment(postHash, comment) {
        try {
            const key = STORAGE_KEY_PREFIX + postHash;
            const data = {
                comment: comment,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(data));
            
            // Cleanup old comments periodically
            cleanupOldComments();
        } catch (error) {
            console.error('Error saving comment:', error);
            // If quota exceeded, cleanup and try again
            if (error.name === 'QuotaExceededError') {
                cleanupOldComments(true);
                try {
                    const key = STORAGE_KEY_PREFIX + postHash;
                    localStorage.setItem(key, JSON.stringify({ comment: comment, timestamp: Date.now() }));
                } catch (retryError) {
                    console.error('Error saving comment after cleanup:', retryError);
                }
            }
        }
    }

    /**
     * Cleanup old comments to prevent localStorage bloat
     */
    function cleanupOldComments(aggressive = false) {
        try {
            const keys = Object.keys(localStorage);
            const commentKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
            
            if (commentKeys.length <= MAX_STORED_COMMENTS && !aggressive) {
                return; // No cleanup needed
            }
            
            // Get all stored comments with timestamps
            const comments = commentKeys.map(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    return {
                        key: key,
                        timestamp: data.timestamp || 0
                    };
                } catch (e) {
                    return { key: key, timestamp: 0 };
                }
            });
            
            // Sort by timestamp (newest first)
            comments.sort((a, b) => b.timestamp - a.timestamp);
            
            // Remove oldest comments, keep only the most recent MAX_STORED_COMMENTS
            const toRemove = comments.slice(MAX_STORED_COMMENTS);
            toRemove.forEach(item => {
                localStorage.removeItem(item.key);
            });
            
            // Cleaned up old comments from localStorage
        } catch (error) {
            console.error('Error cleaning up old comments:', error);
        }
    }

    /**
     * Extract post content from LinkedIn feed post element
     */
    function extractPostContent(postElement) {
        // Try multiple selectors for post content
        // Works for both main feed (role="listitem") and single post pages
        const selectors = [
            '.feed-shared-update-v2__description',
            '.feed-shared-text',
            '.feed-shared-text__text-view',
            '.update-components-text',
            '[data-test-id="main-feed-activity-card"] .feed-shared-text',
            '[data-testid="main-feed-activity-card"] .feed-shared-text',
            '.feed-shared-update-v2__description-wrapper',
            // For listitem containers, search within them
            '[role="listitem"] .feed-shared-text',
            '[role="listitem"] .feed-shared-update-v2__description',
            '[role="listitem"] .update-components-text',
            // Generic fallbacks
            '[class*="feed-shared-text"]',
            '[class*="update-components-text"]',
            '[class*="description"]'
        ];
        
        // If the element itself is a listitem, search within it
        const searchRoot = postElement.getAttribute('role') === 'listitem' 
            ? postElement 
            : postElement;
        
        for (const selector of selectors) {
            const contentEl = searchRoot.querySelector(selector);
            if (contentEl) {
                const text = contentEl.innerText || contentEl.textContent || '';
                if (text.trim().length > 0) {
                    return text.trim();
                }
            }
        }
        
        // Fallback: try to get text directly from the post element if it has substantial content
        const directText = postElement.innerText || postElement.textContent || '';
        if (directText.trim().length > 50) {
            // Only use direct text if it's substantial (likely a post)
            return directText.trim();
        }
        
        return '';
    }

    /**
     * Generate comment via API
     */
    async function generateComment(postContent) {
        try {
            // Get LinkedIn ID (with retry if not available yet)
            let linkedInId = LINKEDIN_ID || window.ldCommentGenLinkedInId || getLinkedInId();
            if (!linkedInId) {
                // Wait a bit more and try again
                await new Promise(resolve => setTimeout(resolve, 1000));
                linkedInId = getLinkedInId();
            }
            
            if (!linkedInId) {
                throw new Error('LinkedIn ID not available. Please refresh the page.');
            }
            
            const response = await fetch(`${PLATFORM_URL}/api/post/generate-comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'lk-id': (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : linkedInId),
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    post_content: postContent,
                    tone: 'professional'
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate comment');
            }

            return data.data.comment || '';
        } catch (error) {
            console.error('Error generating comment:', error);
            throw error;
        }
    }

    /**
     * Copy text to clipboard
     */
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Show modal with generated comment
     */
    function showCommentModal(comment, error = null, onRegenerate = null) {
        if (error) {
            modalBody.innerHTML = `
                <div class="ld-comment-error">${error}</div>
                <div class="ld-comment-modal-actions">
                    <button class="ld-comment-btn ld-comment-btn-secondary" onclick="document.getElementById('ldCommentModal').classList.remove('active')">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        Close
                    </button>
                </div>
            `;
        } else {
            const regenerateBtn = onRegenerate ? `
                <button class="ld-comment-btn ld-comment-btn-regenerate" id="ldCommentRegenerateBtn">
                    <svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                    Regenerate
                </button>
            ` : '';
            
            modalBody.innerHTML = `
                <textarea class="ld-comment-textarea" id="ldCommentText" readonly>${comment}</textarea>
                <div class="ld-comment-modal-actions">
                    <button class="ld-comment-btn ld-comment-btn-secondary" onclick="document.getElementById('ldCommentModal').classList.remove('active')">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        Close
                    </button>
                    ${regenerateBtn}
                    <button class="ld-comment-btn ld-comment-btn-primary" id="ldCommentCopyBtn">
                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        Copy Comment
                    </button>
                </div>
            `;
            
            // Copy button handler
            document.getElementById('ldCommentCopyBtn').addEventListener('click', () => {
                const commentText = document.getElementById('ldCommentText').value;
                const btn = document.getElementById('ldCommentCopyBtn');
                if (copyToClipboard(commentText)) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        Copied!
                    `;
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.classList.remove('copied');
                    }, 2000);
                }
            });
            
            // Regenerate button handler
            if (onRegenerate) {
                document.getElementById('ldCommentRegenerateBtn').addEventListener('click', () => {
                    onRegenerate();
                });
            }
        }
        
        modal.classList.add('active');
    }

    /**
     * Handle comment generation button click
     */
    async function handleCommentGeneration(btn, postElement, forceRegenerate = false) {
        // Store references for regenerate callback
        currentGenButton = btn;
        currentPostElement = postElement;
        
        btn.classList.add('loading');
        btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/></circle></svg>';
        
        try {
            const postContent = extractPostContent(postElement);
            
            if (!postContent) {
                throw new Error('Could not extract post content. Please try again.');
            }
            
            // Generate hash for this post
            const postHash = hashPostContent(postContent);
            currentPostHash = postHash;
            currentPostContent = postContent;
            
            // Check if comment exists in storage (unless forcing regenerate)
            if (!forceRegenerate) {
                const stored = getStoredComment(postHash);
                if (stored && stored.comment) {
                    // Show stored comment with regenerate option
                    const regenerateCallback = () => {
                        if (currentGenButton && currentPostElement) {
                            handleCommentGeneration(currentGenButton, currentPostElement, true);
                        }
                    };
                    showCommentModal(stored.comment, null, regenerateCallback);
                    btn.classList.remove('loading');
                    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
                    return;
                }
            }
            
            // Show loading modal
            modalBody.innerHTML = '<div class="ld-comment-loading">Generating comment...</div>';
            modal.classList.add('active');
            
            // Generate new comment
            const comment = await generateComment(postContent);
            
            // Save to localStorage
            saveComment(postHash, comment);
            
            // Show comment with regenerate option
            const regenerateCallback = () => {
                if (currentGenButton && currentPostElement) {
                    handleCommentGeneration(currentGenButton, currentPostElement, true);
                }
            };
            showCommentModal(comment, null, regenerateCallback);
        } catch (error) {
            showCommentModal('', error.message);
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        }
    }

    /**
     * Skip LinkedIn ads / promoted cards.
     * Injecting UI onto ads sits on top of the overflow ("...") control and
     * LinkedIn then opens the uncloseable "Don't want to see this" dialog.
     */
    function isSponsoredOrAd(el) {
        if (!el || !el.querySelector) return false;
        if (el.closest && el.closest('.ad-banner-container, .ad-banner, [data-test-id="ad-banner"]')) {
            return true;
        }
        const root = (el.closest && el.closest('.feed-shared-update-v2, .occludable-update, [role="listitem"], .update-components-promo')) || el;
        const className = String(root.className || '');
        if (/\bsponsored\b|\bpromoted\b/i.test(className)) return true;
        if (root.querySelector && root.querySelector(
            '.update-components-promo, [class*="update-components-promo"], [data-ad-id], .ad-banner-container, .feed-shared-update-v2--is-sponsored, .feed-shared-update-v2--sponsored'
        )) return true;
        const header = root.querySelector && root.querySelector(
            '.update-components-actor, .feed-shared-actor, .update-components-header, .update-components-actor__meta'
        );
        if (header) {
            const labels = header.querySelectorAll('span, a');
            for (let i = 0; i < labels.length && i < 12; i++) {
                const t = (labels[i].textContent || '').trim().toLowerCase();
                if (t === 'promoted' || t === 'sponsored') return true;
            }
        }
        return false;
    }

    /**
     * Add comment generation button to post
     */
    function addCommentButtonToPost(postElement) {
        if (isSponsoredOrAd(postElement)) {
            return false;
        }
        // Verify this is actually a post element
        const isListItem = postElement.getAttribute('role') === 'listitem';
        const isMainFeed = isMainFeedPage(); // Check page type directly
        const isSearchResults = isSearchResultsPage(); // Check if search results page
        const isCompany = isCompanyPage(); // Check if company page
        const isHashtag = isHashtagFeedPage(); // Check if hashtag feed
        const isGroup = isGroupPage(); // Check if group page
        const isPosts = isPostsPage(); // Check if /posts/ page
        const isSearchResultPost = postElement.classList.contains('search-results__search-feed-update');
        const isCompanyPost = postElement.classList.contains('feed-shared-update-v2') && isCompany;
        const isGroupPost = postElement.classList.contains('feed-shared-update-v2') && isGroup;
        const isPostsPagePost = isPosts && (postElement.classList.contains('feed-shared-update-v2') || 
            postElement.getAttribute('data-testid')?.includes('activity-card') ||
            postElement.getAttribute('data-test-id')?.includes('activity-card') ||
            postElement.querySelector('[data-urn*="activity:"]'));
        
        // Check for content (used later in logging)
        let hasContent = null;
        let hasActivityUrn = null;
        
        // For listitem in mainFeed or hashtag feeds, accept them directly if visible
        if ((isMainFeed || isHashtag) && isListItem) {
            const rect = postElement.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) {
                return false; // Not visible
            }
            // Continue to add button - don't return early!
        } 
        // For search results posts, accept them directly if visible
        else if (isSearchResults && isSearchResultPost) {
            const rect = postElement.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) {
                return false; // Not visible
            }
            // Continue to add button - don't return early!
        }
        // For company page posts, accept them directly if visible
        else if (isCompanyPost) {
            const rect = postElement.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) {
                return false; // Not visible
            }
            // Continue to add button - don't return early!
        }
        // For group posts, accept them directly if visible
        else if (isGroupPost) {
            const rect = postElement.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) {
                return false; // Not visible
            }
            // Continue to add button - don't return early!
        }
        // For /posts/ page posts, accept them directly if visible
        else if (isPostsPagePost) {
            const rect = postElement.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) {
                return false; // Not visible
            }
            // Continue to add button - don't return early!
        } else {
            // For other containers (single post pages), verify content
            hasContent = postElement.querySelector('.feed-shared-text, .feed-shared-update-v2__description, [data-test-id="main-feed-activity-card"] .feed-shared-text, [data-testid="main-feed-activity-card"] .feed-shared-text, .update-components-text, [class*="feed-shared-text"], [class*="update-components-text"]');
            hasActivityUrn = postElement.querySelector('[data-urn*="activity:"]') || postElement.getAttribute('data-urn')?.includes('activity:');
            
            if (!hasContent && !hasActivityUrn) {
                return false;
            }
        }
        
        // Continue to create and add the button (don't return early!)
        
        // Try multiple container selectors to find the right parent
        // For listitem containers, use them directly or find the post content wrapper within
        let container = null;
        
        // If postElement is a listitem, use it directly as container (for main feed/hashtag)
        // If postElement is a search result/company/group post, use it directly as container
        // Use the page type variables already defined above
        if (isSearchResults && isSearchResultPost) {
            // For search results posts, use the post element itself as container
            container = postElement;
        } else if (isCompanyPost || isGroupPost) {
            // For company or group posts, use the post element itself as container
            container = postElement;
        } else if ((isMainFeed || isHashtag) && isListItem) {
            // For listitem in mainFeed or hashtag feeds, use the listitem itself as container
            container = postElement;
        } else if (isListItem) {
            // For listitem on other pages, try to find the actual post content container within it
            container = postElement.querySelector('.feed-shared-update-v2, .occludable-update, [data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"], .feed-shared-update-v2__update-content-wrapper');
            // If no specific container found, use the listitem itself
            if (!container) {
                container = postElement;
            }
        } else if (isSearchResults) {
            // For search results, try to find container within the search result post
            container = postElement.querySelector('.feed-shared-update-v2, .occludable-update, [data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"], .feed-shared-update-v2__update-content-wrapper');
            // If no specific container found, use the post element itself
            if (!container) {
                container = postElement;
            }
        } else if (isPosts) {
            // For /posts/ pages, find the post container
            container = postElement.querySelector('.feed-shared-update-v2, .occludable-update, [data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"], .feed-shared-update-v2__update-content-wrapper');
            if (!container) {
                // Try to find parent container
                container = postElement.closest('.feed-shared-update-v2, .occludable-update, [data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"]');
            }
            if (!container) {
                // If no container found, use the post element itself
                container = postElement;
            }
        } else {
            // For non-listitem elements, prioritize the post element itself if it's a feed-shared-update-v2
            // This ensures each feed-shared-update-v2 gets its own button, even if inside occludable-update
            if (postElement.classList?.contains('feed-shared-update-v2')) {
                container = postElement;
            } else {
                // Try to find feed-shared-update-v2 within the post element first
                container = postElement.querySelector('.feed-shared-update-v2');
                if (!container) {
                    container = postElement.closest('.feed-shared-update-v2');
                }
                if (!container) {
                    container = postElement.closest('.occludable-update');
                }
                if (!container) {
                    container = postElement.closest('[data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"]');
                }
                if (!container) {
                    container = postElement.closest('[role="listitem"]');
                }
                if (!container) {
                    container = postElement.querySelector('.feed-shared-update-v2__update-content-wrapper');
                }
                if (!container) {
                    // If we still don't have a container, use the post element itself
                    container = postElement;
                }
            }
        }
        
        // Validate container exists and is in DOM
        if (!container || !container.isConnected) {
            return false;
        }
        
        // Check if button already exists in container (where we'll add it)
        // This prevents duplicate buttons when multiple elements match the same post
        const existingButton = container.querySelector('.ld-comment-gen-btn');
        if (existingButton) {
            return false; // Button already exists in container
        }
        // Also check if container itself is a button (shouldn't happen, but be safe)
        if (container.classList && container.classList.contains('ld-comment-gen-btn')) {
            return false;
        }
        // Check if any DIRECT ancestor (not too far up) has a button
        // This catches cases where a parent element was used as container for another postElement
        // But we should only check close ancestors that are actually post containers, not feed containers
        let checkElement = container.parentElement;
        let ancestorWithButton = null;
        let depth = 0;
        const MAX_ANCESTOR_DEPTH = 2; // Only check up to 2 levels up (direct parent and grandparent)
        const SKIP_ANCESTOR_SELECTORS = [
            'scaffold-finite-scroll__content',
            'scaffold-finite-scroll',
            'main',
            '[role="main"]',
            'body',
            'html',
            '[data-testid="mainFeed"]'
        ];
        
        while (checkElement && checkElement !== document.body && depth < MAX_ANCESTOR_DEPTH) {
            // Skip checking ancestors that are feed containers (too high up)
            const isFeedContainer = SKIP_ANCESTOR_SELECTORS.some(selector => {
                if (selector.startsWith('[')) {
                    return checkElement.matches?.(selector);
                }
                return checkElement.classList?.contains(selector) || 
                       checkElement.id === selector;
            });
            
            if (isFeedContainer) {
                // This is a feed container, not a post container - stop checking
                break;
            }
            
            // Check if this ancestor has a button AND is a post-like container
            if (checkElement.querySelector && checkElement.querySelector('.ld-comment-gen-btn')) {
                // Only skip if the ancestor is actually a post container (same type as our container)
                const isPostLikeContainer = checkElement.classList?.contains('occludable-update') ||
                                          checkElement.classList?.contains('feed-shared-update-v2') ||
                                          checkElement.getAttribute('role') === 'listitem' ||
                                          checkElement.getAttribute('data-urn')?.includes('activity:');
                
                if (isPostLikeContainer) {
                    // Check if this ancestor is the same type as our container
                    // If container is feed-shared-update-v2 and ancestor is occludable-update, that's OK
                    // (feed-shared-update-v2 is inside occludable-update, they're different levels)
                    const containerIsFeedShared = container.classList?.contains('feed-shared-update-v2');
                    const ancestorIsOccludable = checkElement.classList?.contains('occludable-update');
                    
                    // If container is feed-shared-update-v2 inside occludable-update, allow it
                    // (they're different post elements, not duplicates)
                    if (containerIsFeedShared && ancestorIsOccludable) {
                        // This is fine - feed-shared-update-v2 is a child of occludable-update
                        // They're different post elements, so both can have buttons
                        checkElement = checkElement.parentElement;
                        depth++;
                        continue;
                    }
                    
                    // Otherwise, if they're the same type, skip
                    ancestorWithButton = checkElement;
                    break;
                }
            }
            
            checkElement = checkElement.parentElement;
            depth++;
        }
        
        if (ancestorWithButton) {
            return false; // Button exists in a post-like ancestor of container
        }
        
        // Make container relative if needed
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.position === 'static') {
            container.style.position = 'relative';
        }
        container.style.overflow = 'visible';
        
        // Create button
        const btn = document.createElement('button');
        btn.className = 'ld-comment-gen-btn';
        btn.setAttribute('title', 'Generate AI Comment (Click to generate, Drag to move)');
        btn.setAttribute('aria-label', 'Generate AI Comment');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="white" style="width: 20px; height: 20px;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zm-7-8H7v2h6V8zm4-4H7v2h10V4z"/></svg>';
        
        // Make button draggable
        let isDragging = false;
        let startX, startY, initialX, initialY;
        let hasMoved = false;
        
        btn.addEventListener('mousedown', (e) => {
            // Don't start dragging on right click
            if (e.button !== 0) return;
            
            isDragging = true;
            hasMoved = false;
            btn.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = btn.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            hasMoved = true;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const containerRect = container.getBoundingClientRect();
            const btnRect = btn.getBoundingClientRect();
            
            // Calculate new position relative to container
            let newX = initialX + deltaX - containerRect.left;
            let newY = initialY + deltaY - containerRect.top;
            
            // Constrain button within container bounds
            const maxX = containerRect.width - btnRect.width;
            const maxY = containerRect.height - btnRect.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            btn.style.left = newX + 'px';
            btn.style.top = newY + 'px';
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            btn.classList.remove('dragging');
            
            // Only trigger click if button wasn't dragged
            if (!hasMoved) {
                handleCommentGeneration(btn, container);
            }
            
            hasMoved = false;
        });
        
        // Touch events for mobile
        btn.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            
            isDragging = true;
            hasMoved = false;
            btn.classList.add('dragging');
            
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = btn.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            
            hasMoved = true;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const containerRect = container.getBoundingClientRect();
            const btnRect = btn.getBoundingClientRect();
            
            let newX = initialX + deltaX - containerRect.left;
            let newY = initialY + deltaY - containerRect.top;
            
            const maxX = containerRect.width - btnRect.width;
            const maxY = containerRect.height - btnRect.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            btn.style.left = newX + 'px';
            btn.style.top = newY + 'px';
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
            
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            btn.classList.remove('dragging');
            
            if (!hasMoved) {
                handleCommentGeneration(btn, container);
            }
            
            hasMoved = false;
        });
        
        try {
            container.appendChild(btn);
            return true; // Successfully added button
        } catch (error) {
            console.error('Error appending button to container:', error);
            return false;
        }
    }

    // Global observer and initialization state
    let feedObserver = null;
    let rootObserver = null;
    let isInitialized = false;
    let periodicInterval = null;
    let urlPollingInterval = null;
    let lastUrl = location.href;

    /**
     * Scan for posts and add buttons
     */
    function scanAndAddButtons() {
        // Check if still on feed page
        if (!isFeedPage()) {
            return;
        }

        // Determine search scope based on page type
        let searchScope = document;
        const isMainFeed = isMainFeedPage();
        const isSinglePost = isSinglePostPage();
        const isSearchResults = isSearchResultsPage();
        const isCompany = isCompanyPage();
        const isHashtag = isHashtagFeedPage();
        const isGroup = isGroupPage();
        const isPosts = isPostsPage();
        
        // For main feed, search within the mainFeed container
        if (isMainFeed) {
            const mainFeedContainer = document.querySelector('[data-testid="mainFeed"]');
            if (mainFeedContainer) {
                searchScope = mainFeedContainer;
            }
        }
        
        // For search results, search within the search-results-container
        if (isSearchResults) {
            const searchResultsContainer = document.querySelector('.search-results-container');
            if (searchResultsContainer) {
                searchScope = searchResultsContainer;
            }
        }
        
        // For company pages, search within the feed-container-theme container
        if (isCompany) {
            const companyFeedContainer = document.querySelector('.feed-container-theme');
            if (companyFeedContainer) {
                searchScope = companyFeedContainer;
            }
        }
        
        // For hashtag feeds, search within the mainFeed container (similar to main feed)
        if (isHashtag) {
            const hashtagFeedContainer = document.querySelector('[data-testid="mainFeed"]') || document.querySelector('.feed-container-theme');
            if (hashtagFeedContainer) {
                searchScope = hashtagFeedContainer;
            }
        }
        
        // For groups, search within common group feed containers
        if (isGroup) {
            const groupFeedContainer = document.querySelector('.feed-container-theme') || document.querySelector('[data-testid="mainFeed"]');
            if (groupFeedContainer) {
                searchScope = groupFeedContainer;
            }
        }
        
        // For /posts/ pages, search within main container
        if (isPosts) {
            const postsContainer = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('.scaffold-finite-scroll__content');
            if (postsContainer) {
                searchScope = postsContainer;
            }
        }

        // Primary selectors for posts (work for all page types)
        // Prioritize page-specific selectors first
        const primarySelectors = isSearchResults ? [
            '.search-results__search-feed-update',  // Search results posts
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
            '.feed-shared-update-v2',
            '.occludable-update',
        ] : isCompany ? [
            '.feed-shared-update-v2',  // Company page posts (user specified this class)
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
            '.occludable-update',
        ] : isHashtag ? [
            '[role="listitem"]',  // Hashtag feeds use similar structure to main feed
            '.feed-shared-update-v2',
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
            '.occludable-update',
        ] : isGroup ? [
            '.feed-shared-update-v2',  // Groups use similar structure to company pages
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
            '.occludable-update',
        ] : isPosts ? [
            // /posts/ page selectors - individual post pages
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            '.feed-shared-update-v2',
            '.occludable-update',
            'article[data-urn*="activity:"]',
            'div[data-urn*="activity:"]',
            '.update-components-actor',
            '[class*="feed-shared-update"]',
        ] : isMainFeed ? [
            '[role="listitem"]',  // Main feed posts are in listitem containers
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
            '.feed-shared-update-v2',
            '.occludable-update',
        ] : [
            // Single post page selectors (keep existing logic)
            '[data-testid="main-feed-activity-card"]',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
            '.feed-shared-update-v2',
            '.occludable-update',
        ];
        
        // Secondary selectors (fallback for different layouts)
        const secondarySelectors = [
            '.feed-shared-update-v2__update-content-wrapper',
            '.feed-shared-update-v2__description-wrapper',
            '.update-components-actor',
            '.feed-shared-update-v2__update-content',
            '[class*="feed-shared-update"]',
            '[class*="update-components"]',
        ];
        
        // Collect all unique posts from primary selectors first
        const allPosts = new Set();
        let foundWithPrimary = false;
        
        for (const selector of primarySelectors) {
            const found = searchScope.querySelectorAll(selector);
            if (found.length > 0) {
                foundWithPrimary = true;
                found.forEach(post => {
                    // For search results, accept .search-results__search-feed-update directly
                    if (isSearchResults && post.classList.contains('search-results__search-feed-update')) {
                        allPosts.add(post);
                    }
                    // For company pages, accept .feed-shared-update-v2 directly
                    else if (isCompany && post.classList.contains('feed-shared-update-v2')) {
                        allPosts.add(post);
                    }
                    // For hashtag feeds with role="listitem", accept them directly
                    else if (isHashtag && post.getAttribute('role') === 'listitem') {
                        allPosts.add(post);
                    }
                    // For groups, accept .feed-shared-update-v2 directly
                    else if (isGroup && post.classList.contains('feed-shared-update-v2')) {
                        allPosts.add(post);
                    }
                    // For /posts/ pages, accept posts with activity card or feed-shared-update-v2
                    else if (isPosts && (post.classList.contains('feed-shared-update-v2') || 
                        post.getAttribute('data-testid')?.includes('activity-card') ||
                        post.getAttribute('data-test-id')?.includes('activity-card') ||
                        post.querySelector('[data-urn*="activity:"]'))) {
                        allPosts.add(post);
                    }
                    // For main feed with role="listitem", accept them directly
                    // They're already in the mainFeed container, so they're posts
                    else if (isMainFeed && post.getAttribute('role') === 'listitem') {
                        // Add all listitems - they're posts in mainFeed
                        allPosts.add(post);
                    } else if (isMainFeed || isHashtag) {
                        // For other selectors on main feed or hashtag, find parent listitem or use directly
                        const parentListItem = post.closest('[role="listitem"]');
                        if (parentListItem) {
                            allPosts.add(parentListItem);
                        } else {
                            allPosts.add(post);
                        }
                    } else {
                        // For single post pages, company pages, groups, add directly
                        allPosts.add(post);
                    }
                });
            }
        }
        
        // If no posts found with primary selectors, try secondary
        if (!foundWithPrimary) {
            for (const selector of secondarySelectors) {
                const found = searchScope.querySelectorAll(selector);
                found.forEach(post => {
                    // Find the parent post container
                    const parentPost = post.closest('[data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"], .feed-shared-update-v2, .occludable-update, div[data-urn*="activity:"], article[data-urn*="activity:"]');
                    if (parentPost) {
                        allPosts.add(parentPost);
                    } else {
                        // If no parent found, use the element itself if it looks like a post
                        if (post.querySelector('.feed-shared-text, .feed-shared-update-v2__description, [data-testid="main-feed-activity-card"], [data-test-id="main-feed-activity-card"]')) {
                            allPosts.add(post);
                        }
                    }
                });
            }
        }
        
        // Convert Set to Array
        let posts = Array.from(allPosts);
        
        // Filter out duplicates - improved logic for /posts/ pages
        // Check if elements are the same object OR if one contains the other (same post)
        posts = posts.filter((post, index, self) => {
            // First check: exact same element
            const exactMatch = self.findIndex(p => p === post);
            if (exactMatch === index) {
                return true; // Keep first occurrence
            }
            // Second check: if this post contains or is contained by another post, it's a duplicate
            const isDuplicate = self.some((p, otherIndex) => {
                if (otherIndex >= index) return false; // Only check earlier elements
                // Check if one contains the other
                if (post.contains && post.contains(p)) {
                    return true; // This post contains an earlier one, so this is a duplicate
                }
                if (p.contains && p.contains(post)) {
                    return true; // An earlier post contains this one, so this is a duplicate
                }
                // Check if they share the same activity URN (same post)
                const postUrn = post.getAttribute('data-urn') || post.querySelector('[data-urn*="activity:"]')?.getAttribute('data-urn');
                const pUrn = p.getAttribute('data-urn') || p.querySelector('[data-urn*="activity:"]')?.getAttribute('data-urn');
                if (postUrn && pUrn && postUrn === pUrn) {
                    return true; // Same activity URN, so same post
                }
                return false;
            });
            return !isDuplicate; // Keep if not a duplicate
        });
        
        // SIMPLE, STABLE filtering - no complex logic
        const filteredPosts = [];
        for (const post of posts) {
            if (!post) {
                continue;
            }
            
            // Check visibility
            const rect = post.getBoundingClientRect();
            const isVisible = rect.height > 0 && rect.width > 0;
            
            if (!isVisible) {
                continue;
            }
            
            // For listitem in mainFeed or hashtag feeds, accept if visible - NO CONTENT CHECK
            if ((isMainFeed || isHashtag) && post.getAttribute('role') === 'listitem') {
                filteredPosts.push(post);
                continue;
            }
            
            // For search results posts, accept if visible - NO CONTENT CHECK
            if (isSearchResults && post.classList.contains('search-results__search-feed-update')) {
                filteredPosts.push(post);
                continue;
            }
            
            // For company page posts, accept if visible - NO CONTENT CHECK
            if (isCompany && post.classList.contains('feed-shared-update-v2')) {
                filteredPosts.push(post);
                continue;
            }
            
            // For group posts, accept if visible - NO CONTENT CHECK
            if (isGroup && post.classList.contains('feed-shared-update-v2')) {
                filteredPosts.push(post);
                continue;
            }
            
            // For /posts/ page posts, accept if visible - NO CONTENT CHECK
            if (isPosts && (post.classList.contains('feed-shared-update-v2') || 
                post.getAttribute('data-testid')?.includes('activity-card') ||
                post.getAttribute('data-test-id')?.includes('activity-card') ||
                post.querySelector('[data-urn*="activity:"]'))) {
                filteredPosts.push(post);
                continue;
            }
            
            // For other posts (single post pages), check if it has some content
            const hasContent = post.textContent?.trim().length > 0 || 
                              post.querySelector('img, video, .feed-shared-text, .update-components-text');
            
            if (hasContent) {
                filteredPosts.push(post);
            }
        }
        
        posts = filteredPosts;
        
        if (posts.length === 0) {
            // Comprehensive debugging - check all possible selectors
            const allDebugSelectors = [
                '[role="listitem"]',  // Priority for main feed
                '[data-testid="main-feed-activity-card"]',
                '[data-test-id="main-feed-activity-card"]',
                '[data-testid*="activity-card"]',
                '[data-test-id*="activity-card"]',
                'div[data-urn*="activity:"]',
                'article[data-urn*="activity:"]',
                '.feed-shared-update-v2',
                '.occludable-update',
                '[class*="feed-shared"]',
                '[class*="update-v2"]',
                '[class*="occludable"]',
                '[data-testid*="feed"]',
                '[data-test-id*="feed"]',
                '[data-testid*="activity"]',
                '[data-test-id*="activity"]',
                '[data-testid*="card"]',
                '[data-test-id*="card"]',
            ];
            
            allDebugSelectors.forEach(sel => {
                const found = searchScope.querySelectorAll(sel);
                // Check selectors silently
            });
            
            // Try to find posts by structure (elements with activity URNs)
            const allDivs = searchScope.querySelectorAll('div[data-urn]');
            const activityDivs = Array.from(allDivs).filter(div => {
                const urn = div.getAttribute('data-urn') || '';
                return urn.includes('activity:');
            });
            
            if (activityDivs.length > 0) {
                // Try using these as posts
                activityDivs.forEach(div => {
                    // Find the parent container that looks like a post
                    let postContainer = div;
                    let parent = div.parentElement;
                    let depth = 0;
                    while (parent && depth < 5) {
                        if (parent.classList.contains('feed-shared-update-v2') || 
                            parent.classList.contains('occludable-update') ||
                            parent.getAttribute('data-testid')?.includes('activity-card') ||
                            parent.getAttribute('data-test-id')?.includes('activity-card') ||
                            parent.querySelector('.feed-shared-text, .update-components-text')) {
                            postContainer = parent;
                            break;
                        }
                        parent = parent.parentElement;
                        depth++;
                    }
                    allPosts.add(postContainer);
                });
            }
            
            // If still no posts, try finding by text content structure
            if (allPosts.size === 0) {
                const possiblePosts = searchScope.querySelectorAll('div, article');
                const postsByStructure = Array.from(possiblePosts).filter(el => {
                    // Look for elements that have:
                    // 1. Text content
                    // 2. Some interaction buttons (like, comment, share)
                    // 3. Are visible
                    const hasText = el.textContent && el.textContent.trim().length > 50;
                    const hasInteractions = el.querySelector('button[aria-label*="Like"], button[aria-label*="Comment"], button[aria-label*="Share"], button[aria-label*="like"], button[aria-label*="comment"], button[aria-label*="share"]');
                    const isVisible = el.offsetHeight > 0 && el.offsetWidth > 0;
                    const hasAuthor = el.querySelector('img[alt*="profile"], [class*="actor"], [class*="author"], [data-testid*="actor"]');
                    
                    return hasText && hasInteractions && isVisible && hasAuthor;
                });
                
                if (postsByStructure.length > 0) {
                    postsByStructure.forEach(post => allPosts.add(post));
                }
            }
            
            // Re-check posts after fallback attempts
            posts = Array.from(allPosts).filter((post, index, self) => {
                return index === self.findIndex(p => p === post);
            }).filter(post => {
                if (!post) return false;
                
                // Check visibility
                const rect = post.getBoundingClientRect();
                const isVisible = rect.height > 0 && rect.width > 0;
                
                // For listitem in mainFeed, just check visibility - accept them
                if (isMainFeed && post.getAttribute('role') === 'listitem') {
                    return isVisible;
                }
                
                // For others, check content
                const hasContent = post.textContent?.trim().length > 0 || 
                                  post.querySelector('img, video, .feed-shared-text, .update-components-text');
                
                return isVisible && hasContent;
            });
            
            if (posts.length === 0) {
                return;
            }
        }
        
        let buttonsAdded = 0;
        let skippedPosts = 0;
        const skipReasons = {
            notConnected: 0,
            notVisible: 0,
            addButtonFailed: 0,
            error: 0
        };
        
        // Process posts in reverse order to handle main feed better (newest first)
        const postsToProcess = [...posts].reverse();
        
        postsToProcess.forEach((post) => {
            // Double-check that post is still in DOM and visible
            if (!post.isConnected) {
                skippedPosts++;
                skipReasons.notConnected++;
                return; // Post was removed from DOM
            }
            
            const rect = post.getBoundingClientRect();
            if (rect.height === 0 || rect.width === 0) {
                skippedPosts++;
                skipReasons.notVisible++;
                return; // Post is not visible
            }
            
            // Try to add button
            try {
                const added = addCommentButtonToPost(post);
                if (added) {
                    buttonsAdded++;
                } else {
                    skippedPosts++;
                    skipReasons.addButtonFailed++;
                }
            } catch (error) {
                console.error('[LinkedIn Gen] Error adding button to post:', error);
                skippedPosts++;
                skipReasons.error++;
            }
        });
        
        return buttonsAdded;
    }

    /**
     * Initialize: Find all posts and add buttons
     */
    function initialize() {
        // Don't re-initialize if already initialized and on same page
        const currentUrlCheck = window.location.href;
        const currentPathCheck = window.location.pathname;
        
        if (isInitialized && currentUrl === currentUrlCheck && currentPath === currentPathCheck) {
            return;
        }
        
        // Update current URL and path
        currentUrl = currentUrlCheck;
        currentPath = currentPathCheck;
        
        // Check if this is a single post page
        const isSinglePost = isSinglePostPage();
        
        // Wait for page to be interactive (shorter wait for single post pages)
        if (document.readyState === 'loading') {
            const delay = isSinglePost ? 500 : 1000;
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initialize, delay);
            });
            return;
        }
        
        // Stop existing observer if any
        if (feedObserver) {
            feedObserver.disconnect();
            feedObserver = null;
        }

        // Multiple scans to catch posts that load at different times
        // Initial scan after short delay
        setTimeout(() => {
            scanAndAddButtons();
        }, 500);
        
        // Second scan after longer delay (for slower loading)
        setTimeout(() => {
            scanAndAddButtons();
        }, 1500);
        
        // Third scan for very slow loading
        setTimeout(() => {
            scanAndAddButtons();
        }, 3000);
        
        // Fourth scan for extremely slow loading
        setTimeout(() => {
            scanAndAddButtons();
        }, 5000);
        
        // Fifth scan for posts that load very late
        setTimeout(() => {
            scanAndAddButtons();
        }, 8000);

        // Start observing feed container for new posts
        attachFeedObserver();

        // Initial scan
        scanAndAddButtons();

        isInitialized = true;
    }

    /**
     * Layer 3: Root-level MutationObserver (fallback for DOM rebuilds)
     * Watches for any big DOM change → check URL
     */
    function startRootObserver() {
        if (rootObserver) {
            rootObserver.disconnect();
        }

        rootObserver = new MutationObserver(() => {
            checkForChange(); // Any big DOM change → check URL
        });

        if (document.body) {
            rootObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
        }
    }
    
    /**
     * Layer 2: Polling-based URL check (catches EVERYTHING, including weird navigations)
     * This is the most reliable method for LinkedIn's SPA
     */
    function startUrlPolling() {
        if (urlPollingInterval) {
            clearInterval(urlPollingInterval);
        }
        urlPollingInterval = setInterval(() => {
            checkForChange();
        }, 300); // 300ms - more frequent to catch fast navigations
    }
    
    /**
     * Check for URL changes - called by polling and observers
     */
    function checkForChange() {
        const now = location.href;
        if (now !== lastUrl) {
            lastUrl = now;
            onNavigation();
        }
    }

    /**
     * Attach feed observer to watch for new posts
     */
    function attachFeedObserver() {
        if (feedObserver) {
            feedObserver.disconnect();
        }

        const possibleTargets = [
            'div[role="feed"]',
            '[data-testid="mainFeed"]',
            '.scaffold-finite-scroll__content',
            'main',
            '.feed-shared-update-v2', // posts
            'div.feed-identity-module__actor-meta', // profile-like feeds
            '.feed-container-theme',
            '.search-results-container'
        ];

        let target = document.querySelector(possibleTargets.join(',')) || document.body;

        feedObserver = new MutationObserver(mutations => {
            if (mutations.some(m => m.addedNodes.length > 0)) {
                clearTimeout(feedObserver.debounce);
                feedObserver.debounce = setTimeout(() => {
                    scanAndAddButtons();
                }, 200);
            }
        });

        feedObserver.observe(target, { 
            childList: true, 
            subtree: true,
            attributes: false,
            characterData: false
        });
    }
    
    /**
     * Main navigation handler - called on every route change
     */
    function onNavigation() {
        // Clean up old stuff
        if (feedObserver) {
            feedObserver.disconnect();
            feedObserver = null;
        }
        if (periodicInterval) {
            clearInterval(periodicInterval);
            periodicInterval = null;
        }

        // Only continue if we're on a relevant page
        if (!isFeedPage() && !isSinglePostPage()) {
            isInitialized = false;
            return;
        }

        isInitialized = false;
        const isSinglePost = isSinglePostPage();
        const delay = isSinglePost ? 300 : 600;

        // Multiple scans at different intervals to catch posts that load at different times
        setTimeout(() => {
            scanAndAddButtons();
            attachFeedObserver();
        }, delay);

        // Second scan - catch posts that load a bit later
        setTimeout(() => {
            scanAndAddButtons();
        }, delay + 1000);

        // Third scan - catch posts that load even later
        setTimeout(() => {
            scanAndAddButtons();
        }, delay + 2500);

        // Fourth scan - catch very slow loading posts
        setTimeout(() => {
            scanAndAddButtons();
        }, delay + 4000);

        // Fifth scan - final catch for extremely slow posts
        setTimeout(() => {
            scanAndAddButtons();
        }, delay + 6000);

        // Light polling only while on feed (safety net)
        if (isFeedPage() && !periodicInterval) {
            periodicInterval = setInterval(() => {
                if (isFeedPage()) {
                    scanAndAddButtons();
                } else {
                    clearInterval(periodicInterval);
                    periodicInterval = null;
                }
            }, 4000);
        }
    }

    // Layer 1: History API interception (catches most client-side navigations)
    const originalPush = history.pushState;
    history.pushState = function(...args) {
        originalPush.apply(this, args);
        setTimeout(checkForChange, 100);
    };

    const originalReplace = history.replaceState;
    history.replaceState = function(...args) {
        originalReplace.apply(this, args);
        setTimeout(checkForChange, 100);
    };

    window.addEventListener('popstate', () => setTimeout(checkForChange, 100));

    // Also listen for hash changes (though LinkedIn doesn't use them much)
    window.addEventListener('hashchange', () => setTimeout(checkForChange, 100));

    /**
     * Initialize extension - run once on page load
     */
    function init() {
        startRootObserver();
        startUrlPolling();
        onNavigation();
    }

    // Run now or on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Keep-alive check for URL changes (backup)
    const keepAliveInterval = setInterval(() => {
        checkForChange();
    }, 3000);
    
    // Store interval in window so it persists
    window._linkedinGenKeepAlive = keepAliveInterval;
})();

