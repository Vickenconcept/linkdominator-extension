const getCookie = (cname) => {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split('; ');
  let token = ''

  for(let item of ca) {
    if(item.includes(name)) {
        token = item.replace(name,'');
        token = token.replaceAll('"','');
    }
  }
  return token;
}

var d=new Date();
var dInt=new Date(d).getTime();
var filterApi=PLATFORM_URL+'/api';
var voyagerApi=LINKEDIN_URL+'/voyager/api';
var linkedinBlock=LINKEDIN_URL+'/psettings/member-blocking';
var voyagerSingleSearchUrl=`${voyagerApi}/voyagerSearchDashReusableTypeahead?decorationId=com.linkedin.voyager.dash.deco.search.typeahead.ReusableTypeaheadCollection-26`;
var voyagerBlockSearchUrl=`${voyagerApi}/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-160&origin=GLOBAL_SEARCH_HEADER&q=all`;
var voyagerGroupMemberSearchUrl=`${voyagerApi}/groups/groups`;
var linkedinId='';
var profileUrn='';

// Make linkedinId globally available
window.linkedinId = linkedinId;

/**
 * Get LinkedIn ID with multiple fallback methods
 * This ensures the LinkedIn ID is always available for API calls
 * GLOBAL FUNCTION - Available to all scripts in the extension
 */
window.getLinkedInIdForApi = function() {
    // Method 1: Use global linkedinId variable
    if (linkedinId) {
        return linkedinId;
    }
    
    // Method 2: Use window.linkedinId
    if (window.linkedinId) {
        return window.linkedinId;
    }
    
    // Method 3: Get from DOM element
    if (typeof $ !== 'undefined' && $('#me-publicIdentifier').length) {
        const id = $('#me-publicIdentifier').val();
        if (id) {
            linkedinId = id;
            window.linkedinId = id;
            return id;
        }
    }
    
    // Method 4: Try to get from localStorage or sessionStorage
    try {
        const storedId = localStorage.getItem('linkedinId') || sessionStorage.getItem('linkedinId');
        if (storedId) {
            linkedinId = storedId;
            window.linkedinId = storedId;
            return storedId;
        }
    } catch (e) {
        console.warn('Could not access storage:', e);
    }
    
    console.warn('⚠️ LinkedIn ID not found. User may need to refresh the page.');
    return null;
};

// Also make it available as a non-window function for backward compatibility
function getLinkedInIdForApi() {
    return window.getLinkedInIdForApi();
}

/**
 * Sync LinkedIn ID with backend when 401 occurs
 * This automatically updates the user's linkedin_id in the database
 */
async function syncLinkedInIdWithBackend(linkedinPublicId) {
    try {
        console.log('🔄 Attempting to sync LinkedIn ID with backend...', linkedinPublicId);
        
        if (!linkedinPublicId) {
            console.error('❌ LinkedIn public ID is required for sync');
            return false;
        }
        
        const platformUrl = typeof PLATFORM_URL !== 'undefined' ? PLATFORM_URL : 'https://app.linkdominator.com';
        const syncUrl = `${platformUrl}/api/auth/sync-linkedin-id`;
        
        console.log('📡 Calling sync endpoint:', syncUrl);
        
        const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                linkedin_public_id: linkedinPublicId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ LinkedIn ID synced successfully:', data);
            return true;
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn('⚠️ LinkedIn ID sync failed:', errorData.message || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error('❌ Error syncing LinkedIn ID:', error);
        return false;
    }
}

// Make sync function globally available
window.syncLinkedInIdWithBackend = syncLinkedInIdWithBackend;

/**
 * Sync LinkedIn ID with backend when 401 occurs
 * This automatically updates the user's linkedin_id in the database
 */
async function syncLinkedInIdWithBackend(linkedinPublicId) {
    try {
        console.log('🔄 Attempting to sync LinkedIn ID with backend...', linkedinPublicId);
        
        if (!linkedinPublicId) {
            console.error('❌ LinkedIn public ID is required for sync');
            return false;
        }
        
        const platformUrl = typeof PLATFORM_URL !== 'undefined' ? PLATFORM_URL : 'https://app.linkdominator.com';
        const syncUrl = `${platformUrl}/api/auth/sync-linkedin-id`;
        
        console.log('📡 Calling sync endpoint:', syncUrl);
        
        const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                linkedin_public_id: linkedinPublicId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ LinkedIn ID synced successfully:', data);
            return true;
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn('⚠️ LinkedIn ID sync failed:', errorData.message || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error('❌ Error syncing LinkedIn ID:', error);
        return false;
    }
}

// Make sync function globally available
window.syncLinkedInIdWithBackend = syncLinkedInIdWithBackend;

/**
 * Global API request wrapper that automatically adds lk-id header
 * Use this for all API calls to ensure authentication
 */
window.apiRequestWithAuth = async function(url, options = {}) {
    const currentLinkedInId = window.getLinkedInIdForApi();
    
    if (!currentLinkedInId) {
        console.error('❌ LinkedIn ID not available for API call');
        throw new Error('LinkedIn ID not found. Please refresh the page to re-authenticate.');
    }
    
    // Merge headers
    const headers = {
        'Content-Type': 'application/json',
        'lk-id': currentLinkedInId,
        'ngrok-skip-browser-warning': 'true',
        ...options.headers
    };
    
    // Make the request
    const response = await fetch(url, {
        ...options,
        headers: headers
    });
    
    // Handle 401 errors
    if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'User not found or unauthorized');
        error.errorCode = 'UNAUTHORIZED';
        error.errorType = 'unauthorized';
        error.helpMessage = 'Your LinkedIn account may not be connected to this platform. Please connect your LinkedIn account in the dashboard.';
        throw error;
    }
    
    return response;
};

/**
 * Global jQuery AJAX wrapper that automatically adds lk-id header
 * Use this for all jQuery AJAX calls to ensure authentication
 */
window.ajaxWithAuth = function(options) {
    const currentLinkedInId = window.getLinkedInIdForApi();
    
    if (!currentLinkedInId) {
        console.error('❌ LinkedIn ID not available for API call');
        if (options.error) {
            options.error({ message: 'LinkedIn ID not found. Please refresh the page.' }, 'error', '');
        }
        return;
    }
    
    // Add lk-id header in beforeSend if it exists, otherwise create it
    const originalBeforeSend = options.beforeSend || function() {};
    options.beforeSend = function(request) {
        request.setRequestHeader('lk-id', currentLinkedInId);
        request.setRequestHeader('ngrok-skip-browser-warning', 'true');
        originalBeforeSend.call(this, request);
    };
    
    return $.ajax(options);
};


var jsession = getCookie('JSESSIONID');
// header params
var accept = 'text/plain, */*; q=0.01';
var acceptVnd = 'application/vnd.linkedin.normalized+json+2.1';
var contentType = 'application/json; charset=UTF-8';
var contentTypeJsonOnly = 'application/json';
var xLiLang = 'en_US';
var xLiPageInstance = 'urn:li:page:d_flagship3_people_invitations;1ZlPK7kKRNSMi+vkXMyVMw==';
var xLiPageInstanceFIlter = 'urn:li:page:d_flagship3_search_srp_top;YHGJbIUbSOGd0tf1Bw0dqA==';
var xLiTrack = {"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xLiTrack2 = {"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xLiTrack3 = {"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xLiTrackFilter = {"clientVersion":"1.8.4154","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xRestliProtocolVersion = '2.0.0';


const getUserProfile = async () => {
  await ajaxPromise({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('Accept', '*/*');
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      request.setRequestHeader('X-Li-Lang', 'en_US');
      request.setRequestHeader('X-Li-Page-Instance', 'urn:li:page:d_flagship3_feed;YGW6mrQMQ3aVUJHdZAqr5Q==');
      request.setRequestHeader('X-Li-Track', JSON.stringify({"clientVersion":"1.7.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('X-Restli-Protocol-Version', '2.0.0');
    },
    url: `${voyagerApi}/me`,
    success: function(data){
        var loggedInUser = data;
        var rootPath = loggedInUser.miniProfile;
        var userName = rootPath.firstName;
        var lastName = rootPath.lastName;
        var profilePixRootUrl = rootPath.hasOwnProperty('picture') ? rootPath.picture['com.linkedin.common.VectorImage'].rootUrl : null;
        var profilePix = rootPath.hasOwnProperty('picture') ?  profilePixRootUrl+rootPath.picture['com.linkedin.common.VectorImage'].artifacts[0].fileIdentifyingUrlPathSegment : null;
        var plainId = null;
        var publicIdentifier = rootPath.publicIdentifier;

        if(data.hasOwnProperty('plainId')){
          plainId = loggedInUser.plainId;
        }

        if(!profilePix) {
          profilePix = `<i class="fas fa-user-circle fa-lg img-thumbnail rounded-circle" style="color:#9999FF;margin-top:15px"></i>`
        }else {
          profilePix = `<img src="${profilePix}" class="img-thumbnail rounded-circle" width="40" height="40" style="float:left;"></img>`
        }
        
        userData = `
          <div style="display:inline-block;">
            ${profilePix}&nbsp;&nbsp;
            <h6 class="selected-drop-list" 
              style="float:right;position:relative;color:#000000;padding: 12px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;">
              <b>${userName}</b>
            </h6>
          </div>
          <input type="hidden" value="${plainId}" id="me-plainId">
          <input type="hidden" value="${publicIdentifier}" id="me-publicIdentifier">
        `;
        $('#profileSpot').append(userData);
        linkedinId = $('#me-publicIdentifier').val();
        // Make linkedinId globally available for all scripts
        window.linkedinId = linkedinId;
        profileUrn = rootPath.entityUrn.replace('urn:li:fs_miniProfile:','');
        
        
        connectionStat();
        userPermissions();
    
    },
    error: function(err,statusText,responseText){
      if(err.hasOwnProperty('responseJSON') && err.responseJSON && err.responseJSON.data && err.responseJSON.data.message)
        console.log(err.responseJSON.data.message);
      else console.log(responseText);
    }
  })
}

// calculate time for automation
const remainedTime = (delayTime, totalConnect) => {
  var time = delayTime * totalConnect
  // Hours, minutes and seconds
  var hrs = ~~(time / 3600);
  var mins = ~~((time % 3600) / 60);
  var secs = ~~time % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = "";
  if (hrs > 0) {
      ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }
  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

// based on module action
const sendStats = async (totalFollow, module) => {
  const profileId = $('#me-publicIdentifier').val();
  const url = `${filterApi}/activites?module=${module}&stat=${totalFollow}&identifier=${profileId}`;
  
  console.log('📊 [User Activity] Sending stats to backend:', {
    module: module,
    stat: totalFollow,
    profileId: profileId,
    url: url
  });
  
  await ajaxPromise({
      method: 'post',
      url: url,
      success: function(data){
        console.log('✅ [User Activity] Stats saved successfully:', {
          module: module,
          stat: totalFollow,
          response: data
        });
      },
      error: function(err, textStatus){
        console.error('❌ [User Activity] Failed to save stats:', {
          module: module,
          stat: totalFollow,
          error: err,
          textStatus: textStatus
        });
        if(err.hasOwnProperty('responseJSON') && err.responseJSON && err.responseJSON.data && err.responseJSON.data.message)
          console.log(err.responseJSON.data.message);
        else console.log(textStatus);
      }
  })
}

const connectionStat = async () => {
  await ajaxPromise({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/relationships/connectionsSummary`,
    success: function(data){
      let totalConnection = data.numConnections
      
      if(data.entityUrn.includes('urn:li:fs_relConnectionsSummary:')){}
        let publicId = data.entityUrn.replace('urn:li:fs_relConnectionsSummary:','')

      pendingInviteStat(totalConnection, publicId)
    },
    error: function(err, textStatus){
      // Silent error handling
    }
  })
}

const pendingInviteStat = async (totalConnection, publicId) => {
  await ajaxPromise({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/relationships/invitationsSummaryV2?types=List(SENT_INVITATION_COUNT,PENDING_INVITATION_COUNT)`,
    success: function(data){
      let numTotalSentInvitations = data.numTotalSentInvitations;
      
      profileViewStat(totalConnection, numTotalSentInvitations, publicId)
    },
    error: function(err, textStatus){
      // Silent error handling
    }
  })
}

const profileViewStat = async (totalConnection, numTotalSentInvitations, publicId) => {
  await ajaxPromise({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/identity/panels`,
    success: function(data){
      let profileView = 0;

      if(data.elements.length) {
        let realPath = data.elements[0].value['com.linkedin.voyager.identity.me.ProfileViewsByTimePanel'].chartData;
        let realPoint = realPath.length - 1
        let changePercentage = realPath[realPoint].changePercentage
        

        // Ensure changePercentage is a valid number
        changePercentage = parseFloat(changePercentage) || 0;
        
        // Store as number (negative values are valid - means views decreased)
        // The dashboard will format it with proper sign and color
        profileView = changePercentage;
      }
      sendMiniStats(totalConnection, numTotalSentInvitations, profileView)
    },
    error: function(err, textStatus){
      // Silent error handling
    }
  })
}

const sendMiniStats = async (totalConnection, numTotalSentInvitations, profileView) => {
  const profileId = $('#me-publicIdentifier').val();
  const url = `${filterApi}/conf?connection=${totalConnection}&sentInvite=${numTotalSentInvitations}&profileView=${profileView}&profileId=${profileId}`;
  
  await ajaxPromise({
    method: 'post',
    url: url,
    success: function(data){
      // Silent success
    },
    error: function(err, textStatus){
      // Silent error handling
    }
  })
}

const userPermissions = async () => {
  try {
    // Ensure linkedinId is available before making API call
    let currentLinkedInId = getLinkedInIdForApi();
    
    if (!currentLinkedInId) {
      console.warn('⚠️ LinkedIn ID not available yet. Waiting for authentication...');
      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 2000));
      currentLinkedInId = getLinkedInIdForApi();
      
      if (!currentLinkedInId) {
        console.error('❌ LinkedIn ID still not available after waiting. User may need to refresh the page.');
        console.error('💡 Please ensure you are logged into LinkedIn and refresh the page.');
        $('body').append(`<input type="hidden" id="accessCheck" value="401">`);
        return;
      }
    }
    
    
    const response = await fetch(`${filterApi}/accessCheck`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'lk-id': currentLinkedInId
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status == 401) {
      console.error('❌ Access denied (401). Attempting to automatically sync LinkedIn ID...');
      
      // Try to automatically sync LinkedIn ID with backend
      const syncSuccess = await syncLinkedInIdWithBackend(currentLinkedInId);
      
      if (syncSuccess) {
        // Wait a moment for database update to propagate
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Re-check authorization after sync
        console.log('🔄 Re-checking authorization after sync...');
        const retryResponse = await fetch(`${filterApi}/accessCheck`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'lk-id': currentLinkedInId
          }
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.status !== 401) {
            console.log('✅✅✅ Authorization successful after automatic sync!');
            // Remove the 401 flag
            $('#accessCheck').remove();
            // Hide authorization button if it was shown
            if ($('#authorize-button-container').length) {
              $('#authorize-button-container').hide();
              $('#menus span').css('opacity', '1').css('pointer-events', 'auto');
            }
            // Continue with normal initialization
            onMounted();
            getAutoRespondMessages();
            getAIContents();
            getSNLeadList();
            getCampaigns();
            return; // Success, exit early
          }
        }
      }
      
      // If still 401 after sync attempt, show authorization button
      console.error('❌ Still unauthorized after sync attempt. User may need to connect account in dashboard.');
      $('body').append(`<input type="hidden" id="accessCheck" value="${data.status}">`);
      
      // Show authorization button in sidebar using centralized function
      setTimeout(() => {
        if (typeof window.checkAuthAndShowCard === 'function') {
          window.checkAuthAndShowCard();
        } else {
          // Fallback if function not available yet
          if ($('#authorize-button-container').length) {
            $('#authorize-button-container').show();
            // Disable menu items
            $('#menus span').css('opacity', '0.5').css('pointer-events', 'none');
          }
        }
      }, 500);
    } else {
      // Hide authorization button if authorized using centralized function
      if (typeof window.checkAuthAndShowCard === 'function') {
        window.checkAuthAndShowCard();
      } else {
        // Fallback if function not available yet
        if ($('#authorize-button-container').length) {
          $('#authorize-button-container').hide();
          // Enable menu items
          $('#menus span').css('opacity', '1').css('pointer-events', 'auto');
        }
      }
      onMounted();
      getAutoRespondMessages();
      getAIContents();
      getSNLeadList();
      getCampaigns();
    }
  } catch (error) {
    console.error('❌ Error in userPermissions:', error);
    // Set accessCheck to 401 if it's an unauthorized error
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      $('body').append(`<input type="hidden" id="accessCheck" value="401">`);
    }
    // Don't throw the error to prevent unhandled promise rejection
  }
}

const onMounted = () => {
  if (localStorage.getItem("lkm-mtu") === null) {
    localStorage.setItem("lkm-mtu", JSON.stringify({
      uploads: [],
      position: 0,
      total: 10,
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-mac") === null) {
    localStorage.setItem("lkm-mac", JSON.stringify({
      uploads: [],
      position: 0,
      total: 10,
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-bdw") === null) {
    localStorage.setItem("lkm-bdw", JSON.stringify({
      uploads: [],
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-ang") === null) {
    localStorage.setItem("lkm-ang", JSON.stringify({
      uploads: [],
      delay: 30,
      period: 7,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-njc") === null) {
    localStorage.setItem("lkm-njc", JSON.stringify({
      uploads: [],
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-mfu") === null) {
    localStorage.setItem("lkm-mfu", JSON.stringify({
      uploads: [],
      delay: 30,
      total: 10,
      waitdays: 2,
      filters: {}
    }))
  }
  if(localStorage.getItem("lkm-arm") === null) {
    localStorage.setItem("lkm-arm", JSON.stringify({
      uploads: [],
    }))
  }
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

// Enhanced error notification system
const NotificationSystem = {
    types: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    show: function(type, message, duration = 5000) {
        // Remove existing notifications
        this.clear();
        
        const notification = document.createElement('div');
        notification.className = `ld-notification ld-notification-${type}`;
        notification.innerHTML = `
            <div class="ld-notification-content">
                <span class="ld-notification-icon">${this.getIcon(type)}</span>
                <span class="ld-notification-message">${message}</span>
                <button class="ld-notification-close" onclick="NotificationSystem.clear()">×</button>
            </div>
        `;
        
        // Add styles if not already added
        this.addStyles();
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            this.clear();
        }, duration);
        
        // Store reference for manual clearing
        this.currentNotification = notification;
    },

    clear: function() {
        const notifications = document.querySelectorAll('.ld-notification');
        notifications.forEach(notification => {
            notification.remove();
        });
        this.currentNotification = null;
    },

    getIcon: function(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    addStyles: function() {
        if (document.getElementById('ld-notification-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'ld-notification-styles';
        styles.textContent = `
            .ld-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                animation: ld-notification-slide-in 0.3s ease-out;
            }
            
            .ld-notification-success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .ld-notification-error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .ld-notification-warning {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .ld-notification-info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .ld-notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .ld-notification-icon {
                font-weight: bold;
                font-size: 16px;
            }
            
            .ld-notification-message {
                flex: 1;
            }
            
            .ld-notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.7;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ld-notification-close:hover {
                opacity: 1;
            }
            
            @keyframes ld-notification-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
};

// Utility function to wrap jQuery AJAX in a proper Promise
function ajaxPromise(options) {
    return new Promise((resolve, reject) => {
        $.ajax({
            ...options,
            success: function(data, textStatus, jqXHR) {
                if (options.success) {
                    try {
                        options.success(data, textStatus, jqXHR);
                    } catch (error) {
                        console.error('Error in success callback:', error);
                    }
                }
                resolve(data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                if (options.error) {
                    try {
                        options.error(jqXHR, textStatus, errorThrown);
                    } catch (error) {
                        console.error('Error in error callback:', error);
                    }
                }
                
                // Handle 410 errors gracefully - don't reject the promise
                if (jqXHR.status === 410) {
                    console.log('LinkedIn API endpoint no longer available (410 Gone) - resolving gracefully');
                    resolve(null); // Resolve with null instead of rejecting
                    return;
                }
                
                reject(jqXHR);
            }
        });
    });
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent the default browser behavior
    event.preventDefault();
    
    let errorMessage = 'An unexpected error occurred. Please try again.';
    
    // Check if it's a jQuery AJAX error
    if (event.reason && event.reason.readyState !== undefined) {
        console.log('🔍 jQuery AJAX error detected:', {
            readyState: event.reason.readyState,
            status: event.reason.status,
            statusText: event.reason.statusText,
            responseText: event.reason.responseText
        });
        
        // This is a jQuery AJAX error
        if (event.reason.readyState === 0) {
            errorMessage = 'Network error - Check your internet connection.';
        } else if (event.reason.status === 0) {
            errorMessage = 'Request failed - Server may be unavailable.';
        } else if (event.reason.status === 429) {
            errorMessage = 'Rate limit exceeded - Please wait a moment.';
        } else if (event.reason.status >= 500) {
            errorMessage = 'Server error - Please try again later.';
        } else if (event.reason.status === 401) {
            errorMessage = 'Authentication required - Please Connect your LinkedIn Account ';
        } else if (event.reason.status === 403) {
            errorMessage = 'Access denied - You may not have permission.';
        } else if (event.reason.status === 404) {
            errorMessage = 'Resource not found - The requested endpoint may not exist.';
        }
    } else if (event.reason && event.reason.message) {
        // This is a regular error
        if (event.reason.message.includes('timeout')) {
            errorMessage = 'Request timed out - Please try again.';
        } else if (event.reason.message.includes('Failed to fetch')) {
            errorMessage = 'Network error - Check your connection.';
        } else if (event.reason.message.includes('AbortError')) {
            errorMessage = 'Request was cancelled - Please try again.';
        } else if (event.reason.message.includes('CSRF')) {
            errorMessage = 'Authentication error - Please refresh the page.';
        }
    }
    
    // Only show notification for non-410 errors
    if (event.reason && event.reason.status === 410) {
        console.log('LinkedIn API endpoint no longer available (410 Gone) - this is normal, not showing error notification');
    } else {
        // Show notification for other errors
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.show('error', errorMessage);
        } else {
            console.error('Error:', errorMessage);
        }
    }
    
    // Log the full error for debugging
    console.error('Full error details:', event.reason);
});

// Global error handler for JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    NotificationSystem.show('error', 'A system error occurred. Please refresh the page.');
});

// Enhanced API error handling
const handleApiError = function(error, context = '') {
    console.error(`API Error in ${context}:`, error);
    
    let userMessage = 'An error occurred while processing your request.';
    
    if (error.message) {
        if (error.message.includes('Failed to fetch')) {
            userMessage = 'Network connection error. Please check your internet connection.';
        } else if (error.message.includes('401')) {
            userMessage = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('403')) {
            userMessage = 'Access denied. You may not have permission for this action.';
        } else if (error.message.includes('404')) {
            userMessage = 'The requested resource was not found.';
        } else if (error.message.includes('500')) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. Please try again.';
        } else {
            userMessage = error.message;
        }
    }
    
    NotificationSystem.show('error', userMessage);
    return userMessage;
};

// Enhanced success notification
const handleApiSuccess = function(message, context = '') {
    console.log(`API Success in ${context}:`, message);
    NotificationSystem.show('success', message || 'Operation completed successfully.');
};

// Authentication status checker
const checkAuthStatus = function() {
    if (!linkedinId) {
        NotificationSystem.show('warning', 'LinkedIn authentication required. Please refresh the page.');
        return false;
    }
    return true;
};

