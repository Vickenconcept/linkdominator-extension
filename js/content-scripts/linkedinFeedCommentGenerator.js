/**
 * LinkedIn Feed Comment Generator
 * Adds AI comment generation feature to LinkedIn feed posts
 */

(function() {
    'use strict';

    // Configuration - access from global scope (set by env.js and appConfig.js)
    const PLATFORM_URL = (typeof window.PLATFORM_URL !== 'undefined' ? window.PLATFORM_URL : 'https://sealable-maci-nonmeteorologic.ngrok-free.dev');
    
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
    
    // Check if current page is a feed page
    function isFeedPage() {
        return window.location.href.includes('linkedin.com/feed') || 
               window.location.pathname === '/feed' || 
               window.location.pathname.startsWith('/feed/');
    }
    
    // Only run on LinkedIn feed pages
    if (!isFeedPage()) {
        console.log('⏭️ Not a feed page, skipping comment generator');
        return;
    }
    
    console.log('🚀 LinkedIn Feed Comment Generator script loaded on feed page');

    // CSS for the comment generator button and modal
    const style = document.createElement('style');
    style.textContent = `
        .ld-comment-gen-btn {
            position: absolute;
            top: 12px;
            right: 12px;
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
        .feed-shared-update-v2__update-content-wrapper:hover .ld-comment-gen-btn {
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
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .ld-comment-btn-primary {
            background: #0077b5;
            color: white;
        }
        
        .ld-comment-btn-primary:hover {
            background: #005885;
        }
        
        .ld-comment-btn-secondary {
            background: #f3f2ef;
            color: #000;
        }
        
        .ld-comment-btn-secondary:hover {
            background: #e9e9e9;
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
            
            if (toRemove.length > 0) {
                console.log(`🧹 Cleaned up ${toRemove.length} old comments from localStorage`);
            }
        } catch (error) {
            console.error('Error cleaning up old comments:', error);
        }
    }

    /**
     * Extract post content from LinkedIn feed post element
     */
    function extractPostContent(postElement) {
        // Try multiple selectors for post content
        const selectors = [
            '.feed-shared-update-v2__description',
            '.feed-shared-text',
            '.feed-shared-text__text-view',
            '[data-test-id="main-feed-activity-card"] .feed-shared-text',
            '.feed-shared-update-v2__description-wrapper'
        ];
        
        for (const selector of selectors) {
            const contentEl = postElement.querySelector(selector);
            if (contentEl) {
                const text = contentEl.innerText || contentEl.textContent || '';
                if (text.trim().length > 0) {
                    return text.trim();
                }
            }
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
                    'lk-id': linkedInId,
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
                    <button class="ld-comment-btn ld-comment-btn-secondary" onclick="document.getElementById('ldCommentModal').classList.remove('active')">Close</button>
                </div>
            `;
        } else {
            const regenerateBtn = onRegenerate ? `
                <button class="ld-comment-btn ld-comment-btn-regenerate" id="ldCommentRegenerateBtn">Regenerate</button>
            ` : '';
            
            modalBody.innerHTML = `
                <textarea class="ld-comment-textarea" id="ldCommentText" readonly>${comment}</textarea>
                <div class="ld-comment-modal-actions">
                    <button class="ld-comment-btn ld-comment-btn-secondary" onclick="document.getElementById('ldCommentModal').classList.remove('active')">Close</button>
                    ${regenerateBtn}
                    <button class="ld-comment-btn ld-comment-btn-primary" id="ldCommentCopyBtn">Copy Comment</button>
                </div>
            `;
            
            // Copy button handler
            document.getElementById('ldCommentCopyBtn').addEventListener('click', () => {
                const commentText = document.getElementById('ldCommentText').value;
                if (copyToClipboard(commentText)) {
                    const btn = document.getElementById('ldCommentCopyBtn');
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    btn.style.background = '#28a745';
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.style.background = '';
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
     * Add comment generation button to post
     */
    function addCommentButtonToPost(postElement) {
        // Check if button already exists
        if (postElement.querySelector('.ld-comment-gen-btn')) {
            return false; // Button already exists
        }
        
        // Verify this is actually a post element (has some content)
        const hasContent = postElement.querySelector('.feed-shared-text, .feed-shared-update-v2__description, [data-test-id="main-feed-activity-card"] .feed-shared-text, .update-components-text');
        if (!hasContent && !postElement.getAttribute('data-urn')) {
            // Skip if it doesn't look like a real post
            return false;
        }
        
        // Try multiple container selectors to find the right parent
        let container = postElement.closest('.feed-shared-update-v2');
        if (!container) {
            container = postElement.closest('.occludable-update');
        }
        if (!container) {
            container = postElement.closest('[data-test-id="main-feed-activity-card"]');
        }
        if (!container) {
            container = postElement.querySelector('.feed-shared-update-v2__update-content-wrapper');
        }
        if (!container) {
            // If we still don't have a container, use the post element itself
            container = postElement;
        }
        
        // Make container relative if needed
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.position === 'static') {
            container.style.position = 'relative';
        }
        
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
        
        container.appendChild(btn);
        console.log('✅ Added draggable comment button to post', {
            container: container.className,
            hasContent: !!hasContent
        });
        return true; // Successfully added button
    }

    // Global observer and initialization state
    let feedObserver = null;
    let isInitialized = false;
    let currentUrl = window.location.href;
    let periodicCheckInterval = null;

    /**
     * Scan for posts and add buttons
     */
    function scanAndAddButtons() {
        // Check if still on feed page
        if (!isFeedPage()) {
            console.log('⏭️ No longer on feed page, stopping scan');
            return;
        }

        // Primary selectors for main feed posts (most common)
        const primarySelectors = [
            '.feed-shared-update-v2',
            '.occludable-update',
            '[data-test-id="main-feed-activity-card"]',
            'div[data-urn*="activity:"]',
            'article[data-urn*="activity:"]',
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
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
                foundWithPrimary = true;
                found.forEach(post => {
                    // Only add if it's a top-level post container, not nested
                    const isTopLevel = !post.closest('.feed-shared-update-v2, .occludable-update, [data-test-id="main-feed-activity-card"]') || 
                                      post.matches('.feed-shared-update-v2, .occludable-update, [data-test-id="main-feed-activity-card"]');
                    if (isTopLevel) {
                        allPosts.add(post);
                    }
                });
            }
        }
        
        // If no posts found with primary selectors, try secondary
        if (!foundWithPrimary) {
            console.log('⚠️ No posts found with primary selectors, trying secondary...');
            for (const selector of secondarySelectors) {
                const found = document.querySelectorAll(selector);
                found.forEach(post => {
                    // Find the parent post container
                    const parentPost = post.closest('.feed-shared-update-v2, .occludable-update, [data-test-id="main-feed-activity-card"], div[data-urn*="activity:"], article[data-urn*="activity:"]');
                    if (parentPost) {
                        allPosts.add(parentPost);
                    } else {
                        // If no parent found, use the element itself if it looks like a post
                        if (post.querySelector('.feed-shared-text, .feed-shared-update-v2__description, [data-test-id="main-feed-activity-card"]')) {
                            allPosts.add(post);
                        }
                    }
                });
            }
        }
        
        const posts = Array.from(allPosts);
        
        if (posts.length === 0) {
            console.log('⚠️ No posts found with any selector');
            console.log('🔍 Debug: Current URL:', window.location.href);
            console.log('🔍 Debug: Page ready state:', document.readyState);
            // Log what selectors are actually on the page
            const debugSelectors = ['.feed-shared-update-v2', '.occludable-update', '[data-test-id="main-feed-activity-card"]'];
            debugSelectors.forEach(sel => {
                const count = document.querySelectorAll(sel).length;
                if (count > 0) {
                    console.log(`🔍 Found ${count} elements with selector: ${sel}`);
                }
            });
            return;
        }
        
        console.log(`✅ Found ${posts.length} unique posts`);
        
        let buttonsAdded = 0;
        posts.forEach(post => {
            const added = addCommentButtonToPost(post);
            if (added) buttonsAdded++;
        });
        
        console.log(`✅ Added ${buttonsAdded} buttons to posts`);
    }

    /**
     * Initialize: Find all posts and add buttons
     */
    function initialize() {
        // Don't re-initialize if already initialized and on same page
        if (isInitialized && currentUrl === window.location.href) {
            return;
        }

        console.log('🔍 Initializing LinkedIn Feed Comment Generator...');
        
        // Update current URL
        currentUrl = window.location.href;
        
        // Wait for page to be interactive
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initialize, 1000);
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
        }, 2000);
        
        // Third scan for very slow loading
        setTimeout(() => {
            scanAndAddButtons();
        }, 4000);

        // Create new observer for feed changes
        feedObserver = new MutationObserver(() => {
            // Debounce to avoid too many calls
            clearTimeout(feedObserver.timeout);
            feedObserver.timeout = setTimeout(() => {
                scanAndAddButtons();
            }, 500);
        });

        // Initial scan
        scanAndAddButtons();

        // Observe for new posts (LinkedIn uses infinite scroll)
        // Try multiple container selectors
        const containerSelectors = [
            '.scaffold-finite-scroll__content',
            'main',
            '[role="main"]',
            '.feed-container',
            '.feed-container__content',
            '#main-content',
            '.global-feed',
            'div[data-view-name="feed-container"]',
            'div[data-view-name="feed"]'
        ];
        
        let feedContainer = null;
        for (const selector of containerSelectors) {
            feedContainer = document.querySelector(selector);
            if (feedContainer) {
                console.log(`✅ Found feed container with selector: ${selector}`);
                break;
            }
        }
        
        // Fallback to body if no specific container found
        if (!feedContainer) {
            feedContainer = document.body;
            console.log('⚠️ Using document.body as feed container');
        }
        
        if (feedContainer && feedObserver) {
            feedObserver.observe(feedContainer, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });
            console.log('👀 Observing feed container for new posts', {
                container: feedContainer.className || feedContainer.tagName,
                selector: feedContainer.id ? `#${feedContainer.id}` : ''
            });
        } else {
            console.log('⚠️ Could not set up observer, will retry...');
            // Retry after a delay
            setTimeout(() => {
                let retryContainer = null;
                for (const selector of containerSelectors) {
                    retryContainer = document.querySelector(selector);
                    if (retryContainer) break;
                }
                if (!retryContainer) {
                    retryContainer = document.body;
                }
                
                if (retryContainer && feedObserver) {
                    feedObserver.observe(retryContainer, {
                        childList: true,
                        subtree: true,
                        attributes: false,
                        characterData: false
                    });
                    console.log('✅ Retry: Now observing feed container');
                }
            }, 2000);
        }

        isInitialized = true;

        // Set up periodic check to catch posts that load slowly
        if (periodicCheckInterval) {
            clearInterval(periodicCheckInterval);
        }
        
        periodicCheckInterval = setInterval(() => {
            if (!isFeedPage()) {
                clearInterval(periodicCheckInterval);
                periodicCheckInterval = null;
                return;
            }
            // Always scan periodically to catch posts that load slowly or were missed
            const existingButtons = document.querySelectorAll('.ld-comment-gen-btn').length;
            const posts = document.querySelectorAll('.feed-shared-update-v2, .occludable-update, [data-test-id="main-feed-activity-card"], div[data-urn*="activity:"], article[data-urn*="activity:"]');
            const postsWithoutButtons = Array.from(posts).filter(post => !post.querySelector('.ld-comment-gen-btn'));
            
            if (postsWithoutButtons.length > 0) {
                console.log(`🔄 Periodic check: Found ${postsWithoutButtons.length} posts without buttons, scanning...`);
                scanAndAddButtons();
            } else if (posts.length > 0 && existingButtons === 0) {
                // Posts exist but no buttons - force a scan
                console.log('🔄 Periodic check: Posts exist but no buttons found, forcing scan...');
                scanAndAddButtons();
            }
        }, 2000); // Check every 2 seconds (more frequent for main feed)
    }

    /**
     * Handle SPA navigation
     */
    function handleNavigation() {
        const newUrl = window.location.href;
        
        // Check if we're on a feed page
        if (!isFeedPage()) {
            // Clean up if we left feed page
            if (feedObserver) {
                feedObserver.disconnect();
                feedObserver = null;
            }
            if (periodicCheckInterval) {
                clearInterval(periodicCheckInterval);
                periodicCheckInterval = null;
            }
            isInitialized = false;
            return;
        }
        
        // Only reinitialize if URL actually changed and we're still on a feed page
        if (newUrl !== currentUrl) {
            console.log('🔄 SPA navigation detected, reinitializing...', {
                oldUrl: currentUrl,
                newUrl: newUrl
            });
            isInitialized = false;
            currentUrl = newUrl;
            
            // Wait a bit for LinkedIn to render new content
            setTimeout(() => {
                initialize();
            }, 800);
        } else if (!isInitialized) {
            // URL didn't change but we're not initialized, initialize now
            console.log('🔄 Reinitializing (was not initialized)...');
            setTimeout(() => {
                initialize();
            }, 800);
        }
    }

    // Intercept pushState and replaceState for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(handleNavigation, 100);
    };

    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(handleNavigation, 100);
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
        setTimeout(handleNavigation, 100);
    });

    // Also listen for hash changes (though LinkedIn doesn't use them much)
    window.addEventListener('hashchange', () => {
        setTimeout(handleNavigation, 100);
    });

    // Start initialization after a short delay to ensure page is loaded
    if (document.readyState === 'complete') {
        setTimeout(initialize, 1500);
    } else {
        window.addEventListener('load', () => {
            setTimeout(initialize, 1500);
        });
    }

    // Also initialize immediately if DOM is already ready
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        setTimeout(initialize, 1500);
    }
})();

