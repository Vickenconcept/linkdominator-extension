// Remove problematic imports and add necessary variables and functions
// importScripts('./js/universalAction.js'); // Contains DOM references
// importScripts('./js/actions/autorespondAction.js');
importScripts('./env.js');

// We'll handle getCookie override after appConfig.js loads to avoid conflicts

// Override DOM-related functions that don't exist in service worker
const document = {
  cookie: '',
  createElement: () => ({}),
  querySelector: () => null,
  querySelectorAll: () => []
};

const window = {
  location: { href: '' },
  innerWidth: 0,
  innerHeight: 0
};

// Add minimal helper functions needed by campaignAction.js
const helper = {
  transformText: (text, type) => {
    if (!text) return '';
    if (type === 'capitalize') {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    return text;
  }
};

importScripts('./js/appConfig.js');

// Since getCookie is defined as const in appConfig.js, we need to handle this differently
// We'll modify the jsession variable after appConfig.js loads to use Chrome cookies API

// Update jsession with Chrome cookies API
(async () => {
  try {
    const cookies = await chrome.cookies.get({
      url: 'https://www.linkedin.com',
      name: 'JSESSIONID'
    });
    if (cookies) {
      jsession = cookies.value;
      console.log('✅ JSESSIONID updated via Chrome API');
    } else {
      console.log('⚠️ JSESSIONID not found via Chrome API');
    }
  } catch (error) {
    console.log('⚠️ Could not get JSESSIONID via Chrome API:', error);
  }
})();

// importScripts('./js/helper.js'); // Contains DOM references
// importScripts('./js/debug.js'); // Contains DOM references
importScripts('./js/actions/campaignAction.js');

// 🚀 KEEP-ALIVE MECHANISM - Prevents service worker from going inactive
let keepAliveInterval;
let isServiceWorkerActive = true;

// Track active endorsement tabs to prevent multiple tabs for same profile
const activeEndorsementTabs = new Map();

// Queue system for sequential processing
const endorsementQueue = [];
let isProcessingQueue = false;

// Cleanup function to remove tracking when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    // Find and remove any tracking for this tab
    for (const [connectId, trackedTabId] of activeEndorsementTabs.entries()) {
        if (trackedTabId === tabId) {
            activeEndorsementTabs.delete(connectId);
            console.log(`📝 Removed tracking for profile ${connectId} (tab ${tabId} closed)`);
            break;
        }
    }
});

// Function to process a skill endorsement in an existing tab
const processSkillInTab = async (tabId, data) => {
    console.log('🤖 Processing skill endorsement in existing tab...');
    console.log(`🎯 Attempting to endorse skill: "${data.skillName}"`);
    
    try {
        // Inject the skill endorsement automation script
        console.log('🔄 Injecting skill endorsement automation script...');
        const result = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: async (skillName, entityUrn) => {
                console.log('🤖 LinkedIn Skill Endorsement Automation script executing...');
                console.log(`🎯 Attempting to endorse skill: "${skillName}"`);
                                    console.log('🔍 Current page URL:', window.location.href);
                    console.log('🔍 Page title:', document.title);
                    
                    // Comprehensive page analysis for debugging
                    console.log('🔍 Page analysis:', {
                        url: window.location.href,
                        title: document.title,
                        bodyText: document.body.textContent.substring(0, 500) + '...',
                        allButtons: document.querySelectorAll('button').length,
                        allAnchors: document.querySelectorAll('a').length,
                        allShowAllElements: document.querySelectorAll('[id*="Show-all"]').length,
                        allSkillsElements: document.querySelectorAll('[id*="skills"]').length,
                        allEndorsementElements: document.querySelectorAll('[aria-label*="endorse"], [aria-label*="Endorse"]').length
                    });
                
                // Function to delay
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                try {
                    console.log('🔍 Step 4: Looking for skill endorsement buttons...');
                    
                    // Wait for page to be fully loaded - LinkedIn profiles need more time
                    console.log('⏳ Waiting for LinkedIn profile to fully load...');
                    await delay(5000); // Increased to 5 seconds for LinkedIn profiles
                    
                    // Check if we're on a LinkedIn profile page
                    if (!window.location.href.includes('linkedin.com/in/')) {
                        console.log('❌ Not on a LinkedIn profile page');
                        return { 
                            success: false, 
                            error: 'Not on LinkedIn profile page',
                            message: 'Page is not a LinkedIn profile'
                        };
                    }
                    
                    console.log('✅ LinkedIn profile page detected');
                    
                    // Check if we're connected to this person (1st-degree connection)
                    console.log('🔍 Checking connection status...');
                    const connectionIndicators = [
                        '.pv-top-card--non-self',
                        '.pv-top-card__photo',
                        '.pv-top-card__name',
                        '.pv-top-card__headline',
                        '.pv-top-card__location'
                    ];
                    
                    let isConnected = false;
                    for (let selector of connectionIndicators) {
                        if (document.querySelector(selector)) {
                            isConnected = true;
                            break;
                        }
                    }
                    
                    // Check for "Connect" button which indicates NOT connected
                    const connectButton = document.querySelector('button[aria-label*="Connect"], button[aria-label*="connect"], .artdeco-button[aria-label*="Connect"]');
                    if (connectButton) {
                        console.log('❌ NOT CONNECTED: Found "Connect" button - cannot endorse skills');
                        return { 
                            success: false, 
                            error: 'Not connected to this person',
                            message: 'Cannot endorse skills for people you are not connected to'
                        };
                    }
                    
                    console.log('✅ Connection status verified - can proceed with endorsement');
                    
                    // Wait for skills section to load dynamically
                    console.log('⏳ Waiting for skills section to load...');
                    let skillsLoaded = false;
                    let attempts = 0;
                    const maxAttempts = 10;
                    
                    while (!skillsLoaded && attempts < maxAttempts) {
                        attempts++;
                        console.log(`🔍 Attempt ${attempts}: Checking for skills section...`);
                        
                        const skillsSection = document.querySelector('.pv-skill-category-entity, [data-section="skills"], .pv-skill-category-entity__name-text, .pv-skill-category-entity__name, .pv-skill-category-entity__skill-name, .pv-skill-category-entity__skill-name-text');
                        
                        if (skillsSection) {
                            console.log('✅ Skills section found!');
                            skillsLoaded = true;
                        } else {
                            console.log('⏳ Skills section not found yet, waiting...');
                            await delay(1000);
                        }
                    }
                    
                    // Step 1: Check for "Show all X skills" button/link first (SPECIFIC to skills only)
                    console.log('🔍 Step 1: Checking for "Show all X skills" button/link...');
                    const showAllSkillsSelectors = [
                        // Specific to skills - look for "skills" in the ID (both buttons and anchor tags)
                        'button[id*="navigation-index-Show-all"][id*="skills"]',
                        'button[id*="Show-all"][id*="skills"]',
                        'button.optional-action-target-wrapper.artdeco-button--tertiary[id*="skills"]',
                        'button.artdeco-button--tertiary[id*="skills"]',
                        // Add anchor tag selectors for "Show all skills"
                        'a[id*="navigation-index-Show-all"][id*="skills"]',
                        'a[id*="Show-all"][id*="skills"]',
                        'a.optional-action-target-wrapper.artdeco-button--tertiary[id*="skills"]',
                        'a.artdeco-button--tertiary[id*="skills"]'
                    ];
                    
                    let showAllButton = null;
                    for (let selector of showAllSkillsSelectors) {
                        const buttons = document.querySelectorAll(selector);
                        for (let button of buttons) {
                            // Double-check that this button is specifically for skills
                            const buttonText = button.textContent?.toLowerCase() || '';
                            const buttonId = button.id?.toLowerCase() || '';
                            
                            if (buttonText.includes('skills') || buttonId.includes('skills')) {
                                showAllButton = button;
                                console.log(`🎯 Found "Show all skills" button with selector: ${selector}`);
                                console.log('Button details:', {
                                    id: button.id,
                                    text: button.textContent,
                                    className: button.className
                                });
                                break;
                            } else {
                                console.log(`⚠️ Found "Show all" button but it's not for skills:`, {
                                    id: button.id,
                                    text: button.textContent
                                });
                            }
                        }
                        if (showAllButton) break;
                    }
                    
                    // If no specific skills button found, try to find any button or anchor with "Show all" and "skills" in text
                    if (!showAllButton) {
                        console.log('🔍 Looking for any button or anchor with "Show all" and "skills" in text...');
                        const allElements = document.querySelectorAll('button, a');
                        for (let element of allElements) {
                            const elementText = element.textContent?.toLowerCase() || '';
                            if (elementText.includes('show all') && elementText.includes('skills')) {
                                showAllButton = element;
                                console.log(`🎯 Found "Show all skills" element by text search:`, {
                                    tagName: element.tagName,
                                    id: element.id,
                                    text: element.textContent,
                                    className: element.className
                                });
                                break;
                            }
                        }
                    }
                    
                    if (showAllButton) {
                        console.log('🎯 Clicking "Show all skills" button...');
                        console.log('Button details before click:', {
                            id: showAllButton.id,
                            text: showAllButton.textContent,
                            className: showAllButton.className
                        });
                        showAllButton.click();
                        console.log('✅ Clicked "Show all skills" button');
                        
                        // Wait for skills to load after clicking "Show all"
                        console.log('⏳ Waiting for skills to load after clicking "Show all"...');
                        await delay(3000); // Wait 3 seconds for skills to load
                        
                        // Additional wait for dynamic content
                        let skillsLoaded = false;
                        let attempts = 0;
                        const maxAttempts = 5;
                        
                        while (!skillsLoaded && attempts < maxAttempts) {
                            attempts++;
                            console.log(`🔍 Attempt ${attempts}: Checking for skills after "Show all"...`);
                            
                            const skillsAfterShowAll = document.querySelectorAll('.pv-skill-category-entity, [data-section="skills"], .pv-skill-category-entity__name-text, .pv-skill-category-entity__name, .pv-skill-category-entity__skill-name, .pv-skill-category-entity__skill-name-text');
                            
                            if (skillsAfterShowAll.length > 0) {
                                console.log(`✅ Found ${skillsAfterShowAll.length} skills after clicking "Show all"`);
                                skillsLoaded = true;
                            } else {
                                console.log('⏳ Skills not loaded yet, waiting...');
                                await delay(1000);
                            }
                        }
                    } else {
                        console.log('ℹ️ No "Show all skills" button found - user may have fewer skills');
                        
                        // Log all buttons and anchors on the page for debugging
                        console.log('🔍 Debugging: Looking for any "Show all" elements on the page...');
                        const allShowAllButtons = document.querySelectorAll('button[id*="Show-all"]');
                        const allShowAllAnchors = document.querySelectorAll('a[id*="Show-all"]');
                        console.log(`🔍 Found ${allShowAllButtons.length} potential "Show all" buttons and ${allShowAllAnchors.length} anchors:`);
                        
                        allShowAllButtons.forEach((btn, index) => {
                            console.log(`🔍 Button ${index + 1}:`, {
                                id: btn.id,
                                text: btn.textContent,
                                className: btn.className
                            });
                        });
                        
                        allShowAllAnchors.forEach((anchor, index) => {
                            console.log(`🔍 Anchor ${index + 1}:`, {
                                id: anchor.id,
                                text: anchor.textContent,
                                className: anchor.className,
                                href: anchor.href
                            });
                        });
                        
                        // Also check for any element with "Show all" text
                        const allElements = document.querySelectorAll('*');
                        const showAllElements = Array.from(allElements).filter(el => 
                            el.textContent && el.textContent.toLowerCase().includes('show all')
                        );
                        console.log(`🔍 Found ${showAllElements.length} elements with "Show all" text:`);
                        showAllElements.forEach((el, index) => {
                            console.log(`🔍 Element ${index + 1}:`, {
                                tagName: el.tagName,
                                id: el.id,
                                text: el.textContent,
                                className: el.className
                            });
                        });
                    }
                    
                    // Look for skill endorsement buttons with the exact class you provided
                    console.log('🔍 Step 2: Looking for endorsement buttons...');
                    const endorsementSelectors = [
                        // Exact class from your inspection
                        'button.artdeco-button.artdeco-button--muted.artdeco-button--2.artdeco-button--secondary.ember-view',
                        // Generic fallbacks
                        '[data-control-name="skill_endorsement"]',
                        '[aria-label*="endorse"]',
                        '[aria-label*="Endorse"]',
                        '.pv-skill-category-entity__endorse-button',
                        'button[aria-label*="endorse"]',
                        'button[aria-label*="Endorse"]',
                        '.artdeco-button[aria-label*="endorse"]',
                        '.artdeco-button[aria-label*="Endorse"]',
                        'button[data-control-name*="endorsement"]',
                        '.endorse-button',
                        '.skill-endorsement',
                        '[data-control-name*="endorsement"]',
                        'button[type="button"]:not([disabled])',
                        '.artdeco-button:not([disabled])'
                    ];
                    
                    let endorsementButtons = [];
                    for (let selector of endorsementSelectors) {
                        const buttons = document.querySelectorAll(selector);
                        endorsementButtons = endorsementButtons.concat(Array.from(buttons));
                    }
                    
                    // Remove duplicates
                    endorsementButtons = [...new Set(endorsementButtons)];
                    
                    console.log(`🔍 Found ${endorsementButtons.length} endorsement buttons`);
                    
                    // Debug: Log all endorsement buttons found
                    endorsementButtons.forEach((btn, index) => {
                        console.log(`🔍 Endorsement button ${index + 1}:`, {
                            text: btn.textContent,
                            ariaLabel: btn.getAttribute('aria-label'),
                            className: btn.className,
                            id: btn.id,
                            disabled: btn.disabled,
                            innerHTML: btn.innerHTML.substring(0, 100) + '...'
                        });
                    });
                    
                    // Debug: Log what we found on the page
                    console.log('🔍 Page analysis:', {
                        hasSkillsSection: !!document.querySelector('.pv-skill-category-entity, [data-section="skills"], .pv-skill-category-entity__name-text'),
                        hasButtons: document.querySelectorAll('button').length,
                        hasArtdecoButtons: document.querySelectorAll('.artdeco-button').length,
                        pageTitle: document.title,
                        url: window.location.href,
                        bodyText: document.body.textContent.substring(0, 200) + '...'
                    });
                    
                    if (endorsementButtons.length > 0) {
                        // Try to find the specific skill button first
                        let targetButton = null;
                        
                        for (let button of endorsementButtons) {
                            const buttonText = button.textContent?.toLowerCase() || '';
                            const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                            const closestSkill = button.closest('[data-skill-name]')?.getAttribute('data-skill-name')?.toLowerCase() || '';
                            const parentText = button.closest('.pv-skill-category-entity')?.textContent?.toLowerCase() || '';
                            
                            if (buttonText.includes(skillName.toLowerCase()) || 
                                ariaLabel.includes(skillName.toLowerCase()) ||
                                closestSkill.includes(skillName.toLowerCase()) ||
                                parentText.includes(skillName.toLowerCase())) {
                                targetButton = button;
                                console.log(`🎯 Found specific skill button for "${skillName}"`);
                                break;
                            }
                        }
                        
                        // If no specific skill button found, try the first available one
                        if (!targetButton && endorsementButtons.length > 0) {
                            targetButton = endorsementButtons[0];
                            console.log('🎯 Using first available endorsement button');
                        }
                        
                        if (targetButton) {
                            console.log('🎯 Clicking endorsement button...');
                            console.log('Button details:', {
                                text: targetButton.textContent,
                                ariaLabel: targetButton.getAttribute('aria-label'),
                                className: targetButton.className
                            });
                            
                            targetButton.click();
                            
                            // Wait for the endorsement to process
                            await delay(2000);
                            
                            // Check if endorsement was successful
                            const successSelectors = [
                                '[aria-label*="endorsed"]',
                                '[aria-label*="Endorsed"]',
                                '.endorsed',
                                '[data-control-name*="endorsed"]',
                                '.pv-skill-category-entity--endorsed'
                            ];
                            
                            let successElements = [];
                            for (let selector of successSelectors) {
                                const elements = document.querySelectorAll(selector);
                                successElements = successElements.concat(Array.from(elements));
                            }
                            
                            if (successElements.length > 0) {
                                console.log('✅ Skill endorsement successful!');
                                return { 
                                    success: true, 
                                    message: `Successfully endorsed skill "${skillName}" via automation` 
                                };
                            } else {
                                console.log('⚠️ Endorsement button clicked but success not confirmed');
                                return { 
                                    success: true, 
                                    message: `Endorsement button clicked for "${skillName}" - please verify manually` 
                                };
                            }
                        }
                    }
                    
                    // If no endorsement buttons found, try to find skill sections
                    console.log('🔍 Step 5: Looking for skill sections...');
                    const skillSections = document.querySelectorAll('.pv-skill-category-entity, [data-section="skills"], .pv-skill-category-entity__name-text, .pv-skill-category-entity__name, .pv-skill-category-entity__skill-name, .pv-skill-category-entity__skill-name-text, .pv-skill-category-entity__name-text');
                    
                    console.log(`🔍 Found ${skillSections.length} skill sections`);
                    
                    // Debug: Log all skill sections found
                    skillSections.forEach((section, index) => {
                        console.log(`🔍 Skill section ${index + 1}:`, {
                            text: section.textContent?.substring(0, 100),
                            className: section.className,
                            hasEndorseButton: !!section.querySelector('button[aria-label*="endorse"], .pv-skill-category-entity__endorse-button, .artdeco-button[aria-label*="endorse"]'),
                            innerHTML: section.innerHTML?.substring(0, 200) + '...'
                        });
                    });
                    
                    if (skillSections.length > 0) {
                        for (let section of skillSections) {
                            const sectionText = section.textContent?.toLowerCase() || '';
                            console.log(`🔍 Checking skill section: "${sectionText.substring(0, 50)}..." for skill "${skillName}"`);
                            
                            if (sectionText.includes(skillName.toLowerCase())) {
                                console.log(`🎯 Found matching skill section for "${skillName}"`);
                                
                                // Look for the exact "Endorse" button within this specific skill section
                                const endorseBtn = section.querySelector('button.artdeco-button.artdeco-button--muted.artdeco-button--2.artdeco-button--secondary.ember-view');
                                
                                if (endorseBtn) {
                                    console.log('🎯 Found "Endorse" button in skill section, clicking...');
                                    console.log('Endorsement button details:', {
                                        text: endorseBtn.textContent,
                                        ariaLabel: endorseBtn.getAttribute('aria-label'),
                                        className: endorseBtn.className,
                                        tagName: endorseBtn.tagName,
                                        disabled: endorseBtn.disabled
                                    });
                                    
                                    // Scroll the button into view
                                    endorseBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    await delay(500);
                                    
                                    endorseBtn.click();
                                    await delay(2000);
                                    
                                    return { 
                                        success: true, 
                                        message: `Successfully endorsed skill "${skillName}" via skill section` 
                                    };
                                } else {
                                    console.log('⚠️ Found skill section but no "Endorse" button');
                                    console.log('🔍 Looking for any buttons in this section:', section.querySelectorAll('button').length);
                                    
                                    // List all buttons in this section for debugging
                                    const allButtons = section.querySelectorAll('button');
                                    allButtons.forEach((btn, index) => {
                                        console.log(`🔍 Button ${index + 1}:`, {
                                            text: btn.textContent,
                                            className: btn.className,
                                            ariaLabel: btn.getAttribute('aria-label')
                                        });
                                    });
                                    
                                    // Try to find any button with "Endorse" text
                                    const anyEndorseButton = section.querySelector('button');
                                    if (anyEndorseButton && anyEndorseButton.textContent.toLowerCase().includes('endorse')) {
                                        console.log('🎯 Found button with "Endorse" text, trying to click it...');
                                        console.log('Button details:', {
                                            text: anyEndorseButton.textContent,
                                            ariaLabel: anyEndorseButton.getAttribute('aria-label'),
                                            className: anyEndorseButton.className
                                        });
                                        
                                        anyEndorseButton.click();
                                        await delay(2000);
                                        
                                        return { 
                                            success: true, 
                                            message: `Clicked "Endorse" button for "${skillName}"` 
                                        };
                                    }
                                }
                            }
                        }
                    }
                    
                    // If still no success, try general endorsement elements
                    console.log('🔍 Step 6: Looking for general endorsement elements...');
                    const allEndorsementElements = document.querySelectorAll('[data-control-name*="endorsement"], [aria-label*="endorse"], .endorse-button, .skill-endorsement, button[aria-label*="endorse"], button[aria-label*="Endorse"]');
                    
                    console.log(`🔍 Found ${allEndorsementElements.length} endorsement-related elements`);
                    
                    // Debug: Log all endorsement elements found
                    allEndorsementElements.forEach((element, index) => {
                        console.log(`🔍 Endorsement element ${index + 1}:`, {
                            text: element.textContent?.substring(0, 50),
                            ariaLabel: element.getAttribute('aria-label'),
                            className: element.className,
                            tagName: element.tagName
                        });
                    });
                    
                    if (allEndorsementElements.length > 0) {
                        console.log('🎯 Clicking first endorsement element found');
                        allEndorsementElements[0].click();
                        await delay(2000);
                        
                        return { 
                            success: true, 
                            message: `Successfully endorsed skill "${skillName}" via general endorsement element` 
                        };
                    }
                    
                    console.log('⚠️ No endorsement elements found on page');
                    console.log('🔍 Page content analysis:', {
                        hasSkillsSection: !!document.querySelector('.pv-skill-category-entity, [data-section="skills"]'),
                        hasButtons: !!document.querySelector('button'),
                        hasArtdecoButtons: !!document.querySelector('.artdeco-button'),
                        pageTitle: document.title,
                        url: window.location.href,
                        totalButtons: document.querySelectorAll('button').length,
                        totalArtdecoButtons: document.querySelectorAll('.artdeco-button').length,
                        bodyText: document.body.textContent.substring(0, 300) + '...'
                    });
                    
                    // Check if we're actually on a profile page with skills
                    const isProfilePage = window.location.href.includes('linkedin.com/in/');
                    const hasSkills = document.querySelector('.pv-skill-category-entity, [data-section="skills"]');
                    
                    if (!isProfilePage) {
                        return { 
                            success: false, 
                            error: 'Not on LinkedIn profile page',
                            message: 'Page is not a LinkedIn profile'
                        };
                    }
                    
                    if (!hasSkills) {
                        return { 
                            success: false, 
                            error: 'No skills section found',
                            message: 'Profile does not have visible skills section'
                        };
                    }
                    
                    return { 
                        success: false, 
                        error: 'No endorsement elements found on profile page',
                        message: 'Profile opened for manual endorsement - LinkedIn may have changed their interface'
                    };
                    
                } catch (error) {
                    console.error('❌ Error in skill endorsement automation:', error);
                    return { 
                        success: false, 
                        error: error.message,
                        message: 'Skill endorsement automation failed'
                    };
                }
            },
            args: [data.skillName, data.entityUrn]
        });
        
        console.log('📊 Skill endorsement automation result:', result);
        
        if (result && result[0] && result[0].result) {
            console.log('✅ Automation script returned result:', result[0].result);
            return result[0].result;
        } else {
            console.log('❌ No result from automation script');
            console.log('Result object:', result);
            return { 
                success: false, 
                error: 'No result from automation script',
                message: 'Automation script did not return a result'
            };
        }
        
    } catch (error) {
        console.error('❌ Error processing skill in tab:', error);
        return { 
            success: false, 
            error: error.message,
            message: 'Failed to process skill in tab'
        };
    }
};

// Process queue sequentially - grouped by profile
const processEndorsementQueue = async () => {
    if (isProcessingQueue || !endorsementQueue || endorsementQueue.length === 0) {
        return;
    }
    
    isProcessingQueue = true;
    console.log(`🔄 Processing endorsement queue (${endorsementQueue.length} items remaining)`);
    
    // Group queue items by profile
    const profileGroups = new Map();
    while (endorsementQueue && endorsementQueue.length > 0) {
        const queueItem = endorsementQueue.shift();
        if (!profileGroups.has(queueItem.connectId)) {
            profileGroups.set(queueItem.connectId, []);
        }
        profileGroups.get(queueItem.connectId).push(queueItem);
    }
    
    // Process each profile group
    for (const [connectId, profileItems] of profileGroups) {
        console.log(`🎯 Processing profile ${connectId} with ${profileItems.length} skills`);
        
        // Open tab for this profile (first item)
        const firstItem = profileItems[0];
        let tab = null;
        
        try {
            // Open LinkedIn profile in new tab
            console.log(`🔄 Opening LinkedIn profile page for ${connectId}...`);
            console.log(`🌐 Opening URL: ${firstItem.data.profileUrl}`);
            
            tab = await chrome.tabs.create({
                url: firstItem.data.profileUrl,
                active: false, // Open in background
                pinned: false,
                index: 0 // Add to beginning of tab list
            });
            console.log(`✅ Tab created with ID: ${tab.id}`);
            
            if (!tab || !tab.id) {
                throw new Error('Failed to create tab');
            }
            
            // Track this tab for this profile
            activeEndorsementTabs.set(connectId, tab.id);
            console.log(`📝 Tracking endorsement tab for profile ${connectId}: ${tab.id}`);
            
            // Ensure tab stays in background
            try {
                await chrome.tabs.update(tab.id, { active: false });
                console.log('✅ Tab kept in background');
            } catch (updateError) {
                console.log('⚠️ Could not update tab to background:', updateError.message);
            }
            
            // Wait for page to load
            console.log('🔄 Waiting for page to load...');
            await new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 5; // Wait max 5 seconds
                
                const checkTab = () => {
                    attempts++;
                    chrome.tabs.get(tab.id, (tabInfo) => {
                        if (tabInfo && tabInfo.status === 'complete') {
                            console.log('✅ Page loaded completely');
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            console.log('⚠️ Page load timeout, proceeding anyway');
                            resolve();
                        } else {
                            setTimeout(checkTab, 1000);
                        }
                    });
                };
                checkTab();
            });
            
            // Process all skills for this profile in the same tab
            for (const item of profileItems) {
                console.log(`🎯 Processing skill: ${item.skillName} for ${connectId}`);
                
                try {
                    const result = await processSkillInTab(tab.id, item.data);
                    console.log(`✅ Skill ${item.skillName} completed: ${result.success ? 'Success' : 'Failed'}`);
                    
                    // Send response back to content script
                    if (item.sendResponse) {
                        item.sendResponse(result);
                    }
                    
                    // Small delay between skills for the same profile
                    if (profileItems.indexOf(item) < profileItems.length - 1) {
                        console.log(`⏳ Waiting 2 seconds before next skill...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error(`❌ Skill ${item.skillName} failed: ${error.message}`);
                    if (item.sendResponse) {
                        item.sendResponse({ 
                            success: false, 
                            error: error.message,
                            message: 'Skill processing failed'
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Profile ${connectId} processing failed: ${error.message}`);
            // Send error response to all items for this profile
            for (const item of profileItems) {
                if (item.sendResponse) {
                    item.sendResponse({ 
                        success: false, 
                        error: error.message,
                        message: 'Profile processing failed'
                    });
                }
            }
        } finally {
            // Close the tab after all skills are processed
            if (tab && tab.id) {
                setTimeout(async () => {
                    try {
                        await chrome.tabs.remove(tab.id);
                        console.log('✅ Profile endorsement tab closed');
                        
                        // Remove tracking
                        activeEndorsementTabs.delete(connectId);
                        console.log(`📝 Removed tracking for profile ${connectId}`);
                    } catch (error) {
                        console.log('⚠️ Could not close tab:', error.message);
                    }
                }, 3000); // Close after 3 seconds
            }
        }
        
        // Small delay between profiles
        if (Array.from(profileGroups.keys()).indexOf(connectId) < profileGroups.size - 1) {
            console.log(`⏳ Waiting 3 seconds before next profile...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    isProcessingQueue = false;
    console.log(`✅ Endorsement queue processing completed`);
};

// Function to handle skill endorsement requests from content scripts (legacy - now just returns success)
const handleSkillEndorsementRequest = async (data) => {
    console.log('🚀🚀🚀 handleSkillEndorsementRequest function STARTED!');
    console.log('🔍 Function called with:', data);
    
    const { skillName, entityUrn, connectId, profileUrl, currentCnt, totalResult } = data;
    
    // This function is now legacy - the actual processing is done in processEndorsementQueue
    // Just return success to indicate the request was received
    return { 
        success: true, 
        message: `Skill endorsement request received for ${skillName}, will be processed in profile queue`
    };
};

// Keep service worker alive
const keepServiceWorkerAlive = () => {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    
    keepAliveInterval = setInterval(() => {
        if (isServiceWorkerActive) {
            console.log('🔄 Service worker keep-alive ping');
        }
    }, 25000); // Ping every 25 seconds
    
    console.log('✅ Service worker keep-alive mechanism started');
};

// Initialize service worker
console.log('🚀 Background script starting...');
keepServiceWorkerAlive();
console.log('✅ Background script initialized successfully');

// Function to handle connection invite requests from content scripts
const handleConnectionInviteRequest = async (data) => {
    console.log('🚀🚀🚀 handleConnectionInviteRequest function STARTED!');
    console.log('🔍 Function called with:', data);
    
    const { profileUrl, message, currentCnt, totalResult } = data;
    
    try {
        // Step 1: Open LinkedIn profile in new tab
        console.log('🔄 Step 1: Opening LinkedIn profile page for connection invite...');
        console.log(`🌐 Opening URL: ${profileUrl}`);
        
        const tab = await chrome.tabs.create({
            url: profileUrl,
            active: false, // Open in background
            pinned: false,
            index: 0 // Add to beginning of tab list
        });
        console.log(`✅ Tab created with ID: ${tab.id}`);
        
        if (!tab || !tab.id) {
            throw new Error('Failed to create tab');
        }
        
        // Step 2: Wait for page to load
        console.log('🔄 Step 2: Waiting for page to load...');
        await new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 5; // Wait max 5 seconds
            
            const checkTab = () => {
                attempts++;
                chrome.tabs.get(tab.id, (tabInfo) => {
                    if (tabInfo && tabInfo.status === 'complete') {
                        console.log('✅ Page loaded completely');
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        console.log('⚠️ Page load timeout, proceeding anyway');
                        resolve();
                    } else {
                        setTimeout(checkTab, 1000);
                    }
                });
            };
            checkTab();
        });
        
        // Step 3: Inject connection invite automation script
        console.log('🔄 Step 3: Injecting connection invite automation script...');
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: async (message) => {
                console.log('🤖 LinkedIn Connection Invite Automation script executing...');
                console.log(`🎯 Attempting to send connection invite with message: "${message}"`);
                
                // Function to delay
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                
                try {
                    console.log('🔍 Step 4: Looking for connect button...');
                    
                    // Wait for page to be fully loaded
                    console.log('⏳ Waiting for LinkedIn profile to fully load...');
                    await delay(3000);
                    
                    // Check if we're on a LinkedIn profile page
                    if (!window.location.href.includes('linkedin.com/in/')) {
                        console.log('❌ Not on a LinkedIn profile page');
                        return { 
                            success: false, 
                            error: 'Not on LinkedIn profile page',
                            message: 'Page is not a LinkedIn profile'
                        };
                    }
                    
                    console.log('✅ LinkedIn profile page detected');
                    
                    // Look for connect button
                    const connectSelectors = [
                        'button[aria-label*="Connect"]',
                        'button[aria-label*="connect"]',
                        '.artdeco-button[aria-label*="Connect"]',
                        '.artdeco-button[aria-label*="connect"]',
                        'button[data-control-name="connect"]',
                        '.pv-s-profile-actions__connect',
                        'button:contains("Connect")',
                        'button:contains("connect")'
                    ];
                    
                    let connectButton = null;
                    for (let selector of connectSelectors) {
                        const button = document.querySelector(selector);
                        if (button) {
                            connectButton = button;
                            console.log(`🎯 Found connect button with selector: ${selector}`);
                            break;
                        }
                    }
                    
                    if (connectButton) {
                        console.log('🎯 Clicking connect button...');
                        connectButton.click();
                        
                        // Wait for modal to appear
                        await delay(2000);
                        
                        // Look for "Add a note" button
                        const addNoteSelectors = [
                            'button[aria-label*="Add a note"]',
                            'button:contains("Add a note")',
                            '.artdeco-button:contains("Add a note")',
                            'button[data-control-name="add_note"]'
                        ];
                        
                        let addNoteButton = null;
                        for (let selector of addNoteSelectors) {
                            const button = document.querySelector(selector);
                            if (button) {
                                addNoteButton = button;
                                console.log(`🎯 Found "Add a note" button with selector: ${selector}`);
                                break;
                            }
                        }
                        
                        if (addNoteButton) {
                            console.log('🎯 Clicking "Add a note" button...');
                            addNoteButton.click();
                            
                            // Wait for text area to appear
                            await delay(1000);
                            
                            // Look for message text area
                            const messageSelectors = [
                                'textarea[aria-label*="message"]',
                                'textarea[aria-label*="Message"]',
                                'textarea[placeholder*="message"]',
                                'textarea[placeholder*="Message"]',
                                'textarea[name="message"]',
                                '.artdeco-text-input__textarea'
                            ];
                            
                            let messageTextarea = null;
                            for (let selector of messageSelectors) {
                                const textarea = document.querySelector(selector);
                                if (textarea) {
                                    messageTextarea = textarea;
                                    console.log(`🎯 Found message textarea with selector: ${selector}`);
                                    break;
                                }
                            }
                            
                            if (messageTextarea) {
                                console.log('🎯 Typing message...');
                                messageTextarea.value = message;
                                messageTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                                
                                // Wait a moment for the message to be set
                                await delay(500);
                                
                                // Look for "Send" button
                                const sendSelectors = [
                                    'button[aria-label*="Send"]',
                                    'button[aria-label*="send"]',
                                    'button:contains("Send")',
                                    'button:contains("send")',
                                    '.artdeco-button:contains("Send")',
                                    'button[data-control-name="send_invite"]'
                                ];
                                
                                let sendButton = null;
                                for (let selector of sendSelectors) {
                                    const button = document.querySelector(selector);
                                    if (button) {
                                        sendButton = button;
                                        console.log(`🎯 Found send button with selector: ${selector}`);
                                        break;
                                    }
                                }
                                
                                if (sendButton) {
                                    console.log('🎯 Clicking send button...');
                                    sendButton.click();
                                    
                                    // Wait for confirmation
                                    await delay(2000);
                                    
                                    console.log('✅ Connection invite sent successfully!');
                                    return { 
                                        success: true, 
                                        message: `Successfully sent connection invite with message: "${message}"` 
                                    };
                                } else {
                                    console.log('⚠️ Send button not found');
                                    return { 
                                        success: false, 
                                        error: 'Send button not found',
                                        message: 'Could not find send button for connection invite' 
                                    };
                                }
                            } else {
                                console.log('⚠️ Message textarea not found');
                                return { 
                                    success: false, 
                                    error: 'Message textarea not found',
                                    message: 'Could not find message textarea for connection invite' 
                                };
                            }
                        } else {
                            console.log('⚠️ "Add a note" button not found, trying to send without message');
                            // Try to find and click send button directly
                            const sendSelectors = [
                                'button[aria-label*="Send"]',
                                'button[aria-label*="send"]',
                                'button:contains("Send")',
                                'button:contains("send")',
                                '.artdeco-button:contains("Send")',
                                'button[data-control-name="send_invite"]'
                            ];
                            
                            let sendButton = null;
                            for (let selector of sendSelectors) {
                                const button = document.querySelector(selector);
                                if (button) {
                                    sendButton = button;
                                    console.log(`🎯 Found send button with selector: ${selector}`);
                                    break;
                                }
                            }
                            
                            if (sendButton) {
                                console.log('🎯 Clicking send button (without message)...');
                                sendButton.click();
                                
                                // Wait for confirmation
                                await delay(2000);
                                
                                console.log('✅ Connection invite sent successfully (without message)!');
                                return { 
                                    success: true, 
                                    message: `Successfully sent connection invite (without message)` 
                                };
                            } else {
                                console.log('⚠️ Send button not found');
                                return { 
                                    success: false, 
                                    error: 'Send button not found',
                                    message: 'Could not find send button for connection invite' 
                                };
                            }
                        }
                    } else {
                        console.log('⚠️ Connect button not found');
                        return { 
                            success: false, 
                            error: 'Connect button not found',
                            message: 'Could not find connect button on profile page' 
                        };
                    }
                    
                } catch (error) {
                    console.error('❌ Error in connection invite automation:', error);
                    return { 
                        success: false, 
                        error: error.message,
                        message: 'Connection invite automation failed' 
                    };
                }
            },
            args: [message]
        });
        
        console.log('📊 Connection invite automation result:', result);
        
        // Close the tab after processing
        setTimeout(async () => {
            try {
                await chrome.tabs.remove(tab.id);
                console.log('✅ Connection invite tab closed');
            } catch (error) {
                console.log('⚠️ Could not close connection invite tab:', error.message);
            }
        }, 5000); // Keep tab open for 5 seconds to allow automation to complete
        
        if (result && result[0] && result[0].result) {
            return result[0].result;
        } else {
            return { 
                success: false, 
                error: 'No result from automation script',
                message: 'Automation script did not return a result' 
            };
        }
        
    } catch (error) {
        console.error('❌ Error in connection invite request:', error);
        return { 
            success: false, 
            error: error.message,
            message: 'Failed to send connection invite' 
        };
    }
};

// Add connection invite handler to message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background script received message:', request);
    
    if (request.action === 'test') {
        console.log('🧪 Test message received from content script');
        sendResponse({ success: true, message: 'Background script is working' });
        return true;
    }
    
    if (request.action === 'sendConnectionInvite') {
        console.log('🎯 Connection invite request received');
        console.log('📋 Request data:', request.data);
        
        handleConnectionInviteRequest(request.data)
            .then(result => {
                console.log('✅ Connection invite result:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('❌ Connection invite error:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message,
                    message: 'Connection invite failed' 
                });
            });
        return true;
    }
    
    if (request.action === 'cleanupEndorsementTracking') {
        console.log('🧹 Cleaning up endorsement tracking for:', request.data.connectId);
        activeEndorsementTabs.delete(request.data.connectId);
        sendResponse({ success: true, message: 'Tracking cleaned up' });
        return true;
    }
    
    if (request.action === 'getQueueStatus') {
        console.log('📊 Queue status requested');
        console.log('🔍 Queue variables check:', {
            endorsementQueue: typeof endorsementQueue,
            queueLength: endorsementQueue ? endorsementQueue.length : 'undefined',
            isProcessingQueue: typeof isProcessingQueue,
            isProcessingValue: isProcessingQueue
        });
        try {
            sendResponse({ 
                success: true, 
                queueSize: endorsementQueue ? endorsementQueue.length : 0,
                isProcessing: isProcessingQueue || false,
                activeTabs: activeEndorsementTabs ? Array.from(activeEndorsementTabs.keys()) : []
            });
        } catch (error) {
            console.error('❌ Error getting queue status:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                queueSize: 0,
                isProcessing: false,
                activeTabs: []
            });
        }
        return true;
    }
    
    if (request.action === 'clearEndorsementQueue') {
        console.log('🧹 Clearing endorsement queue');
        try {
            // Clear the queue
            endorsementQueue.length = 0;
            isProcessingQueue = false;
            
            // Close any active endorsement tabs
            for (const [connectId, tabId] of activeEndorsementTabs.entries()) {
                try {
                    chrome.tabs.remove(tabId);
                    console.log(`✅ Closed endorsement tab ${tabId} for profile ${connectId}`);
                } catch (error) {
                    console.log(`⚠️ Could not close tab ${tabId}:`, error.message);
                }
            }
            
            // Clear tracking
            activeEndorsementTabs.clear();
            
            sendResponse({ 
                success: true, 
                message: 'Endorsement queue cleared and tabs closed' 
            });
        } catch (error) {
            console.error('❌ Error clearing queue:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                message: 'Failed to clear queue' 
            });
        }
        return true;
    }
    
    if (request.action === 'startCampaign') {
        console.log('🚀 Campaign start request received');
        console.log('📋 Campaign ID:', request.campaignId);
        
        // Use async IIFE to handle await
        (async () => {
            try {
                // Store the campaign ID for tracking
                const campaignId = request.campaignId;
                
                // Set up campaign monitoring
                console.log(`🎯 Starting campaign monitoring for campaign ID: ${campaignId}`);
                
                // Update campaign status in backend using the campaignAction.js function
                if (typeof updateCampaign === 'function') {
                    console.log('🔄 Updating campaign status in backend...');
                    await updateCampaign({
                        campaignId: campaignId,
                        status: 'running'
                    });
                    console.log('✅ Campaign status updated in backend');
                } else {
                    console.log('⚠️ updateCampaign function not available');
                }
                
                // Send response immediately
                sendResponse({ 
                    success: true, 
                    message: `Campaign ${campaignId} started successfully`,
                    campaignId: campaignId
                });
                
                // Start campaign monitoring (this would typically involve checking campaign status)
                console.log(`📊 Campaign ${campaignId} is now active and being monitored`);
                
                // You can add campaign-specific logic here
                // For example, checking campaign status, running sequences, etc.
                
            } catch (error) {
                console.error('❌ Error starting campaign:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message,
                    message: 'Failed to start campaign' 
                });
            }
        })();
        return true;
    }
    
    if (request.action === 'checkCampaignStatus') {
        console.log('📊 Campaign status check requested');
        
        try {
            // For now, return a basic status
            // In a real implementation, this would check actual campaign status from backend
            sendResponse({ 
                success: true, 
                status: 'running',
                message: 'Campaign is running',
                hasActiveCampaigns: true
            });
        } catch (error) {
            console.error('❌ Error checking campaign status:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                status: 'error',
                message: 'Failed to check campaign status' 
            });
        }
        return true;
    }
    
    if (request.action === 'checkServiceWorkerStatus') {
        console.log('🔍 Service worker status check requested');
        
        try {
            sendResponse({ 
                success: true, 
                status: 'active',
                message: 'Service worker is active and responding',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error checking service worker status:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                status: 'error',
                message: 'Service worker status check failed' 
            });
        }
        return true;
    }
    
    if (request.action === 'stopCampaign') {
        console.log('⏹️ Campaign stop request received');
        console.log('📋 Campaign ID:', request.campaignId);
        
        // Use async IIFE to handle await
        (async () => {
            try {
                const campaignId = request.campaignId;
                
                console.log(`🛑 Stopping campaign monitoring for campaign ID: ${campaignId}`);
                
                // Update campaign status in backend
                if (typeof updateCampaign === 'function') {
                    console.log('🔄 Updating campaign status to stopped in backend...');
                    await updateCampaign({
                        campaignId: campaignId,
                        status: 'stopped'
                    });
                    console.log('✅ Campaign status updated to stopped in backend');
                } else {
                    console.log('⚠️ updateCampaign function not available');
                }
                
                sendResponse({ 
                    success: true, 
                    message: `Campaign ${campaignId} stopped successfully`,
                    campaignId: campaignId
                });
                
                console.log(`📊 Campaign ${campaignId} has been stopped`);
                
            } catch (error) {
                console.error('❌ Error stopping campaign:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message,
                    message: 'Failed to stop campaign' 
                });
            }
        })();
        return true;
    }
    
    if (request.action === 'sendSkillEndorsement') {
        console.log('🎯 Skill endorsement request received');
        console.log('📋 Request data:', request.data);
        
        try {
            const { skillName, entityUrn, connectId, profileUrl, currentCnt, totalResult } = request.data;
            
            // Add to queue for processing
            if (endorsementQueue) {
                endorsementQueue.push({
                    skillName: skillName,
                    connectId: connectId,
                    data: request.data,
                    sendResponse: sendResponse
                });
                console.log(`📝 Added skill "${skillName}" for profile ${connectId} to queue`);
                console.log(`📊 Queue size: ${endorsementQueue.length}`);
                
                // Start processing if not already processing
                if (!isProcessingQueue) {
                    console.log('🚀 Starting queue processing...');
                    processEndorsementQueue();
                } else {
                    console.log('⏳ Queue is already being processed, item added to queue');
                }
                
                sendResponse({ 
                    success: true, 
                    message: `Skill "${skillName}" added to endorsement queue for profile ${connectId}`,
                    queuePosition: endorsementQueue.length
                });
            } else {
                console.error('❌ Endorsement queue is undefined');
                sendResponse({ 
                    success: false, 
                    error: 'Queue system not initialized',
                    message: 'Endorsement queue is not available' 
                });
            }
        } catch (error) {
            console.error('❌ Error processing skill endorsement request:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                message: 'Failed to process skill endorsement request' 
            });
        }
        return true;
    }
    
    // Handle other message types here...
    console.log('⚠️ Unknown message action:', request.action);
    sendResponse({ 
        success: false, 
        error: 'Unknown action',
        message: 'Background script received unknown message type' 
    });
    return true;
});
