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
    
    // Only run on LinkedIn feed pages
    const isFeedPage = window.location.href.includes('linkedin.com/feed') || 
                       window.location.pathname === '/feed' || 
                       window.location.pathname.startsWith('/feed/');
    
    if (!isFeedPage) {
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
    function showCommentModal(comment, error = null) {
        if (error) {
            modalBody.innerHTML = `
                <div class="ld-comment-error">${error}</div>
                <div class="ld-comment-modal-actions">
                    <button class="ld-comment-btn ld-comment-btn-secondary" onclick="document.getElementById('ldCommentModal').classList.remove('active')">Close</button>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <textarea class="ld-comment-textarea" id="ldCommentText" readonly>${comment}</textarea>
                <div class="ld-comment-modal-actions">
                    <button class="ld-comment-btn ld-comment-btn-secondary" onclick="document.getElementById('ldCommentModal').classList.remove('active')">Close</button>
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
        }
        
        modal.classList.add('active');
    }

    /**
     * Handle comment generation button click
     */
    async function handleCommentGeneration(btn, postElement) {
        btn.classList.add('loading');
        btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/></circle></svg>';
        
        try {
            const postContent = extractPostContent(postElement);
            
            if (!postContent) {
                throw new Error('Could not extract post content. Please try again.');
            }
            
            // Show loading modal
            modalBody.innerHTML = '<div class="ld-comment-loading">Generating comment...</div>';
            modal.classList.add('active');
            
            const comment = await generateComment(postContent);
            showCommentModal(comment);
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
            return;
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
        console.log('✅ Added draggable comment button to post');
    }

    /**
     * Initialize: Find all posts and add buttons
     */
    function initialize() {
        console.log('🔍 Initializing LinkedIn Feed Comment Generator...');
        
        // Wait for page to be interactive
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
            return;
        }
        
        // Also wait a bit for LinkedIn's React to render
        setTimeout(() => {
            scanAndAddButtons();
        }, 1000);

        // Find all feed update cards
        const observer = new MutationObserver(() => {
            // Debounce to avoid too many calls
            clearTimeout(observer.timeout);
            observer.timeout = setTimeout(() => {
                scanAndAddButtons();
            }, 500);
        });

        function scanAndAddButtons() {
            // Try multiple selectors for posts
            const selectors = [
                '.feed-shared-update-v2',
                '.occludable-update',
                '[data-test-id="main-feed-activity-card"]',
                '.feed-shared-update-v2__update-content-wrapper',
                'div[data-urn*="activity:"]'
            ];
            
            let posts = [];
            for (const selector of selectors) {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                    posts = Array.from(found);
                    console.log(`✅ Found ${posts.length} posts using selector: ${selector}`);
                    break;
                }
            }
            
            if (posts.length === 0) {
                console.log('⚠️ No posts found with any selector');
                return;
            }
            
            posts.forEach(post => {
                addCommentButtonToPost(post);
            });
        }

        // Initial scan
        scanAndAddButtons();

        // Observe for new posts (LinkedIn uses infinite scroll)
        const feedContainer = document.querySelector('.scaffold-finite-scroll__content') || 
                             document.querySelector('main') || 
                             document.querySelector('[role="main"]') ||
                             document.body;
        
        if (feedContainer) {
            observer.observe(feedContainer, {
                childList: true,
                subtree: true
            });
            console.log('👀 Observing feed container for new posts');
        } else {
            console.log('⚠️ Could not find feed container');
        }
    }

    // Start initialization after a short delay to ensure page is loaded
    if (document.readyState === 'complete') {
        setTimeout(initialize, 1500);
    } else {
        window.addEventListener('load', () => {
            setTimeout(initialize, 1500);
        });
    }
})();

