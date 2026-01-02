// Enhanced LinkedIn API configuration
const LINKEDIN_API_CONFIG = {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 2000,
    maxDelay: 10000, // 10 seconds between requests
    rateLimitDelay: 5000 // 5 seconds when rate limited
};

// Enhanced LinkedIn API request with retry and timeout
const makeLinkedInApiRequest = async (url, options = {}, retryCount = 0) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LINKEDIN_API_CONFIG.timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'csrf-token': jsession,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'content-type': contentType,
                'x-li-lang': xLiLang,
                'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;QazGJ/pNTwuq6OTtMClfPw==',
                'x-li-track': JSON.stringify({
                    "clientVersion": "1.10.1335",
                    "osName": "web",
                    "timezoneOffset": 1,
                    "deviceFormFactor": "DESKTOP",
                    "mpName": "voyager-web"
                }),
                'x-restli-protocol-version': xRestliProtocolVersion,
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            if (response.status === 429) {
                // Rate limited - wait and retry
                console.log('LinkedIn rate limited, waiting before retry...');
                await new Promise(resolve => setTimeout(resolve, LINKEDIN_API_CONFIG.rateLimitDelay));
                
                if (retryCount < LINKEDIN_API_CONFIG.retryAttempts) {
                    return makeLinkedInApiRequest(url, options, retryCount + 1);
                }
            }
            
            throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        // Retry logic for network errors
        if (retryCount < LINKEDIN_API_CONFIG.retryAttempts && 
            (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
            console.log(`LinkedIn API request failed, retrying... (${retryCount + 1}/${LINKEDIN_API_CONFIG.retryAttempts})`);
            await new Promise(resolve => setTimeout(resolve, LINKEDIN_API_CONFIG.retryDelay * (retryCount + 1)));
            return makeLinkedInApiRequest(url, options, retryCount + 1);
        }
        
        throw error;
    }
};

// Enhanced error handling for audience creation
const handleAudienceCreationError = (error, context) => {
    console.error(`Audience creation error in ${context}:`, error);
    
    let userMessage = 'An error occurred while creating the audience.';
    
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        userMessage = 'Request timed out. LinkedIn may be slow, please try again.';
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        userMessage = 'LinkedIn rate limit reached. Please wait a moment and try again.';
    } else if (error.message.includes('Failed to fetch')) {
        userMessage = 'Network error. Please check your internet connection.';
    } else if (error.message.includes('LinkedIn API error')) {
        userMessage = 'LinkedIn API error. Please refresh the page and try again.';
    }
    
    // Show error to user
    $('#afc-displayNewAudienceStatus').html(`
        <div style="color: #dc3545;">
            <i class="fas fa-exclamation-triangle"></i> ${userMessage}
        </div>
        <button onclick="retryAudienceCreation()" class="btn btn-sm btn-primary mt-2">
            <i class="fas fa-redo"></i> Try Again
        </button>
    `);
    
    // Re-enable the action button
    $('.newAudienceAction').attr('disabled', false);
    
    // Show notification if available
    if (typeof NotificationSystem !== 'undefined') {
        NotificationSystem.show('error', userMessage);
    }
};

// Global retry function for audience creation
window.retryAudienceCreation = function() {
    console.log('Retrying audience creation...');
    $('#afc-displayNewAudienceStatus').html('<i class="fas fa-spinner fa-spin"></i> Retrying...');
    $('.newAudienceAction').attr('disabled', true);
    
    // Restart the audience creation process
    setTimeout(() => {
        // This will be called by the original audience creation trigger
        // The exact function depends on which audience type is being created
        if (typeof startAudienceCreation === 'function') {
            startAudienceCreation();
        }
    }, 1000);
};

// Global search control variables
window.searchActive = false;
window.searchTimeout = null;
window.maxSearchPosition = 1000; // Maximum position to prevent infinite loops
window.getConnectionsLooper = null; // Global reference to the looper function

// Stop search function
window.stopAudienceSearch = function() {
    console.log('Stopping audience search...');
    window.searchActive = false;
    
    if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = null;
    }
    
    $('#afc-displayNewAudienceStatus').html(
        `<i class="fas fa-stop"></i> Search stopped. Found ${audConnectionItems.length} connections.`
    );
    $('.newAudienceAction').attr('disabled', false);
    
    // Add buttons without inline handlers
    $('#afc-displayNewAudienceStatus').append(`
        <br><button id="continueSearchBtn" class="btn btn-sm btn-success mt-2">
            <i class="fas fa-play"></i> Continue Search
        </button>
        <button id="finishResultsBtn" class="btn btn-sm btn-primary mt-2">
            <i class="fas fa-check"></i> Use Current Results (${audConnectionItems.length})
        </button>
    `);
    
    // Add event listeners after creating buttons
    $('#continueSearchBtn').on('click', function() {
        continueAudienceSearch();
    });
    
    $('#finishResultsBtn').on('click', function() {
        finishWithCurrentResults();
    });
};

// Continue search function
window.continueAudienceSearch = function() {
    console.log('Continuing audience search...');
    window.searchActive = true;
    $('#afc-displayNewAudienceStatus').html(
        `<i class="fas fa-spinner fa-spin"></i> Continuing search... Found ${audConnectionItems.length} connections so far.`
    );
    $('.newAudienceAction').attr('disabled', true);
    
    // Continue from current position
    setTimeout(() => {
        if (window.getConnectionsLooper) {
            window.getConnectionsLooper();
        } else {
            console.error('getConnectionsLooper not available, restarting search...');
            // If looper is not available, restart the search
            fsGetConnections();
        }
    }, 1000);
};

// Finish with current results
window.finishWithCurrentResults = function() {
    console.log('Finishing with current results:', audConnectionItems.length);
    window.searchActive = false;
    
    if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = null;
    }
    
    if (audConnectionItems.length > 0) {
        $('#afc-displayNewAudienceStatus').html(
            `<i class="fas fa-check"></i> Using ${audConnectionItems.length} connections found!`
        );
        afcSetConnectionData(0); // Process current results
    } else {
        $('#afc-displayNewAudienceStatus').html(
            '<i class="fas fa-info-circle"></i> No connections found. Try different search criteria.'
        );
        $('.newAudienceAction').attr('disabled', false);
    }
};

// Enhanced fsGetConnections with better control
const fsGetConnections = async () => {
    let totalResultCount = 0;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Set search as active
    window.searchActive = true;

    // Define the looper function and make it globally accessible
    window.getConnectionsLooper = async () => {
        // Check if search was stopped
        if (!window.searchActive) {
            console.log('Search stopped by user');
            return;
        }
        
        // Check if position is too high
        if (getConnectParams.startPosition > window.maxSearchPosition) {
            console.log('Maximum search position reached, stopping search');
            $('#afc-displayNewAudienceStatus').html(
                `<i class="fas fa-info-circle"></i> Maximum search depth reached. Found ${audConnectionItems.length} connections.`
            );
            $('.newAudienceAction').attr('disabled', false);
            window.searchActive = false;
            return;
        }
        
        try {
            // Add random delay to avoid detection
            const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            console.log(`Fetching connections from position: ${getConnectParams.startPosition}`);
            
            let res;
            if (getConnectParams.usePhantomSearch) {
                console.log('Using PhantomBuster Search Export for audience search', {
                    searchUrl: getConnectParams.searchUrl,
                    limit: $('#afs-total').val()
                });

                const response = await fetch(`${PLATFORM_URL}/api/audience/search-export`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'lk-id': linkedinId,
                        'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning page
                    },
                    body: JSON.stringify({
                        search_url: getConnectParams.searchUrl || null,
                        keywords: getConnectParams.keywords,
                        connection_degrees: getConnectParams.connection_degrees,
                        limit: parseInt($('#afs-total').val(), 10) || undefined
                    })
                });

                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`Search export failed: ${response.status} ${body}`);
                }

                res = await response.json();
            } else {
                console.log('Search URL:', `${voyagerBlockSearchUrl}&query=${getConnectParams.queryParams}&start=${getConnectParams.startPosition}`);
                console.log('Query Parameters:', getConnectParams.queryParams);
                
                const data = await makeLinkedInApiRequest(
                    `${voyagerBlockSearchUrl}&query=${getConnectParams.queryParams}&start=${getConnectParams.startPosition}`
                );
                
                console.log('LinkedIn API Response:', data);
                
                res = {'data': data};
            }
            let elements = res['data'].data.elements;
            let included = res['data'].included;

            console.log('Elements found:', elements ? elements.length : 0);
            console.log('Included items:', included ? included.length : 0);
            
            if (elements && elements.length) {
                console.log('Element structure:', elements);
                
                if (totalResultCount == 0) {
                    totalResultCount = res['data'].data.metadata.totalResultCount;
                    console.log('Total result count:', totalResultCount);
                }

                if ((elements.length > 1 && elements[1].items && elements[1].items.length) || 
                    (elements.length == 1 && elements[0].items && elements[0].items.length)) {
                    
                    console.log('Processing items from elements...');
                    
                    for (let item of included) {
                        // Check if search was stopped during processing
                        if (!window.searchActive) {
                            console.log('Search stopped during item processing');
                            return;
                        }
                        
                        console.log('Processing item:', item);
                        
                        // perform checks
                        if (item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                            console.log('Item has title and subtitle:', {
                                title: item.title.text,
                                subtitle: item.primarySubtitle.text
                            });
                            
                            if (item.title.text && item.primarySubtitle.text && 
                                item.title.text.includes('LinkedIn Member') == false) {
                                
                                console.log('Item passed LinkedIn Member check');
                                
                                // If using PhantomBuster and search URL already includes keywords,
                                // skip positive keyword filtering here (LinkedIn already filtered by keywords)
                                // The filterProfilesByPreferences function will handle additional filtering later
                                const searchKeywords = (getConnectParams.keywords || '').toLowerCase().trim();
                                const positiveKeywords = (getConnectParams.positiveKeywords || '').toLowerCase().trim();
                                const keywordsMatch = searchKeywords && positiveKeywords && 
                                    positiveKeywords.split(',').some(kw => searchKeywords.includes(kw.trim()));
                                
                                if (getConnectParams.positiveKeywords && !keywordsMatch) {
                                    // Only filter if positive keywords don't match search keywords
                                    console.log('Checking positive keywords:', getConnectParams.positiveKeywords);
                                    let keywordMatched = false;
                                    for (let text of getConnectParams.positiveKeywords.split(',')) {
                                        const cleanText = text.trim().toLowerCase();
                                        const titleText = item.title.text.toLowerCase();
                                        const subtitleText = item.primarySubtitle.text.toLowerCase();
                                        // Also check headline if available (PhantomBuster data)
                                        const headlineText = (item.headline || item.primarySubtitle?.text || '').toLowerCase();
                                        
                                        if (titleText.includes(cleanText) || subtitleText.includes(cleanText) || headlineText.includes(cleanText)) {
                                            console.log(`Item matched positive keyword "${cleanText}":`, {
                                                title: item.title.text,
                                                subtitle: item.primarySubtitle.text,
                                                headline: item.headline || item.primarySubtitle?.text
                                            });
                                            keywordMatched = true;
                                            audConnectionItems.push(item);
                                            break; // Found a match, no need to check other keywords
                                        }
                                    }
                                    if (!keywordMatched) {
                                        console.log(`Item filtered out - no positive keyword match:`, {
                                            title: item.title.text,
                                            subtitle: item.primarySubtitle.text,
                                            headline: item.headline || item.primarySubtitle?.text,
                                            keywords: getConnectParams.positiveKeywords
                                        });
                                    }
                                } else if (getConnectParams.positiveKeywords && keywordsMatch) {
                                    // Search keywords match positive keywords - LinkedIn already filtered, include all results
                                    console.log('Positive keywords match search keywords - including all results (already filtered by LinkedIn)');
                                    audConnectionItems.push(item);
                                } else if (getConnectParams.negativeKeywords) {
                                    console.log('Checking negative keywords:', getConnectParams.negativeKeywords);
                                    let shouldExclude = false;
                                    for (let text of getConnectParams.negativeKeywords.split(',')) {
                                        const cleanText = text.trim().toLowerCase();
                                        const titleText = item.title.text.toLowerCase();
                                        const subtitleText = item.primarySubtitle.text.toLowerCase();
                                        
                                        if (titleText.includes(cleanText) || subtitleText.includes(cleanText)) {
                                            console.log(`Item excluded by negative keyword "${cleanText}":`, {
                                                title: item.title.text,
                                                subtitle: item.primarySubtitle.text
                                            });
                                            shouldExclude = true;
                                            break;
                                        }
                                    }
                                    if (!shouldExclude) {
                                        console.log(`Item passed negative keyword check:`, {
                                            title: item.title.text,
                                            subtitle: item.primarySubtitle.text
                                        });
                                        audConnectionItems.push(item);
                                    }
                                } else {
                                    console.log('No keywords specified, adding item:', {
                                        title: item.title.text,
                                        subtitle: item.primarySubtitle.text
                                    });
                                    audConnectionItems.push(item);
                                }
                            } else {
                                console.log('Item failed LinkedIn Member check or missing text');
                            }
                        } else {
                            console.log('Item missing title or subtitle properties');
                        }
                    }

                    console.log('Total connections found so far:', audConnectionItems.length);
                    console.log('Target connections:', parseInt($('#afs-total').val()));

                    if (audConnectionItems.length < parseInt($('#afs-total').val())) {
                        getConnectParams.startPosition = parseInt(getConnectParams.startPosition) + 11;
                        $('#afs-startPosition').val(getConnectParams.startPosition);
                        
                        // Update status with stop button (CSP-compliant)
                        $('#afc-displayNewAudienceStatus').html(
                            `<i class="fas fa-spinner fa-spin"></i> Found ${audConnectionItems.length} connections, continuing search...<br>
                             <button id="stopSearchBtn" class="btn btn-sm btn-warning mt-2">
                                 <i class="fas fa-stop"></i> Stop Search
                             </button>`
                        );
                        
                        // Add event listener for stop button
                        $('#stopSearchBtn').on('click', function() {
                            stopAudienceSearch();
                        });
                        
                        console.log('Continuing search from position:', getConnectParams.startPosition);
                        
                        // Continue with next batch using timeout
                        window.searchTimeout = setTimeout(() => {
                            if (window.searchActive) {
                                window.getConnectionsLooper();
                            }
                        }, LINKEDIN_API_CONFIG.maxDelay);
                    } else {
                        // Found enough connections
                        console.log('Found enough connections, stopping search');
                        window.searchActive = false;
                        if (window.searchTimeout) {
                            clearTimeout(window.searchTimeout);
                            window.searchTimeout = null;
                        }
                        
                        $('#afc-displayNewAudienceStatus').html(
                            `<i class="fas fa-check"></i> Found ${audConnectionItems.length} connections!`
                        );
                        // Use Phantom version if using PhantomBuster search export
                        if (getConnectParams.usePhantomSearch) {
                            afcSetPhantomConnectionData(totalResultCount);
                        } else {
                            afcSetConnectionData(totalResultCount);
                        }
                    }

                } else if (((elements.length > 1 && (!elements[1].items || !elements[1].items.length)) || 
                           (elements.length == 1 && (!elements[0].items || !elements[0].items.length))) && 
                           !audConnectionItems.length) {
                    console.log('No items found in elements and no connections collected yet');
                    window.searchActive = false;
                    $('#afc-displayNewAudienceStatus').html(
                        '<i class="fas fa-info-circle"></i> No results found, change your search criteria and try again!'
                    );
                    $('.newAudienceAction').attr('disabled', false);

                } else if (((elements.length > 1 && (!elements[1].items || !elements[1].items.length)) || 
                           (elements.length == 1 && (!elements[0].items || !elements[0].items.length))) && 
                           audConnectionItems.length) {
                    console.log('No more items but we have some connections');
                    window.searchActive = false;
                    if (window.searchTimeout) {
                        clearTimeout(window.searchTimeout);
                        window.searchTimeout = null;
                    }
                    $('#afc-displayNewAudienceStatus').html(
                        `<i class="fas fa-check"></i> Found ${audConnectionItems.length} connections!`
                    );
                    // Use Phantom version if using PhantomBuster search export
                    if (getConnectParams.usePhantomSearch) {
                        afcSetPhantomConnectionData(totalResultCount);
                    } else {
                        afcSetConnectionData(totalResultCount);
                    }
                }

            } else if (audConnectionItems.length) {
                console.log('No elements but we have connections from previous calls');
                window.searchActive = false;
                if (window.searchTimeout) {
                    clearTimeout(window.searchTimeout);
                    window.searchTimeout = null;
                }
                $('#afc-displayNewAudienceStatus').html(
                    `<i class="fas fa-check"></i> Found ${audConnectionItems.length} connections!`
                );
                // Use Phantom version if using PhantomBuster search export
                if (getConnectParams.usePhantomSearch) {
                    afcSetPhantomConnectionData(totalResultCount);
                } else {
                    afcSetConnectionData(totalResultCount);
                }
            } else {
                console.log('No elements found and no connections collected');
                window.searchActive = false;
                $('#afc-displayNewAudienceStatus').html(
                    '<i class="fas fa-info-circle"></i> No results found, change your search criteria and try again!'
                );
                $('.newAudienceAction').attr('disabled', false);
            }
            
            // Reset retry count on success
            retryCount = 0;
            
        } catch (error) {
            console.error('Error in getConnectionsLooper:', error);
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying connections fetch (${retryCount}/${maxRetries})...`);
                
                $('#afc-displayNewAudienceStatus').html(
                    `<i class="fas fa-spinner fa-spin"></i> Retrying... (${retryCount}/${maxRetries})`
                );
                
                // Wait longer before retry
                window.searchTimeout = setTimeout(() => {
                    if (window.searchActive) {
                        window.getConnectionsLooper();
                    }
                }, LINKEDIN_API_CONFIG.retryDelay * retryCount);
            } else {
                window.searchActive = false;
                handleAudienceCreationError(error, 'fsGetConnections');
            }
        }
    };

    // Start the connection fetching process
    window.getConnectionsLooper();
};

$('body').on('click','.nav-link',function(){
    setTimeout(function(){
        if($('#nav-link-network').hasClass('active')){
            $('.nfn').hide()
            $('#afs-connSecondCheck').prop('checked', false);
        }else{
            $('#afs-connSecondCheck').prop('checked', true);
            $('.nfn').show()
        }
    }, 1000)
})
$('#afs-liked-none').prop('checked', true)
if($('#afs-liked-none').prop('checked') == true ){
    $('.afs-user-like').val('').hide()
}
$('#afs-commented-none').prop('checked', true)
if($('#afs-commented-none').prop('checked') == true ){
    $('.afs-user-commented').val('').hide()
}
$('.afs-liked-check').change(function(){
    if($('#afs-liked-none').prop('checked') == true ){
        $('.afs-user-like').val('').hide()
    }else if($('#afs-liked-post').prop('checked') == true){
        $('#afs-liked-postid').val('').show()
        $('#afs-liked-articleid').val('').hide()
        $('#afs-liked-videoid').val('').hide()
        $('.afs-commented-check').prop('checked', false)
        $('.afs-user-commented').val('').hide()
    }else if($('#afs-liked-article').prop('checked') == true){
        $('#afs-liked-postid').val('').hide()
        $('#afs-liked-articleid').val('').show()
        $('#afs-liked-videoid').val('').hide()
        $('.afs-commented-check').prop('checked', false)
        $('.afs-user-commented').val('').hide()
    }else if($('#afs-liked-video').prop('checked') == true){
        $('#afs-liked-postid').val('').hide()
        $('#afs-liked-articleid').val('').hide()
        $('#afs-liked-videoid').val('').show()
        $('.afs-commented-check').prop('checked', false)
        $('.afs-user-commented').val('').hide()
    }else{
        $('.afs-user-like').val('').hide()
    }
})
$('.afs-commented-check').change(function(){
    if($('#afs-commented-none').prop('checked') == true){
        $('.afs-user-commented').val('').hide()
    }else if($('#afs-commented-post').prop('checked') == true){
        $('#afs-commented-postid').val('').show()
        $('#afs-commented-articleid').val('').hide()
        $('#afs-commented-videoid').val('').hide()
        $('.afs-liked-check').prop('checked', false)
        $('.afs-user-like').val('').hide()
    }else if($('#afs-commented-article').prop('checked') == true){
        $('#afs-commented-postid').val('').hide()
        $('#afs-commented-articleid').val('').show()
        $('#afs-commented-videoid').val('').hide()
        $('.afs-liked-check').prop('checked', false)
        $('.afs-user-like').val('').hide()
    }else if($('#afs-commented-video').prop('checked') == true){
        $('#afs-commented-postid').val('').hide()
        $('#afs-commented-articleid').val('').hide()
        $('#afs-commented-videoid').val('').show()
        $('.afs-liked-check').prop('checked', false)
        $('.afs-user-like').val('').hide()
    }else{
        $('.afs-user-commented').val('').hide()
    }
})

let getConnectParams = {}
let audConnectionItems = [], connectionEmails = []
let queryParams = ''

/**
 * Trigger audience creation
 */
$('.newAudienceAction').click(function(){
    audConnectionItems = [];
    queryParams = '';
    getConnectParams = {};

    var afcStartP = $('#afs-startPosition'),
        afcTotal = $('#afs-total'),
        afcDelay = $('#afs-delayTime'),
        afcAudienceName = $('#audience-name');
    var afcFieldList = [afcDelay,afcTotal,afcAudienceName];
    var audienceType = '';

    // field validation
    if(afcTotal.val()=='' || afcDelay.val()=='' || afcAudienceName.val()==''){
        for(let i=0; i<afcFieldList.length; i++){
            if(afcFieldList[i].val() == ''){
                $('#afc-error-notice').html(`${afcFieldList[i].data('name')} field cannot be empty`)
            }
        }
    }else if(afcDelay.val() < 30){
        $('#afc-error-notice').html(`Minimum delay time 30.`);
    }else if(afcTotal.val() > 100){
        $('#afc-error-notice').html(`Max total per instance is 100.`);
    }else{
        $('#afc-error-notice').html('')

        afcTotal = afcTotal.val() < 10 ? 10 : afcTotal.val()
        afcStartP.val() == '' ? afcStartP.val(0) : afcStartP.val()

        if($('#nav-link-network').hasClass('active')){
            if($('#afs-connFirstCheck').prop('checked') == false){
                $('#afs-connFirstCheck').prop('checked', true)
            }
            $('#afc-displayNewAudienceStatus').empty()
            $('.newAudience-notice').show()
            $('#afc-displayNewAudienceStatus').html('Scanning. Please wait...')

            audienceType = 'myNetwork';
            $(this).attr('disabled', true);

            queryParams += `network:List(F),`

            query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            getConnectParams = {
                queryParams: query,
                totalCount: afcTotal,
                startPosition: afcStartP.val(),
                delayTime: afcDelay.val(),
                audienceName: afcAudienceName.val(),
                audienceType: audienceType,
                positiveKeywords: $('#afs-positiveKeywords').val(),
                negativeKeywords: $('#afs-negativeKeywords').val(),
            }
            fsGetConnections()
            
        }else if($('#nav-link-fsearch').hasClass('active')){
            $('#afc-displayNewAudienceStatus').empty()
            $('.newAudience-notice').show()
            $('#afc-displayNewAudienceStatus').html('Scanning. Please wait...')

            var fsSchoolId = '',
                fsConnectionId = '',
                fsRegionId = '',
                fsCurrCompId = '',
                fsPastCompId = '',
                fsIndustryId = '',
                fsLangId='',
                fsConnDegree = '';

            // check if value exists in accordion list dropdown
            if($('#afs-selectedConnectOf li').length){
                queryParams += setFIlterQueryParams('#afs-selectedConnectOf','connectionid','connectionOf')
            }
            if($('#afs-selectedLocation li').length){
                queryParams += setFIlterQueryParams('#afs-selectedLocation','regionid','geoUrn')
            }
            if($('#afs-selectedSchool li').length){
                queryParams += setFIlterQueryParams('#afs-selectedSchool','schoolid','schoolFilter')
            }
            if($('#afs-selectedCurrComp li').length){
                queryParams += setFIlterQueryParams('#afs-selectedCurrComp','currcompid','currentCompany')
            }
            if($('#afs-selectedPastComp li').length){
                queryParams += setFIlterQueryParams('#afs-selectedPastComp','pastcompid','pastCompany')
            }
            if($('#afs-selectedIndustry li').length){
                queryParams += setFIlterQueryParams('#afs-selectedIndustry','industryid','industry')
            }
            if($('#afs-selectedLanguage li').length){
                queryParams += setFIlterQueryParams('#afs-selectedLanguage','langcode','profileLanguage')
            }

            // set degree network to array and pass on
            var afsDegreeArr = []; 
            $('.afs-conn-degree input').each(function(index) {
                if($(this).prop('checked') == true){
                    afsDegreeArr.push($(this).val())
                }
            })
            for (var i = 0; i < afsDegreeArr.length; i++) {
                if(i == (afsDegreeArr.length -1)){
                    fsConnDegree += afsDegreeArr[i]
                }else{
                    fsConnDegree += afsDegreeArr[i] +','
                }
            }
            if(afsDegreeArr.length)
                queryParams += `network:List(${fsConnDegree}),`
            else
                queryParams += `network:List(S,O),`

            if($('#afs-firstName').val())
                queryParams += setFIlterQueryParamsFreeText('#afs-firstName','firstName')
            if($('#afs-lastName').val())
                queryParams += setFIlterQueryParamsFreeText('#afs-lastName','lastName')
            if($('#afs-school').val())
                queryParams += setFIlterQueryParamsFreeText('#afs-school','schoolFreetext')
            if($('#afs-title').val())
                queryParams += setFIlterQueryParamsFreeText('#afs-title','title')
            if($('#afs-company').val())
                queryParams += setFIlterQueryParamsFreeText('#afs-company','company')

            audienceType = 'fSearch';
            $(this).attr('disabled', true);

            const keywordTerm = ($('#afs-search-term').val() || '').trim();
            const keywordFallback = ($('#afs-positiveKeywords').val() || '').trim();
            const chosenKeywords = keywordTerm || keywordFallback;

            // Map connection degree checkboxes to Phantom-friendly values
            const degreeMap = {
                'F': '1',
                'S': '2',
                'O': '3+'
            };
            const mappedDegrees = afsDegreeArr.length
                ? afsDegreeArr.map(d => degreeMap[d] || d)
                : [];

            // Build minimal LinkedIn search URL - only keywords and network (connection degrees)
            // All other filters (location, company, industry, school, etc.) are handled client-side
            const buildLinkedInSearchUrl = () => {
                if (!chosenKeywords) return ''; // No keywords, can't build URL
                
                const params = [];
                
                // Keywords (required)
                params.push(`keywords=${encodeURIComponent(chosenKeywords)}`);
                
                // Add origin parameter (LinkedIn uses this for faceted search)
                params.push(`origin=FACETED_SEARCH`);
                
                // Network (connection degrees) - LinkedIn uses JSON array format
                const networkCodes = afsDegreeArr.length ? afsDegreeArr : ['S','O'];
                params.push(`network=${encodeURIComponent(JSON.stringify(networkCodes))}`);
                
                // Add location (geoUrn) - LinkedIn uses JSON array format with string IDs
                if ($('#afs-selectedLocation li').length > 0) {
                    const geoUrns = [];
                    $('#afs-selectedLocation li').each(function() {
                        const geoUrn = $(this).data('regionid');
                        if (geoUrn) {
                            geoUrns.push(String(geoUrn)); // Ensure it's a string
                        }
                    });
                    if (geoUrns.length > 0) {
                        params.push(`geoUrn=${encodeURIComponent(JSON.stringify(geoUrns))}`);
                        console.log('🔍 Location filter added to URL:', { geoUrns });
                    }
                }
                
                // Add current company - LinkedIn uses JSON array format with string IDs
                if ($('#afs-selectedCurrComp li').length > 0) {
                    const companies = [];
                    $('#afs-selectedCurrComp li').each(function() {
                        const companyId = $(this).data('currcompid');
                        if (companyId) {
                            companies.push(String(companyId)); // Ensure it's a string
                        }
                    });
                    if (companies.length > 0) {
                        params.push(`currentCompany=${encodeURIComponent(JSON.stringify(companies))}`);
                        console.log('🔍 Current company filter added to URL:', { companies });
                    }
                }
                
                // Add past company - LinkedIn uses JSON array format with string IDs
                if ($('#afs-selectedPastComp li').length > 0) {
                    const pastCompanies = [];
                    $('#afs-selectedPastComp li').each(function() {
                        const pastCompanyId = $(this).data('pastcompid');
                        if (pastCompanyId) {
                            pastCompanies.push(String(pastCompanyId)); // Ensure it's a string
                        }
                    });
                    if (pastCompanies.length > 0) {
                        params.push(`pastCompany=${encodeURIComponent(JSON.stringify(pastCompanies))}`);
                        console.log('🔍 Past company filter added to URL:', { pastCompanies });
                    }
                }
                
                // Add industry - LinkedIn uses JSON array format with string IDs
                if ($('#afs-selectedIndustry li').length > 0) {
                    const industries = [];
                    $('#afs-selectedIndustry li').each(function() {
                        const industryId = $(this).data('industryid');
                        if (industryId) {
                            industries.push(String(industryId)); // Ensure it's a string
                        }
                    });
                    if (industries.length > 0) {
                        params.push(`industry=${encodeURIComponent(JSON.stringify(industries))}`);
                        console.log('🔍 Industry filter added to URL:', { industries });
                    }
                }
                
                // Add school - LinkedIn uses JSON array format with string IDs
                if ($('#afs-selectedSchool li').length > 0) {
                    const schools = [];
                    $('#afs-selectedSchool li').each(function() {
                        const schoolId = $(this).data('schoolid');
                        if (schoolId) {
                            schools.push(String(schoolId)); // Ensure it's a string
                        }
                    });
                    if (schools.length > 0) {
                        params.push(`schoolFilter=${encodeURIComponent(JSON.stringify(schools))}`);
                        console.log('🔍 School filter added to URL:', { schools });
                    }
                }
                
                // Add profile language - LinkedIn uses JSON array format
                if ($('#afs-selectedLanguage li').length > 0) {
                    const languages = [];
                    $('#afs-selectedLanguage li').each(function() {
                        const lang = $(this).data('langcode');
                        if (lang) {
                            languages.push(String(lang)); // Ensure it's a string
                        }
                    });
                    if (languages.length > 0) {
                        params.push(`profileLanguage=${encodeURIComponent(JSON.stringify(languages))}`);
                        console.log('🔍 Profile language filter added to URL:', { languages });
                    }
                }
                
                // Add firstName - LinkedIn supports this as a URL parameter
                if ($('#afs-firstName').val() && $('#afs-firstName').val().trim()) {
                    params.push(`firstName=${encodeURIComponent($('#afs-firstName').val().trim())}`);
                    console.log('🔍 First name filter added to URL:', { firstName: $('#afs-firstName').val().trim() });
                }
                
                // Add lastName - LinkedIn supports this as a URL parameter
                if ($('#afs-lastName').val() && $('#afs-lastName').val().trim()) {
                    params.push(`lastName=${encodeURIComponent($('#afs-lastName').val().trim())}`);
                    console.log('🔍 Last name filter added to URL:', { lastName: $('#afs-lastName').val().trim() });
                }
                
                // Add title - LinkedIn supports this as a URL parameter
                if ($('#afs-title').val() && $('#afs-title').val().trim()) {
                    params.push(`title=${encodeURIComponent($('#afs-title').val().trim())}`);
                    console.log('🔍 Title filter added to URL:', { title: $('#afs-title').val().trim() });
                }
                
                // Note: Company free text (#afs-company) is typically handled via keywords or currentCompany filter
                // School free text (#afs-school) is typically handled via schoolFilter with IDs
                
                const finalUrl = `https://www.linkedin.com/search/results/people/?${params.join('&')}`;
                console.log('🔍 Complete LinkedIn search URL with filters:', finalUrl);
                return finalUrl;
            };
            
            const searchUrl = buildLinkedInSearchUrl();

            if($('#afs-search-term').val())
                query = `(keywords:${encodeURIComponent($('#afs-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            // Collect filter values for client-side filtering (since LinkedIn URLs don't support all filters)
            const filterValues = {
                locations: [],
                currentCompanies: [],
                pastCompanies: [],
                industries: [],
                schools: [],
                languages: []
            };
            
            // Extract location filters
            $('#afs-selectedLocation li').each(function() {
                const name = $(this).data('name') || $(this).text().trim();
                const regionId = $(this).data('regionid');
                if (name) {
                    filterValues.locations.push({ name, id: regionId });
                    console.log('📍 Stored location filter:', { name, id: regionId });
                }
            });
            
            // Extract current company filters
            $('#afs-selectedCurrComp li').each(function() {
                const name = $(this).data('name') || $(this).text().trim();
                const companyId = $(this).data('currcompid');
                if (name) filterValues.currentCompanies.push({ name, id: companyId });
            });
            
            // Extract past company filters
            $('#afs-selectedPastComp li').each(function() {
                const name = $(this).data('name') || $(this).text().trim();
                const companyId = $(this).data('pastcompid');
                if (name) filterValues.pastCompanies.push({ name, id: companyId });
            });
            
            // Extract industry filters
            $('#afs-selectedIndustry li').each(function() {
                const name = $(this).data('name') || $(this).text().trim();
                const industryId = $(this).data('industryid');
                if (name) filterValues.industries.push({ name, id: industryId });
            });
            
            // Extract school filters
            $('#afs-selectedSchool li').each(function() {
                const name = $(this).data('name') || $(this).text().trim();
                const schoolId = $(this).data('schoolid');
                if (name) filterValues.schools.push({ name, id: schoolId });
            });
            
            // Extract language filters
            $('#afs-selectedLanguage li').each(function() {
                const name = $(this).data('name') || $(this).text().trim();
                const langCode = $(this).data('langcode');
                if (name) filterValues.languages.push({ name, code: langCode });
            });

            getConnectParams = {
                queryParams: query,
                totalCount: afcTotal,
                startPosition: afcStartP.val(),
                delayTime: afcDelay.val(),
                audienceName: afcAudienceName.val(),
                audienceType: audienceType,
                positiveKeywords: $('#afs-positiveKeywords').val(),
                negativeKeywords: $('#afs-negativeKeywords').val(),
                usePhantomSearch: true,
                searchUrl: searchUrl, // Complete URL with all filters (or empty if no keywords)
                keywords: chosenKeywords, // Keywords for PhantomBuster (extracted from URL or provided)
                connection_degrees: mappedDegrees,
                filterValues: filterValues // Store filter values for client-side filtering
            }
            fsGetConnections() 
        }else if($('#nav-link-fpost').hasClass('active')) {
            // validate that post ID fields
            var afcPostIdComment = $('#afs-commented-postid');
            var afcArticleIdComment = $('#afs-commented-articleid');
            var afcVideoIdComment = $('#afs-commented-videoid');
            var afcPostIdLiked = $('#afs-liked-postid');
            var afcArticleIdLiked = $('#afs-liked-articleid');
            var afcVideoIdLiked = $('#afs-liked-videoid');
            var afcPostId;
            var validateFields = [afcPostIdComment,afcArticleIdComment,afcVideoIdComment,afcPostIdLiked,afcArticleIdLiked,afcVideoIdLiked]

            let countInvalidFields = 0;
            for (let s=0; s<validateFields.length; s++){
                if (validateFields[s].val() != '')
                    countInvalidFields += 1
            }
            if (countInvalidFields == 0){
                $('#afc-error-notice').html(`Please enter the relevant ID or change user collection method...`);
            }else{
                $('#afc-error-notice').html('')
                $('#afc-displayNewAudienceStatus').empty()
                $('.newAudience-notice').show()
                $('#afc-displayNewAudienceStatus').html('Scanning. Please wait...')
                
                audienceType = 'fPost';
                $(this).attr('disabled', true);

                if (afcPostIdLiked.val() != ''){
                    afcPostId = buildLinkedInPostUrl('activity', afcPostIdLiked.val());
                    afcGetLikedProfiles(afcPostId,afcTotal,afcDelay.val(), afcAudienceName.val(),audienceType);
                }else if (afcArticleIdLiked.val() != ''){
                    afcPostId = buildLinkedInPostUrl('article', afcArticleIdLiked.val());
                    afcGetLikedProfiles(afcPostId,afcTotal,afcDelay.val(),afcAudienceName.val(),audienceType);
                }else if (afcVideoIdLiked.val() != ''){
                    afcPostId = buildLinkedInPostUrl('ugcPost', afcVideoIdLiked.val());
                    afcGetLikedProfiles(afcPostId,afcTotal,afcDelay.val(),afcAudienceName.val(),audienceType);
                }else if (afcPostIdComment.val() != ''){
                    afcPostId = 'activity%3A'+afcPostIdComment.val();

                    afcGetCommentProfiles(afcPostId,afcTotal,afcStartP.val(),afcDelay.val(),afcAudienceName.val(),audienceType);
                }else if (afcArticleIdComment.val() != ''){
                    afcPostId = 'article%3A'+afcArticleIdComment.val();

                    afcGetCommentProfiles(afcPostId,afcTotal,afcStartP.val(),afcDelay.val(),afcAudienceName.val(),audienceType);
                }else if (afcVideoIdComment.val() != ''){
                    afcPostId = 'ugcPost%3A'+afcVideoIdComment.val();

                    afcGetCommentProfiles(afcPostId,afcTotal,afcStartP.val(),afcDelay.val(),afcAudienceName.val(),audienceType);
                }
            }
        }else if($('#nav-link-fevent').hasClass('active')) {
            if ($('#afs-eventId').val() == ''){
                $('#afc-error-notice').html(`Event ID field is required`);
            }else{
                $('#afc-displayNewAudienceStatus').empty()
                $('.newAudience-notice').show()
                $('#afc-displayNewAudienceStatus').html('Scanning. Please wait...')
                // set degree network to array and pass on
                let afsDegreeArr = [], fsConnDegree = '';

                $('.afs-conn-degree input').each(function(index){
                    if($(this).prop('checked') == true){
                        afsDegreeArr.push($(this).val())
                    }
                })
                for (var i = 0; i < afsDegreeArr.length; i++) {
                    if(i == (afsDegreeArr.length -1)){
                        fsConnDegree += afsDegreeArr[i]
                    }else{
                        fsConnDegree += afsDegreeArr[i] +','
                    }
                }
                if(afsDegreeArr.length)
                    queryParams += `network:List(${fsConnDegree}),`
                else
                    queryParams += `network:List(S,O),`

                queryParams += `eventAttending:List(${$('#afs-eventId').val()}),`

                audienceType = 'fEvent';
                $(this).attr('disabled', true);

                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

                getConnectParams = {
                    queryParams: query,
                    totalCount: afcTotal,
                    startPosition: afcStartP.val(),
                    delayTime: afcDelay.val(),
                    audienceName: afcAudienceName.val(),
                    audienceType: audienceType,
                    positiveKeywords: $('#afs-positiveKeywords').val(),
                    negativeKeywords: $('#afs-negativeKeywords').val(),
                    eventId: $('#afs-eventId').val()
                }
                afcEventAttendees()
            }
            
        }else if($('#nav-link-fgroup').hasClass('active')) {
            if ($('#afs-groupId').val() == '') {
                $('#afc-error-notice').html(`Group ID field is required`);
            }else {
                let afsDegreeArr = [], fsConnDegree = '';

                $('.afs-conn-degree input').each(function(index){
                    if($(this).prop('checked') == true){
                        afsDegreeArr.push($(this).val())
                    }
                })
                for (var i = 0; i < afsDegreeArr.length; i++) {
                    if(i == (afsDegreeArr.length -1)){
                        fsConnDegree += afsDegreeArr[i]
                    }else{
                        fsConnDegree += afsDegreeArr[i] +','
                    }
                }
                if(afsDegreeArr.length)
                    queryParams += `network:List(${fsConnDegree}),`
                else
                    queryParams += `network:List(S,O),`

                queryParams += `groupUrn:List(${$('#afs-groupId').val()}),membershipStatuses:List(OWNER,MANAGER,MEMBER),`

                audienceType = 'fGroup';
                $(this).attr('disabled', true);

                $('#afc-displayNewAudienceStatus').empty()
                $('.newAudience-notice').show()
                $('#afc-displayNewAudienceStatus').html('Scanning. Please wait...')

                // query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

                getConnectParams = {
                    // queryParams: query,
                    totalCount: afcTotal,
                    startPosition: afcStartP.val(),
                    delayTime: afcDelay.val(),
                    audienceName: afcAudienceName.val(),
                    audienceType: audienceType,
                    positiveKeywords: $('#afs-positiveKeywords').val(),
                    negativeKeywords: $('#afs-negativeKeywords').val(),
                    groupId: $('#afs-groupId').val()
                }
                afcGroupMembers()
            }
        }
    }
})

const afcMyNetworks = (afcAudienceName, afcTotal, afcStartP, afcDelay, audienceType) => {
    var con = [];
    var connectionIds = [];
    var conArr = [];
    var seiveConnArr = [];
    var afcStart = afcStartP;

    $('.newAudience-notice').show();
    $('#afc-displayNewAudienceStatus').html('Scanning connections...')

    var lopper = () => {
        seiveConnArr = seiveConnArr.filter(function( element ) {
            return element !== undefined;
        });
        setTimeout(async function(){
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', acceptVnd);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;AlO5aiwcRCuTPvabGm1b5g==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2420","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-5&count=${afcTotal}&q=search&sortType=RECENTLY_ADDED&start=${afcStart}`,
                success: function(data){
                    var res = {'data': data}
                    if(res['data'].data.elements.length > 0){
                        elPath = res['data'].data.elements
                        $.each(elPath,function(i, item){ 
                            if(item.hasOwnProperty('*connectedMemberResolutionResult')){
                                if (item.connectedMember.includes('urn:li:fsd_profile:')){
                                    let connectionId = item.connectedMember.replace('urn:li:fsd_profile:','')
                                    connectionIds.push(connectionId);
                                }
                            }
                        })
                        var audienceId = Math.floor(Math.random()*90000) + 10000;
                        var profileInfo = async () => {
                            for (let i=0; i<connectionIds.length; i++){
                                await $.ajax({
                                    method: 'get',
                                    beforeSend: function(request) {
                                        request.setRequestHeader('csrf-token', jsession);
                                        request.setRequestHeader('accept', acceptVnd);
                                        request.setRequestHeader('x-li-lang', xLiLang);
                                        request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;4P1/aULaTuCbCV/cUdv3Ww==');
                                        request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2420","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                                        request.setRequestHeader('x-requested-with', 'XMLHttpRequest');
                                        request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                                    },
                                    url: `${voyagerApi}/identity/profiles/${connectionIds[i]}`,
                                    success: function(data){
                                        let res = {'data': data}
                                        if (res['data'].included.length > 0){
                                            let dataPath = res['data'].data;
                                            let includePath = res['data'].included[0];
                                            let targetIdd;
                                            if(includePath.objectUrn.includes('urn:li:member:')){
                                                targetIdd = includePath.objectUrn.replace('urn:li:member:','') 
                                            }
                                            con.push({
                                                audienceId: audienceId,
                                                firstName: dataPath.firstName,
                                                lastName: dataPath.lastName,
                                                name: dataPath.firstName+' '+dataPath.lastName,
                                                title: dataPath.headline,
                                                locationName: dataPath.locationName,
                                                publicIdentifier: includePath.publicIdentifier, 
                                                connectionId: connectionIds[i],
                                                totalResultCount: null,
                                                memberUrn: includePath.objectUrn, 
                                                networkDistance: null,
                                                trackingId: includePath.trackingId, 
                                                navigationUrl: `https://www.linkedin.com/in/${includePath.publicIdentifier}`, 
                                                targetId: parseInt(targetIdd)
                                            })
                                        }
                                    },
                                    error: function(error){
                                        console.log(error)
                                        $('.newAudienceAction').attr('disabled', false)
                                        $('#afc-displayNewAudienceStatus').html('No connection found.');
                                    }
                                })
                            }
                            if($('#afs-positiveKeywords').val() !=''){
                                // +ive keywords use case
                                var positiveKeywords = $('#afs-positiveKeywords').val().toLowerCase().split(',');
                                $.each(con, function(i, item){
                                    if(item.title != null){
                                        for(var s=0; s<positiveKeywords.length; s++){
                                            if(item.name.toLowerCase().includes(positiveKeywords[s]) || item.title.toLowerCase().includes(positiveKeywords[s])){
                                                conArr.push(item)
                                            }
                                        }
                                    }
                                })
                                con = [];
                                if(conArr.length > 0){
                                    // remove duplicate 
                                    var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectionId===v.connectionId))===i); 
                                    // seive count of data to user total
                                    totalUserAudience = parseInt($('#afs-total').val()) - seiveConnArr.length
                                    if(filterConArr.length > totalUserAudience){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // pass to memberBadges endpoint because it meets criteria in keyword and total
                                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                                    }else if(seiveConnArr.length < parseInt($('#afs-total').val())){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        let start = parseInt($('#afs-startPosition').val());
                                        $('#afs-startPosition').val(start +10);
                                        afcStart = $('#afs-startPosition').val();
                                        lopper()
                                    }
                                }else if(conArr.length == 0 && seiveConnArr.length < parseInt($('#afs-total').val())){
                                    let start = parseInt($('#afs-startPosition').val());
                                    $('#afs-startPosition').val(start +10);
                                    afcStart = $('#afs-startPosition').val();
                                    lopper()
                                }else{
                                    let start = parseInt($('#afs-startPosition').val());
                                    $('#afs-startPosition').val(start +10);
                                    afcStart = $('#afs-startPosition').val();
                                    lopper()
                                }
                            }else if($('#afs-negativeKeywords').val() !=''){
                                // -ive keywords use case
                                var negativeKeywords = $('#afs-negativeKeywords').val().toLowerCase().split(',');
                                $.each(con, function(i, item){
                                    if(item.title != null || item.title != '' ){
                                        for(var s=0; s<negativeKeywords.length; s++){
                                            if(!item.name.toLowerCase().includes(negativeKeywords[s]) || !item.title.toLowerCase().includes(negativeKeywords[s])){
                                                conArr.push(item)
                                            }
                                        }
                                    }
                                })
                                con = [];
                                if(conArr.length > 0){
                                    // remove duplicate 
                                    var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectionId===v.connectionId))===i); 
                                    // seive count of data to user total
                                    totalUserAudience = parseInt($('#afs-total').val()) - seiveConnArr.length
                                    if(filterConArr.length > totalUserAudience){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // pass to memberBadges endpoint because it meets criteria in keyword and total
                                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                                    }else if(seiveConnArr.length < parseInt($('#afs-total').val())){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        let start = parseInt($('#afs-startPosition').val());
                                        $('#afs-startPosition').val(start +10);
                                        afcStartP = $('#afs-startPosition').val();
                                        lopper()
                                    }
                                }else if(conArr.length == 0 && seiveConnArr.length < parseInt($('#afs-total').val())){
                                    let start = parseInt($('#afs-startPosition').val());
                                    $('#afs-startPosition').val(start +10);
                                    afcStartP = $('#afs-startPosition').val();
                                    lopper()
                                }else{
                                    let start = parseInt($('#afs-startPosition').val());
                                    $('#afs-startPosition').val(start +10);
                                    afcStartP = $('#afs-startPosition').val();
                                    lopper()
                                }
                            }else{
                                // no +ive / -ive keyword use case
                                // seive count of data to user total
                                if(con.length > parseInt($('#afs-total').val())){
                                    for(var s = 0; s < parseInt($('#afs-total').val()); s++){
                                        seiveConnArr.push(con[s])
                                    }
                                }else{ seiveConnArr = con.slice(); }
                                // pass to memberBadges endpoint
                                memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                            }
                        }
                        profileInfo()
                    }else if(res['data'].data.elements.length == 0 && seiveConnArr.length > 0){
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').html('Found '+seiveConnArr.length+' <br> Adding '+seiveConnArr.length+' to list')
                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                    }else{
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').empty()
                        $('#afc-displayNewAudienceStatus').html('No match found!')
                        $('.newAudienceAction').attr('disabled', false)
                        return false;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.newAudienceAction').attr('disabled', false)
                    $('#afc-displayNewAudienceStatus').html('No connection found.');
                }
            })
        }, afcDelay * 1000)
    }
    lopper()
}

const afcGetLikedProfilesLegacy = (afcPostId,afcTotal,afcStartP,afcDelay,afcAudienceName,audienceType) => {
    var con = [];
    var degree = [];
    var conArr = [];
    var seiveConnArr = [];
    var afcStart = afcStartP;
    var newposition = 0;
    var totalSearchCount = 0;
    var totalS_userSpnT = 0;

    $('.newAudience-notice').show();
    $('#afc-displayNewAudienceStatus').html('Scanning post...')

    var alpLooper = () => { 
        seiveConnArr = seiveConnArr.filter(function( element ) {
            return element !== undefined;
        });
        setTimeout(async function(){
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', accept);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;0t+j1HGNRPeL1YhwxK4WcA==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2244","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                }, 
                url: `${voyagerApi}/feed/likes?count=${afcTotal}&objectId=${encodeURIComponent(afcPostId)}&q=likes&start=${afcStart}`,
                success: function(data){
                    var res = {'data': data};
                    if(res['data'].elements.length > 0){
                        elementsPath = res['data'].elements;
                        totalResult = res['data'].paging.total;
                        // generate random id for a set of audience
                        var audienceId = Math.floor(Math.random()*90000) + 10000;
                        $.each(elementsPath, function(i, item){
                            itemPath = item.actor['com.linkedin.voyager.feed.MemberActor'];
                            var netDistance = itemPath.distance.value.split("_")[1];
                            var targetIdd;
                            if(itemPath.miniProfile.objectUrn.includes('urn:li:member:')){
                                targetIdd = itemPath.miniProfile.objectUrn.replace('urn:li:member:','') 
                            }
                            if(itemPath.miniProfile.entityUrn.includes('urn:li:fs_miniProfile:')) {
                                var connectionId = itemPath.miniProfile.entityUrn.replace('urn:li:fs_miniProfile:','')
                                con.push({
                                    audienceId: audienceId,
                                    firstName: itemPath.miniProfile.firstName,
                                    lastName: itemPath.miniProfile.lastName,
                                    name: `${itemPath.miniProfile.firstName} ${itemPath.miniProfile.lastName}`,
                                    title: itemPath.miniProfile.hasOwnProperty('occupation') ? itemPath.miniProfile.occupation : '',
                                    locationName: '',
                                    publicIdentifier: itemPath.miniProfile.publicIdentifier, 
                                    connectionId: connectionId,
                                    totalResultCount: totalResult,
                                    memberUrn: itemPath.miniProfile.objectUrn, 
                                    networkDistance: parseInt(netDistance),
                                    trackingId: itemPath.miniProfile.trackingId, 
                                    navigationUrl: `https://www.linkedin.com/in/${itemPath.miniProfile.publicIdentifier}`, 
                                    targetId: parseInt(targetIdd),
                                    distanceCheck: itemPath.distance.value
                                })	
                            }
                        })
                        // check for network degree
                        $.each(con, function(i, item){
                            if ($('#afs-connFirstCheck').prop('checked') == true && item.distanceCheck == 'DISTANCE_1'){
                                degree.push(item)
                            }
                            if ($('#afs-connSecondCheck').prop('checked') == true && item.distanceCheck == 'DISTANCE_2'){
                                degree.push(item)
                            }
                            if ($('#afs-connThirdCheck').prop('checked') == true && (item.distanceCheck == 'DISTANCE_3' || item.distanceCheck == 'OUT_OF_NETWORK')){
                                degree.push(item)
                            }
                        })
                        if (degree.length > 0){
                            // +ive keywords use case
                            if($('#afs-positiveKeywords').val() !=''){
                                var positiveKeywords = $('#afs-positiveKeywords').val().toLowerCase().split(',');
                                $.each(degree, function(i, item){
                                    if(item.title != ''){
                                        for(var s=0; s<positiveKeywords.length; s++){
                                            if(item.name.toLowerCase().includes(positiveKeywords[s]) || item.title.toLowerCase().includes(positiveKeywords[s])){
                                                conArr.push(item)
                                            }
                                        }
                                    }
                                })
                                if(conArr.length > 0){ 
                                    // remove duplicate 
                                    var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectionId===v.connectionId))===i); 
                                    // seive count of data to user total
                                    totalUserAudience = parseInt($('#afs-total').val()) - seiveConnArr.length
                                    if(filterConArr.length > totalUserAudience){
                                        for(let s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // pass to memberBadges endpoint because it meets criteria in keyword and total
                                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                                    }else if(seiveConnArr.length < parseInt($('#afs-total').val())){
                                        for(let s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // retry looper
                                        let start = parseInt($('#afs-startPosition').val());
                                        ////////////////
                                        totalSearchCount = con[0].totalResultCount
                                        totalS_userSpnT = totalSearchCount - start
                                        if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                            newposition = totalS_userSpnT
                                        }else if (parseInt($('#afs-total').val()) < 10){
                                            newposition = 10
                                        }else{
                                            newposition = parseInt($('#afs-total').val())
                                        }
                                        $('#afs-startPosition').val(start + newposition);
                                        ///////////////
                                        afcStart = $('#afs-startPosition').val();
                                        alpLooper()
                                    }
                                }else if(conArr.length == 0 && seiveConnArr.length < parseInt($('#afs-total').val())){
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                    totalSearchCount = con[0].totalResultCount
                                    totalS_userSpnT = totalSearchCount - start
                                    if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                        newposition = totalS_userSpnT
                                    }else if (parseInt($('#afs-total').val()) < 10){
                                        newposition = 10
                                    }else{
                                        newposition = parseInt($('#afs-total').val())
                                    }
                                    $('#afs-startPosition').val(start + newposition);
                                    ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    alpLooper()
                                }else{
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                    totalSearchCount = con[0].totalResultCount
                                    totalS_userSpnT = totalSearchCount - start
                                    if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                        newposition = totalS_userSpnT
                                    }else if (parseInt($('#afs-total').val()) < 10){
                                        newposition = 10
                                    }else{
                                        newposition = parseInt($('#afs-total').val())
                                    }
                                    $('#afs-startPosition').val(start + newposition);
                                    ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    alpLooper()
                                }
                            }else if($('#afs-negativeKeywords').val() !=''){
                                // -ive keywords use case
                                var negativeKeywords = $('#afs-negativeKeywords').val().toLowerCase().split(',');
                                $.each(degree, function(i, item){
                                    if(item.title !=''){
                                        for(var s=0; s<negativeKeywords.length; s++){
                                            if(!item.name.toLowerCase().includes(negativeKeywords[s]) || !item.title.toLowerCase().includes(negativeKeywords[s])){
                                                conArr.push(item)
                                            }
                                        }
                                    }
                                })
                                if(conArr.length > 0){
                                    // remove duplicate 
                                    var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectionId===v.connectionId))===i); 
                                    // seive count of data to user total
                                    totalUserAudience = parseInt($('#afs-total').val()) - seiveConnArr.length
                                    if(filterConArr.length > totalUserAudience){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // pass to memberBadges endpoint because it meets criteria in keyword and total
                                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                                    }else if(seiveConnArr.length < parseInt($('#afs-total').val())){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // retry looper
                                        let start = parseInt($('#afs-startPosition').val());
                                        ////////////////
                                        totalSearchCount = con[0].totalResultCount
                                        totalS_userSpnT = totalSearchCount - start
                                        if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                            newposition = totalS_userSpnT
                                        }else if (parseInt($('#afs-total').val()) < 10){
                                            newposition = 10
                                        }else{
                                            newposition = parseInt($('#afs-total').val())
                                        }
                                        $('#afs-startPosition').val(start + newposition);
                                        ///////////////
                                        afcStart = $('#afs-startPosition').val();
                                        alpLooper()
                                    }
                                }else if(conArr.length == 0 && seiveConnArr.length < parseInt($('#afs-total').val())){
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                    totalSearchCount = con[0].totalResultCount
                                    totalS_userSpnT = totalSearchCount - start
                                    if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                        newposition = totalS_userSpnT
                                    }else if (parseInt($('#afs-total').val()) < 10){
                                        newposition = 10
                                    }else{
                                        newposition = parseInt($('#afs-total').val())
                                    }
                                    $('#afs-startPosition').val(start + newposition);
                                    ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    alpLooper()
                                }else{
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                    totalSearchCount = con[0].totalResultCount
                                    totalS_userSpnT = totalSearchCount - start
                                    if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                        newposition = totalS_userSpnT
                                    }else if (parseInt($('#afs-total').val()) < 10){
                                        newposition = 10
                                    }else{
                                        newposition = parseInt($('#afs-total').val())
                                    }
                                    $('#afs-startPosition').val(start + newposition);
                                    ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    alpLooper()
                                }
                            }else{
                                // no +ive / -ive keyword use case
                                // seive count of data to user total
                                if(degree.length > parseInt($('#afs-total').val())){
                                    for(var s = 0; s < parseInt($('#afs-total').val()); s++){
                                        seiveConnArr.push(degree[s])
                                    }
                                }else{
                                    seiveConnArr = degree.slice();
                                }
                                // pass to memberBadges endpoint
                                memberBadgesEndpoint(seiveConnArr,afcDelay,afcAudienceName,audienceType)
                            }
                        }else{
                            let start = parseInt($('#afs-startPosition').val());
                            ////////////////
                            totalSearchCount = con[0].totalResultCount
                            totalS_userSpnT = totalSearchCount - start
                            if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                newposition = totalS_userSpnT
                            }else if (parseInt($('#afs-total').val()) < 10){
                                newposition = 10
                            }else{
                                newposition = parseInt($('#afs-total').val())
                            }
                            $('#afs-startPosition').val(start + newposition);
                            ///////////////
                            afcStart = $('#afs-startPosition').val();
                            alpLooper()
                        }
                    }else if(res['data'].elements.length == 0 && seiveConnArr.length > 0){
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').html('Found '+seiveConnArr.length+' <br> Adding '+seiveConnArr.length+' to list')
                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                    }else{
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').empty()
                        $('#afc-displayNewAudienceStatus').html('No match found!')
                        $('.newAudienceAction').attr('disabled', false)
                        return false;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.newAudienceAction').attr('disabled', false)
                    $('#afc-displayNewAudienceStatus').html('No connection found.');
                }
            })
        }, afcDelay * 1000)
    }
    alpLooper()
}

const afcGetLikedProfiles = async (postUrl, afcTotal, afcDelay, afcAudienceName, audienceType) => {
    try {
        if (!postUrl) {
            throw new Error('Invalid LinkedIn post URL. Please check the ID and try again.');
        }
        $('.newAudience-notice').show();
        $('#afc-displayNewAudienceStatus').html('Fetching post likers. This may take a moment...');
        $('.newAudienceAction').attr('disabled', true);

        const requestedLimit = parseInt($('#afs-total').val()) || afcTotal;
        const payload = {
            post_url: postUrl,
            limit: requestedLimit
        };

        console.log('Requesting post likers:', {
            post_url: postUrl,
            requested_limit: requestedLimit,
            payload: payload
        });

        const response = await fetch(`${PLATFORM_URL}/api/audience/post-likers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId,
                'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning page
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || result.status !== 200) {
            throw new Error(result.message || 'Failed to fetch post likers');
        }

        let profiles = result.data?.profiles || [];
        console.log('Received post likers from backend:', {
            profiles_count: profiles.length,
            total_from_phantom: result.data?.total_from_phantom,
            after_limit: result.data?.after_limit,
            skipped_companies: result.data?.skipped_companies,
            skipped_no_profile_link: result.data?.skipped_no_profile_link,
            requested_limit: requestedLimit
        });

        if (!profiles.length) {
            $('#afc-displayNewAudienceStatus').html('No likers found for this post.');
            $('.newAudienceAction').attr('disabled', false);
            return;
        }

        const profilesBeforeFilter = profiles.length;
        profiles = filterProfilesByPreferences(profiles);
        const profilesAfterFilter = profiles.length;
        
        if (profilesBeforeFilter > profilesAfterFilter) {
            console.log(`Filtered ${profilesBeforeFilter} profiles down to ${profilesAfterFilter} based on your preferences (degree, keywords, etc.)`);
        }
        
        if (!profiles.length) {
            $('#afc-displayNewAudienceStatus').html('No profiles matched your filters.');
            $('.newAudienceAction').attr('disabled', false);
            return;
        }

        const connections = transformProfilesToConnections(profiles, afcAudienceName);
        if (!connections.length) {
            $('#afc-displayNewAudienceStatus').html('No connections could be created from the returned data.');
            $('.newAudienceAction').attr('disabled', false);
            return;
        }

        newAudience(
            connections,
            afcDelay,
            afcAudienceName,
            audienceType,
            [],
            [],
            [],
            []
        );
    } catch (error) {
        handleAudienceCreationError(error, 'post-likers');
    } finally {
        $('.newAudienceAction').attr('disabled', false);
    }
}

const afcGetCommentProfiles = (afcPostId,afcTotal,afcStartP,afcDelay,afcAudienceName,audienceType) => {
    var con = [];
    var degree = [];
    var conArr = [];
    var seiveConnArr = [];
    var afcStart = afcStartP;
    var newposition = 0;
    var totalSearchCount = 0;
    var totalS_userSpnT = 0;

    $('.newAudience-notice').show();
    $('#afc-displayNewAudienceStatus').html('Scanning post...');

    var acpLooper = () => {
        seiveConnArr = seiveConnArr.filter(function( element ) {
            return element !== undefined;
        });
        setTimeout(async function(){
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', accept);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;0t+j1HGNRPeL1YhwxK4WcA==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2420","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/feed/comments?count=${afcTotal}&q=comments&sortOrder=CHRON&start=${afcStart}&updateId=${afcPostId}`,
                success: function(data){
                    var res = {'data': data};
                    if(res['data'].elements.length > 0){
                        elementsPath = res['data'].elements;
                        totalResult = res['data'].paging.total;
                        // generate random id for a set of audience
                        var audienceId = Math.floor(Math.random()*90000) + 10000;
                        $.each(elementsPath, function(i, item){
                            itemPath = item.commenter['com.linkedin.voyager.feed.MemberActor'];
                            var netDistance = itemPath.distance ? parseInt(itemPath.distance.value.split("_")[1]) : null;
                            var targetIdd;
                            if(itemPath.miniProfile.objectUrn.includes('urn:li:member:')){
                                targetIdd = itemPath.miniProfile.objectUrn.replace('urn:li:member:','') 
                            }
                            if(itemPath.miniProfile.entityUrn.includes('urn:li:fs_miniProfile:')) {
                                var connectionId = itemPath.miniProfile.entityUrn.replace('urn:li:fs_miniProfile:','')
                                con.push({
                                    audienceId: audienceId,
                                    firstName: itemPath.miniProfile.firstName,
                                    lastName: itemPath.miniProfile.lastName,
                                    name: `${itemPath.miniProfile.firstName} ${itemPath.miniProfile.lastName}`,
                                    title: itemPath.miniProfile.hasOwnProperty('occupation') ? itemPath.miniProfile.occupation : '',
                                    locationName: '',
                                    publicIdentifier: itemPath.miniProfile.publicIdentifier, 
                                    connectionId: connectionId,
                                    totalResultCount: totalResult,
                                    memberUrn: itemPath.miniProfile.objectUrn, 
                                    networkDistance: netDistance,
                                    trackingId: itemPath.miniProfile.trackingId, 
                                    navigationUrl: `https://www.linkedin.com/in/${itemPath.miniProfile.publicIdentifier}`, 
                                    targetId: parseInt(targetIdd),
                                    distanceCheck: itemPath.distance.value
                                })	
                            }
                        })
                        // check for network degree
                        $.each(con, function(i, item){
                            if ($('#afs-connFirstCheck').prop('checked') == true && item.distanceCheck == 'DISTANCE_1')
                                degree.push(item)
                            if ($('#afs-connSecondCheck').prop('checked') == true && item.distanceCheck == 'DISTANCE_2')
                                degree.push(item)
                            if ($('#afs-connThirdCheck').prop('checked') == true && (item.distanceCheck == 'DISTANCE_3' || item.distanceCheck == 'OUT_OF_NETWORK'))
                                degree.push(item)
                        })
                        if (degree.length > 0){
                            if($('#afs-positiveKeywords').val() !=''){
                                // +ive keywords use case
                                var positiveKeywords = $('#afs-positiveKeywords').val().toLowerCase().split(',');
                                $.each(con, function(i, item){
                                    if(item.title != ''){
                                        for(var s=0; s<positiveKeywords.length; s++){
                                            if(item.name.toLowerCase().includes(positiveKeywords[s]) || item.title.toLowerCase().includes(positiveKeywords[s])){
                                                conArr.push(item)
                                            }
                                        }
                                    }
                                })
                                if(conArr.length > 0){
                                    // remove duplicate 
                                    var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectionId===v.connectionId))===i); 
                                    // seive count of data to user total
                                    totalUserAudience = parseInt($('#afs-total').val()) - seiveConnArr.length
                                    if(filterConArr.length > totalUserAudience){
                                        for(let s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // pass to memberBadges endpoint because it meets criteria in keyword and total
                                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                                    }else if(seiveConnArr.length < parseInt($('#afs-total').val())){
                                        for(let s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // retry looper
                                        let start = parseInt($('#afs-startPosition').val());
                                        ////////////////
                                        totalSearchCount = con[0].totalResultCount
                                        totalS_userSpnT = totalSearchCount - start
                                        if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                            newposition = totalS_userSpnT
                                        }else if (parseInt($('#afs-total').val()) < 10){
                                            newposition = 10
                                        }else{
                                            newposition = parseInt($('#afs-total').val())
                                        }
                                        $('#afs-startPosition').val(start + newposition);
                                        ///////////////
                                        afcStart = $('#afs-startPosition').val();
                                        acpLooper()
                                    }
                                }else if(conArr.length == 0 && seiveConnArr.length < parseInt($('#afs-total').val())){
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                        totalSearchCount = con[0].totalResultCount
                                        totalS_userSpnT = totalSearchCount - start
                                        if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                            newposition = totalS_userSpnT
                                        }else if (parseInt($('#afs-total').val()) < 10){
                                            newposition = 10
                                        }else{
                                            newposition = parseInt($('#afs-total').val())
                                        }
                                        $('#afs-startPosition').val(start + newposition);
                                        ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    acpLooper()
                                }else{
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                        totalSearchCount = con[0].totalResultCount
                                        totalS_userSpnT = totalSearchCount - start
                                        if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                            newposition = totalS_userSpnT
                                        }else if (parseInt($('#afs-total').val()) < 10){
                                            newposition = 10
                                        }else{
                                            newposition = parseInt($('#afs-total').val())
                                        }
                                        $('#afs-startPosition').val(start + newposition);
                                        ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    acpLooper()
                                }
                            }else if($('#afs-negativeKeywords').val() !=''){
                                // -ive keywords use case
                                var negativeKeywords = $('#afs-negativeKeywords').val().toLowerCase().split(',');
                                $.each(con, function(i, item){
                                    if(item.title !=''){
                                        for(var s=0; s<negativeKeywords.length; s++){
                                            if(!item.name.toLowerCase().includes(negativeKeywords[s]) || !item.title.toLowerCase().includes(negativeKeywords[s])){
                                                conArr.push(item)
                                            }
                                        }
                                    }
                                })
                                if(conArr.length > 0){
                                    // remove duplicate 
                                    var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectionId===v.connectionId))===i); 
                                    // seive count of data to user total
                                    totalUserAudience = parseInt($('#afs-total').val()) - seiveConnArr.length
                                    if(filterConArr.length > totalUserAudience){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // pass to memberBadges endpoint because it meets criteria in keyword and total
                                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                                    }else if(seiveConnArr.length < parseInt($('#afs-total').val())){
                                        for(var s = seiveConnArr.length; s < parseInt($('#afs-total').val()); s++){
                                            seiveConnArr.push(filterConArr[s])
                                        }
                                        // retry looper
                                        let start = parseInt($('#afs-startPosition').val());
                                        ////////////////
                                        totalSearchCount = con[0].totalResultCount
                                        totalS_userSpnT = totalSearchCount - start
                                        if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                            newposition = totalS_userSpnT
                                        }else if (parseInt($('#afs-total').val()) < 10){
                                            newposition = 10
                                        }else{
                                            newposition = parseInt($('#afs-total').val())
                                        }
                                        $('#afs-startPosition').val(start + newposition);
                                        ///////////////
                                        afcStart = $('#afs-startPosition').val();
                                        acpLooper()
                                    }
                                }else if(conArr.length == 0 && seiveConnArr.length < parseInt($('#afs-total').val())){
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                    totalSearchCount = con[0].totalResultCount
                                    totalS_userSpnT = totalSearchCount - start
                                    if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                        newposition = totalS_userSpnT
                                    }else if (parseInt($('#afs-total').val()) < 10){
                                        newposition = 10
                                    }else{
                                        newposition = parseInt($('#afs-total').val())
                                    }
                                    $('#afs-startPosition').val(start + newposition);
                                    ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    acpLooper()
                                }else{
                                    let start = parseInt($('#afs-startPosition').val());
                                    ////////////////
                                    totalSearchCount = con[0].totalResultCount
                                    totalS_userSpnT = totalSearchCount - start
                                    if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                        newposition = totalS_userSpnT
                                    }else if (parseInt($('#afs-total').val()) < 10){
                                        newposition = 10
                                    }else{
                                        newposition = parseInt($('#afs-total').val())
                                    }
                                    $('#afs-startPosition').val(start + newposition);
                                    ///////////////
                                    afcStart = $('#afs-startPosition').val();
                                    acpLooper()
                                }
                            }else{
                                // no +ive / -ive keyword use case
                                // seive count of data to user total
                                if(con.length > parseInt($('#afs-total').val())){
                                    for(var s = 0; s < parseInt($('#afs-total').val()); s++){
                                        seiveConnArr.push(con[s])
                                    }
                                }else{
                                    seiveConnArr = con.slice();
                                }
                                // pass to memberBadges endpoint
                                memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                            }
                        }else{
                            let start = parseInt($('#afs-startPosition').val());
                            ////////////////
                            totalSearchCount = con[0].totalResultCount
                            totalS_userSpnT = totalSearchCount - start
                            if (totalS_userSpnT < parseInt($('#afs-total').val())){
                                newposition = totalS_userSpnT
                            }else if (parseInt($('#afs-total').val()) < 10){
                                newposition = 10
                            }else{
                                newposition = parseInt($('#afs-total').val())
                            }
                            $('#afs-startPosition').val(start + newposition);
                            ///////////////
                            afcStart = $('#afs-startPosition').val();
                            acpLooper()
                        }
                    }else if(res['data'].elements.length == 0 && seiveConnArr.length > 0){
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').html('Found '+seiveConnArr.length+' <br> Adding '+seiveConnArr.length+' to list')
                        memberBadgesEndpoint(seiveConnArr, afcDelay, afcAudienceName, audienceType)
                    }else{
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').empty()
                        $('#afc-displayNewAudienceStatus').html('No match found!')
                        $('.newAudienceAction').attr('disabled', false)
                        return false;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.newAudienceAction').attr('disabled', false)
                    $('#afc-displayNewAudienceStatus').html('No connection found.');
                }
            })
        }, afcDelay * 1000)
    }
    acpLooper()
}

const afcEventAttendees = async () => {
    let totalResultCount = 0;
    let retryCount = 0;
    const maxRetries = 3;
    
    voyagerBlockSearchUrl = voyagerBlockSearchUrl.replace('GLOBAL_SEARCH_HEADER','EVENT_PAGE_CANNED_SEARCH')

    const getConnectionsLooper = async () => {
        try {
            // Add random delay to avoid detection
            const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            console.log(`Fetching event attendees from position: ${getConnectParams.startPosition}`);
            
            const data = await makeLinkedInApiRequest(
                `${voyagerBlockSearchUrl}&query=${getConnectParams.queryParams}&start=${getConnectParams.startPosition}`,
                {},
                0,
                {
                    'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;+DUrmPTDTtOGzG9sI/UzuA==',
                    'x-li-track': JSON.stringify({
                        "clientVersion": "1.10.2031.2",
                        "osName": "web",
                        "timezoneOffset": 1,
                        "deviceFormFactor": "DESKTOP",
                        "mpName": "voyager-web"
                    })
                }
            );
            
            let res = {'data': data};
            let elements = res['data'].data.elements;
            let included = res['data'].included;

            if (elements && elements.length) {
                if (totalResultCount == 0) {
                    totalResultCount = res['data'].data.metadata.totalResultCount;
                }

                if (elements[1] && elements[1].items && elements[1].items.length) {
                    for (let item of included) {
                        // perform checks
                        if (item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                            if (item.title.text && item.primarySubtitle.text && 
                                item.title.text.includes('LinkedIn Member') == false) {
                                
                                if (getConnectParams.positiveKeywords) {
                                    for (let text of getConnectParams.positiveKeywords.split(',')) {
                                        if (item.title.text.toLowerCase().includes(text.toLowerCase()) == true || 
                                            item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == true) {
                                            audConnectionItems.push(item);
                                        }
                                    }
                                } else if (getConnectParams.negativeKeywords) {
                                    for (let text of getConnectParams.negativeKeywords.split(',')) {
                                        if (item.title.text.toLowerCase().includes(text.toLowerCase()) == false && 
                                            item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == false) {
                                            audConnectionItems.push(item);
                                        }
                                    }
                                } else {
                                    audConnectionItems.push(item);
                                }
                            }
                        }
                    }

                    if (audConnectionItems.length < parseInt($('#afs-total').val())) {
                        getConnectParams.startPosition = parseInt(getConnectParams.startPosition) + 11;
                        $('#afs-startPosition').val(getConnectParams.startPosition);
                        
                        // Update status
                        $('#afc-displayNewAudienceStatus').html(
                            `<i class="fas fa-spinner fa-spin"></i> Found ${audConnectionItems.length} event attendees, continuing search...`
                        );
                        
                        // Continue with next batch
                        setTimeout(() => getConnectionsLooper(), LINKEDIN_API_CONFIG.maxDelay);
                    } else {
                        // Found enough attendees
                        $('#afc-displayNewAudienceStatus').html(
                            `<i class="fas fa-check"></i> Found ${audConnectionItems.length} event attendees!`
                        );
                        afcSetConnectionData(totalResultCount);
                    }
                } else if (!elements[1].items.length && !audConnectionItems.length) {
                    $('#afc-displayNewAudienceStatus').html(
                        '<i class="fas fa-info-circle"></i> No event attendees found, change your search criteria and try again!'
                    );
                    $('.newAudienceAction').attr('disabled', false);

                } else if (!elements[1].items.length && audConnectionItems.length) {
                    $('#afc-displayNewAudienceStatus').html(
                        `<i class="fas fa-check"></i> Found ${audConnectionItems.length} event attendees!`
                    );
                    afcSetConnectionData(totalResultCount);
                }

            } else if (audConnectionItems.length) {
                $('#afc-displayNewAudienceStatus').html(
                    `<i class="fas fa-check"></i> Found ${audConnectionItems.length} event attendees!`
                );
                afcSetConnectionData(totalResultCount);
            } else {
                $('#afc-displayNewAudienceStatus').html(
                    '<i class="fas fa-info-circle"></i> No event attendees found, change your search criteria and try again!'
                );
                $('.newAudienceAction').attr('disabled', false);
            }
            
            // Reset retry count on success
            retryCount = 0;
            
        } catch (error) {
            console.error('Error in afcEventAttendees:', error);
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying event attendees fetch (${retryCount}/${maxRetries})...`);
                
                $('#afc-displayNewAudienceStatus').html(
                    `<i class="fas fa-spinner fa-spin"></i> Retrying... (${retryCount}/${maxRetries})`
                );
                
                // Wait longer before retry
                setTimeout(() => getConnectionsLooper(), LINKEDIN_API_CONFIG.retryDelay * retryCount);
            } else {
                handleAudienceCreationError(error, 'afcEventAttendees');
            }
        }
    };

    // Start the event attendees fetching process
    getConnectionsLooper();
};

const afcGroupMembers = async () => {
    let totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', acceptVnd);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'rn:li:page:d_flagship3_search_srp_people;3NJ+UbmZQsO0i6eCFDQEOw==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.8.4154","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerGroupMemberSearchUrl}/urn%3Ali%3Agroup%3A${getConnectParams.groupId}/members?count=${getConnectParams.totalCount}&membershipStatuses=List(OWNER,MANAGER,MEMBER)&q=membershipStatus&start=${getConnectParams.startPosition}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data['*elements']
                    let included = res['data'].included

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.paging.total
                        
                        for(let item of included) {
                            if(item.hasOwnProperty('firstName') && item.hasOwnProperty('lastName') && item.hasOwnProperty('occupation')) {
                                let name = `${item.firstName} ${item.lastName}`

                                if(item.firstName && item.lastName && item.occupation && name.includes('LinkedIn Member') == false) {
                                    if(getConnectParams.positiveKeywords) {
                                        for(let text of getConnectParams.positiveKeywords.split(',')) {
                                            if(name.toLowerCase().includes(text.toLowerCase()) == true || item.occupation.toLowerCase().includes(text.toLowerCase()) == true) {
                                                audConnectionItems.push(item)
                                            }
                                        }
                                    }else if(getConnectParams.negativeKeywords) {
                                        for(let text of getConnectParams.negativeKeywords.split(',')) {
                                            if(name.toLowerCase().includes(text.toLowerCase()) == false && item.occupation.toLowerCase().includes(text.toLowerCase()) == false) {
                                                audConnectionItems.push(item)
                                            }
                                        }
                                    }else {
                                        audConnectionItems.push(item)
                                    }
                                }
                            }
                        }

                        if(audConnectionItems.length < parseInt($('#afs-total').val())) {
                            getConnectParams.startPosition = parseInt(getConnectParams.startPosition) + 11
                            $('#afs-startPosition').val(getConnectParams.startPosition)
                            getConnectionsLooper(totalResultCount)
                        }else {
                            // call next action: cleanConnectionData or memberBadge
                            afcSetGroupConnectionData(totalResultCount)
                        }
                        
                    }else if(audConnectionItems.length) {
                        $('#displayNewAudienceStatus').html(`Found ${audConnectionItems.length} members.`)
                        // call next action: cleanConnectionData or memberBadge
                        afcSetGroupConnectionData(totalResultCount)
                    }else {
                        $('#afc-displayNewAudienceStatus').html('No result found, change your search criteria and try again!')
                        $('.newAudienceAction').attr('disabled', false)
                    }
                },
                error: function(err) {
                    console.log(err)
                    $('#afc-displayNewAudienceStatus').html('Something went wrong while trying to get group members!')
                    $('.newAudienceAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

// PhantomBuster search export - skip Voyager API calls, work like post likers
const afcSetPhantomConnectionData = (totalResultCount) => {
    let profiles = [];
    let profileUrn, publicIdentifier;

    // Remove duplicates by trackingId - keep only first occurrence of each unique trackingId
    const seenTrackingIds = new Set();
    audConnectionItems = audConnectionItems.filter((obj) => {
        const trackingId = obj.trackingId;
        if (seenTrackingIds.has(trackingId)) {
            return false; // Duplicate, skip it
        }
        seenTrackingIds.add(trackingId);
        return true; // First occurrence, keep it
    });

    // Transform to profile format (like post likers)
    for(let item of audConnectionItems) {
        if (!item.entityUrn) continue;
        
        profileUrn = item.entityUrn;

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')
            publicIdentifier = item.navigationUrl ? item.navigationUrl.split('?')[0].replace('https://www.linkedin.com/in/','').replace('https://linkedin.com/in/','') : profileUrn;
            
            const nameParts = item.title?.text?.split(' ') || [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            const networkDistance = item.entityCustomTrackingInfo?.memberDistance ? 
                parseInt(item.entityCustomTrackingInfo.memberDistance.split("_")[1]) : null;
            
            // Map connection degree
            let connectionDegree = null;
            if (networkDistance === 1) connectionDegree = '1st';
            else if (networkDistance === 2) connectionDegree = '2nd';
            else if (networkDistance >= 3) connectionDegree = '3rd';
            
            profiles.push({
                firstName: firstName,
                lastName: lastName,
                fullName: item.title?.text || `${firstName} ${lastName}`.trim(),
                headline: item.primarySubtitle?.text || '',
                location: item.secondarySubtitle?.text || item.phantomData?.location || '',
                publicIdentifier: publicIdentifier,
                profileUrl: item.navigationUrl || `https://www.linkedin.com/in/${publicIdentifier}`,
                connectionId: profileUrn,
                memberUrn: item.trackingUrn || null,
                connectionDegree: connectionDegree,
                connectionDegreeValue: networkDistance,
                trackingId: item.trackingId || profileUrn,
                // Preserve PhantomBuster data for filtering
                company: item.phantomData?.company || null,
                companyId: item.phantomData?.companyId || null,
                company2: item.phantomData?.company2 || null,
                industry: item.phantomData?.industry || null,
                school: item.phantomData?.school || null,
                school2: item.phantomData?.school2 || null,
                pastCompany: item.phantomData?.company2 || null
            });
        }
    }

    // Filter by preferences (like post likers) - this also applies the limit
    profiles = filterProfilesByPreferences(profiles);

    if (!profiles.length) {
        $('#afc-displayNewAudienceStatus').html('No profiles matched your filters.');
        $('.newAudienceAction').attr('disabled', false);
        return;
    }

    // Transform to connections format (like post likers)
    const connections = transformProfilesToConnections(profiles, getConnectParams.audienceName);
    
    if (!connections.length) {
        $('#afc-displayNewAudienceStatus').html('No connections could be created from the returned data.');
        $('.newAudienceAction').attr('disabled', false);
        return;
    }

    // Call newAudience directly without Voyager API calls (like post likers)
    newAudience(
        connections,
        getConnectParams.delayTime,
        getConnectParams.audienceName,
        getConnectParams.audienceType,
        [], // memberBadgesData - empty, no Voyager call
        [], // networkInfoData - empty, no Voyager call
        [], // positionGroupsData - empty, no Voyager call
        []  // companyData - empty, no Voyager call
    );
}

const afcSetConnectionData = (totalResultCount) => {
    let conArr = [], connections = [];
    let profileUrn, publicIdentifier;
    let audienceId = Math.floor(Math.random()*90000) + 10000;

    audConnectionItems = audConnectionItems.filter((obj, index) => {
        return index === audConnectionItems.findIndex(o => obj.trackingId === o.trackingId);
    });

    for(let item of audConnectionItems) {
        profileUrn = item.entityUrn

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')
            publicIdentifier = item.navigationUrl.split('?')[0]

            conArr.push({
                audienceId: audienceId,
                firstName: item.title.text.split(' ')[0],
                lastName: item.title.text.split(' ')[1],
                name: item.title.text,
                title: item.primarySubtitle.text,
                locationName: item.secondarySubtitle.text,
                publicIdentifier: publicIdentifier.replace('https://www.linkedin.com/in/',''), 
                connectionId: profileUrn,
                totalResultCount: totalResultCount,
                memberUrn: item.trackingUrn, 
                networkDistance: parseInt(item.entityCustomTrackingInfo.memberDistance.split("_")[1]),
                trackingId: item.trackingId,
                navigationUrl: item.navigationUrl, 
                targetId: item.trackingUrn.replace('urn:li:member:','') 
            })			
        }
    }

    for (let index = 0; index < conArr.length; index++) {
        if(index >= parseInt($('#afs-total').val())){
            break
        }else{
            connections.push(conArr[index])
        }
    }

    // Skip memberBadgesEndpoint (deprecated Voyager API) and save directly
    newAudience(connections, getConnectParams.delayTime, getConnectParams.audienceName, getConnectParams.audienceType, [], [], [], [])
}

const afcSetGroupConnectionData = (totalResultCount) => {
    let conArr = [], connections = [];
    let profileUrn;
    let audienceId = Math.floor(Math.random()*90000) + 10000;

    audConnectionItems = audConnectionItems.filter((obj, index) => {
        return index === audConnectionItems.findIndex(o => obj.trackingId === o.trackingId);
    });

    for(let item of audConnectionItems) {
        profileUrn = item.entityUrn
        profileUrn = profileUrn.replace('urn:li:fs_miniProfile:','')

        conArr.push({
            audienceId: audienceId,
            firstName: item.firstName,
            lastName: item.lastName,
            name: `${item.firstName} ${item.lastName}`,
            title: item.occupation,
            locationName: null,
            publicIdentifier: item.publicIdentifier, 
            connectionId: profileUrn,
            totalResultCount: totalResultCount,
            memberUrn: item.objectUrn, 
            networkDistance: null,
            trackingId: item.trackingId,
            targetId: item.objectUrn.replace('urn:li:member:','')
        })
    }

    for (let index = 0; index < conArr.length; index++) {
        if(index >= parseInt($('#afs-total').val())){
            break
        }else{
            connections.push(conArr[index])
        }
    }

    // Skip memberBadgesEndpoint (deprecated Voyager API) and save directly
    newAudience(connections, getConnectParams.delayTime, getConnectParams.audienceName, getConnectParams.audienceType, [], [], [], [])
}

const memberBadgesEndpoint = async (con, afcDelay, afcAudienceName, audienceType) => {
    var memberBadgesData = [];
    connectionEmails = [];
    $('#afc-displayNewAudienceStatus').html('Getting connection info. Please wait...')

    for(var i=0; i<con.length; i++){
        if(con[i] && con[i].hasOwnProperty('connectionId')) {
            if(con[i].connectionId) {
                await $.ajax({
                    method: 'get',
                    beforeSend: function(request) { 
                        request.setRequestHeader('csrf-token', jsession);
                        request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                        request.setRequestHeader('x-li-lang', xLiLang);
                        request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==');
                        request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
                        request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                    },
                    url: `${voyagerApi}/identity/profiles/${con[i].connectionId}/memberBadges`,
                    success: function(data){
                        var res = {'data': data}
                        if(res['data'].data.hasOwnProperty('entityUrn')){
                            var elPath = res['data'].data;
                            
                            getConnectContactInfo(con[i].connectionId);
                            
                            memberBadgesData.push({
                                influencer: elPath.influencer,
                                jobSeeker: elPath.jobSeeker,
                                openLink: elPath.openLink,
                                premium: elPath.premium,
                                connectId: con[i].connectionId,
                                type: 'member_badge'
                            })
                        }
                    },
                    error: function(error){
                        console.log(error)
                        $('.newAudienceAction').attr('disabled', false)
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').html('Something went wrong. Please try again.')
                    }
                })
            }
        }

        await sleep(15000)
    }
    networkInfoEndpoint(con, afcDelay, afcAudienceName, audienceType, memberBadgesData)
}

const networkInfoEndpoint = async (con, afcDelay, afcAudienceName, audienceType, memberBadgesData) => {
    var networkInfoData = [];

    for(var i=0; i<con.length; i++){
        if(con[i] && con[i].hasOwnProperty('connectionId')) {
            if(con[i].connectionId) {
                await $.ajax({
                    method: 'get',
                    beforeSend: function(request) { 
                        request.setRequestHeader('csrf-token', jsession);
                        request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                        request.setRequestHeader('x-li-lang', xLiLang);
                        request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_people_connections;eLxFYS13RaipPVCgxI7y2w==');
                        request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
                        request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                    },
                    url: `${voyagerApi}/identity/profiles/${con[i].connectionId}/networkinfo`,
                    success: function(data){
                        var res = {'data': data}
                        if(res['data'].data.hasOwnProperty('entityUrn')){
                            var elPath = res['data'].data;

                            networkInfoData.push({
                                connectionsCount: elPath.connectionsCount,
                                followersCount: elPath.followersCount,
                                distance: elPath.distance.value,
                                trackingUrn: res['data'].included[0].trackingUrn,
                                connectId: con[i].connectionId,
                                type: 'network_info'
                            })
                        }
                    },
                    error: function(error){
                        console.log(error)
                        $('.newAudienceAction').attr('disabled', false)
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').html('Something went wrong. Please try again.')
                    }
                })
            }
        }
    }

    positionGroupsEndpoint(con, afcDelay, afcAudienceName, audienceType, memberBadgesData, networkInfoData)
}

const positionGroupsEndpoint = async (con, afcDelay, afcAudienceName, audienceType, memberBadgesData, networkInfoData) => {
    var positionGroupsData = [];

    for(var i=0; i<con.length; i++){
        if(con[i] && con[i].hasOwnProperty('connectionId')) {
            if(con[i].connectionId) {
                try {
                    await $.ajax({
                        method: 'get',
                        beforeSend: function(request) { 
                            request.setRequestHeader('csrf-token', jsession);
                            request.setRequestHeader('x-li-lang', xLiLang);
                            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_people_connections;+x53BOwRR0CbMjBX9vblWA==');
                            request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
                            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                        },
                        url: `${voyagerApi}/identity/profiles/${con[i].connectionId}/positionGroups`,
                        success: function(data){
                            var res = {'data': data}
                            if(res['data'].elements.length > 0){
                                var elPath = res['data'].elements[0];
                                var compUniversalName = '';

                                if(elPath.miniCompany) {
                                    compUniversalName = elPath.miniCompany.universalName;
                                }else if(elPath.positions[0].company) {
                                    compUniversalName = elPath.positions[0].company.miniCompany.universalName;
                                }else if(res['data'].elements[1]) {
                                    let elPath2 = res['data'].elements[1];

                                    if(elPath2.miniCompany) {
                                        compUniversalName = elPath2.miniCompany.universalName;
                                    }else if(elPath.positions[0].company) {
                                        compUniversalName = elPath.positions[0].company.miniCompany.universalName;
                                    }else {
                                        compUniversalName = null;
                                    }
                                }
                                else {
                                    compUniversalName = null;
                                }
                                positionGroupsData.push({
                                    companyName: elPath.name,
                                    companyLocation: elPath.positions[0].locationName,
                                    connectPosition: elPath.positions[0].title,
                                    companyUniversalName: compUniversalName,
                                    connectId: con[i].connectionId,
                                })
                            }
                        },
                        error: function(error){
                            console.log(error)
                            $('.newAudienceAction').attr('disabled', false)
                            $('.newAudience-notice').show()
                            $('#afc-displayNewAudienceStatus').html('Something went wrong. Please try again.')
                        }
                    })
                } catch (error) {
                    continue;
                }
            }
        }
    }

    companyEndpoint(con, afcDelay, afcAudienceName, audienceType, memberBadgesData, networkInfoData, positionGroupsData)
}

const companyEndpoint = async (con, afcDelay, afcAudienceName, audienceType, memberBadgesData, networkInfoData, positionGroupsData) => {
    var companyData = [];

    for(var i=0; i<positionGroupsData.length; i++){
        if(positionGroupsData[i].companyUniversalName != null){
            var companyUniversalName = encodeURIComponent(positionGroupsData[i].companyUniversalName);
            var companyName = companyUniversalName;
            if (companyUniversalName.endsWith('...')){
                companyName = companyUniversalName.slice(0, -2)
            }else if(companyUniversalName.endsWith('..')){
                companyName = companyUniversalName.slice(0, -1)
            }
            try {
                await $.ajax({
                    method: 'get',
                    beforeSend: function(request) {
                        request.setRequestHeader('csrf-token', jsession);
                        request.setRequestHeader('x-li-lang', xLiLang);
                        request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_company;MmaT7Y2PQP2pmPN654ks9Q==');
                        request.setRequestHeader('x-li-track', JSON.stringify(xLiTrack3));
                        request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                    },
                    url: `${voyagerApi}/organization/companies?decorationId=com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12&q=universalName&universalName=${companyName}`,
                    success: function(data){
                        var res = {'data': data}
                        if(res['data'].elements.length > 0){
                            var mainPath = res['data'].elements[0];

                            companyData.push({
                                companyPageUrl: mainPath.hasOwnProperty('companyPageUrl') ? mainPath.companyPageUrl : null,
                                comapnyDescription: mainPath.description,
                                companyName: mainPath.name,
                                companyPhone: mainPath.phone ? mainPath.phone.number : null,
                                connectId: positionGroupsData[i].connectId, 
                                type: 'company'
                            })
                        }
                    },
                    error: function(error){
                        console.log(error)
                        $('.newAudienceAction').attr('disabled', false)
                        $('.newAudience-notice').show()
                        $('#afc-displayNewAudienceStatus').html('Something went wrong. Please try again.')
                    }
                })
            } catch (error) {
                continue; 
            }
        }
    }

    newAudience(con, afcDelay, afcAudienceName, audienceType, memberBadgesData, networkInfoData, positionGroupsData, companyData)
}

const getConnectContactInfo = async (connectionId) => {
    await $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', acceptVnd);
            request.setRequestHeader('content-type', contentType);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;kk0zM9LQRYi/in3qM6Bi5w==');
            request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.3070","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/identity/profiles/${connectionId}/profileContactInfo`,
        success: function(data) {
            connectionEmails.push({
                email: data.data.emailAddress,
                connectionId: connectionId
            }) 
        },
        error: function(error, statusText, responseText) {
            // console.log(responseText)
        }
    })
}

function buildLinkedInPostUrl(type, id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    switch (type) {
        case 'activity':
            return `https://www.linkedin.com/feed/update/urn:li:activity:${cleanId}/`;
        case 'article':
            return `https://www.linkedin.com/feed/update/urn:li:article:${cleanId}/`;
        case 'ugcPost':
            return `https://www.linkedin.com/feed/update/urn:li:ugcPost:${cleanId}/`;
        default:
            return null;
    }
}

function filterProfilesByPreferences(profiles) {
    let filtered = [...profiles];

    const degreeFilters = [];
    if ($('#afs-connFirstCheck').prop('checked')) degreeFilters.push('DISTANCE_1');
    if ($('#afs-connSecondCheck').prop('checked')) degreeFilters.push('DISTANCE_2');
    if ($('#afs-connThirdCheck').prop('checked')) {
        degreeFilters.push('DISTANCE_3');
        degreeFilters.push('OUT_OF_NETWORK');
    }

    if (degreeFilters.length) {
        filtered = filtered.filter(profile => {
            // If connectionDegree is null/undefined (PhantomBuster data), 
            // treat as OUT_OF_NETWORK and only include if 3rd degree is checked
            if (!profile.connectionDegree) {
                return degreeFilters.includes('OUT_OF_NETWORK') || degreeFilters.includes('DISTANCE_3');
            }
            const mapped = mapConnectionDegree(profile.connectionDegree);
            return degreeFilters.includes(mapped);
        });
    }

    const positiveKeywords = ($('#afs-positiveKeywords').val() || '')
        .toLowerCase()
        .split(',')
        .map(keyword => keyword.trim())
        .filter(Boolean);

    // If using PhantomBuster and search URL already includes keywords that match positive keywords,
    // skip filtering here (LinkedIn already filtered by keywords in the search URL)
    const searchKeywords = (getConnectParams?.keywords || '').toLowerCase().trim();
    const keywordsMatch = searchKeywords && positiveKeywords.length > 0 && 
        positiveKeywords.some(kw => searchKeywords.includes(kw));

    if (positiveKeywords.length && !keywordsMatch) {
        // Only filter if positive keywords don't match search keywords
        filtered = filtered.filter(profile => {
            const haystack = `${profile.fullName || ''} ${profile.headline || ''}`.toLowerCase();
            return positiveKeywords.some(keyword => haystack.includes(keyword));
        });
    }
    // If keywordsMatch is true, skip filtering (LinkedIn already filtered)

    const negativeKeywords = ($('#afs-negativeKeywords').val() || '')
        .toLowerCase()
        .split(',')
        .map(keyword => keyword.trim())
        .filter(Boolean);

    if (negativeKeywords.length) {
        filtered = filtered.filter(profile => {
            const haystack = `${profile.fullName || ''} ${profile.headline || ''}`.toLowerCase();
            return negativeKeywords.every(keyword => !haystack.includes(keyword));
        });
    }

    // Client-side filtering for location, company, industry, school is DISABLED
    // LinkedIn URL parameters handle filtering directly, so PhantomBuster returns pre-filtered results
    // We only filter by connection degree and keywords here (which LinkedIn may not handle perfectly)
    const filterValues = getConnectParams?.filterValues;
    console.log('🔍 filterProfilesByPreferences: LinkedIn URL filters applied', {
        profilesCount: filtered.length,
        note: 'Location, company, industry, and school filters are handled by LinkedIn URL parameters - no client-side filtering needed'
    });
    
    // DISABLED: Client-side filtering for location, company, industry, school
    // LinkedIn URL parameters handle these filters, so PhantomBuster returns pre-filtered results
    // Only connection degree and keyword filtering happens here
    if (false && filterValues) { // Disabled - LinkedIn URL handles filtering
        const beforeLocationFilter = filtered.length;
        
        // Filter by location
        if (filterValues.locations && filterValues.locations.length > 0) {
            const locationNames = filterValues.locations.map(loc => loc.name.toLowerCase().trim());
            console.log('🔍 Applying location filter:', { 
                filterLocations: locationNames,
                filterLocationObjects: filterValues.locations,
                profilesBeforeFilter: filtered.length 
            });
            
            filtered = filtered.filter(profile => {
                const profileLocation = (profile.location || '').toLowerCase().trim();
                if (!profileLocation) return false; // Skip profiles with no location
                
                // Check if profile location matches any of the filter location names
                // This handles cases like:
                // - Filter: "Nigeria" matches "Lagos State, Nigeria" ✅
                // - Filter: "Lagos" matches "Lagos State, Nigeria" ✅
                // - Filter: "Lagos State" matches "Lagos State, Nigeria" ✅
                // - Filter: "United States" matches "Philadelphia, Pennsylvania, United States" ✅
                const matches = locationNames.some(locName => {
                    // 1. Direct substring match: profile location contains filter location name
                    // Example: "lagos state, nigeria" contains "nigeria" ✅
                    if (profileLocation.includes(locName)) {
                        return true;
                    }
                    
                    // 2. Reverse match: filter location name contains profile location
                    // This handles cases where filter is more specific than profile
                    // Example: Filter "Lagos State, Nigeria" matches profile "Nigeria" ✅
                    if (locName.includes(profileLocation) && profileLocation.length > 2) {
                        return true;
                    }
                    
                    // 3. Word-by-word match: check if any significant word in filter matches profile
                    // Split by spaces, commas, and other delimiters
                    const filterWords = locName.split(/[\s,]+/).filter(w => w.length > 2); // Ignore short words like "of", "in"
                    const profileWords = profileLocation.split(/[\s,]+/).filter(w => w.length > 2);
                    
                    // Check if any filter word appears in profile words
                    return filterWords.some(fw => profileWords.includes(fw));
                });
                
                if (!matches) {
                    console.log(`❌ Profile filtered out by location:`, {
                        name: profile.fullName,
                        profileLocation: profile.location,
                        profileLocationLower: profileLocation,
                        filterLocations: locationNames,
                        filterWords: locationNames.map(loc => loc.split(/[\s,]+/).filter(w => w.length > 2)),
                        profileWords: profileLocation.split(/[\s,]+/).filter(w => w.length > 2)
                    });
                } else {
                    const matchedFilter = locationNames.find(locName => {
                        if (profileLocation.includes(locName)) return true;
                        if (locName.includes(profileLocation) && profileLocation.length > 2) return true;
                        const filterWords = locName.split(/[\s,]+/).filter(w => w.length > 2);
                        const profileWords = profileLocation.split(/[\s,]+/).filter(w => w.length > 2);
                        return filterWords.some(fw => profileWords.includes(fw));
                    });
                    console.log(`✅ Profile matched location filter:`, {
                        name: profile.fullName,
                        profileLocation: profile.location,
                        matchedFilter: matchedFilter
                    });
                }
                
                return matches;
            });
            
            console.log('🔍 Location filter applied:', { 
                before: beforeLocationFilter, 
                after: filtered.length,
                removed: beforeLocationFilter - filtered.length
            });
        } else {
            console.log('🔍 No location filter applied (filterValues.locations is empty)');
        }

        // Filter by current company (flexible matching like location)
        if (filterValues.currentCompanies && filterValues.currentCompanies.length > 0) {
            const companyNames = filterValues.currentCompanies.map(comp => comp.name.toLowerCase().trim());
            const beforeCompanyFilter = filtered.length;
            
            filtered = filtered.filter(profile => {
                const profileCompany = (profile.company || '').toLowerCase().trim();
                const profileCompany2 = (profile.company2 || '').toLowerCase().trim();
                
                return companyNames.some(compName => {
                    // Direct match: profile company contains filter company name
                    if (profileCompany.includes(compName) || profileCompany2.includes(compName)) {
                        return true;
                    }
                    // Reverse match: filter company name contains profile company
                    if ((compName.includes(profileCompany) && profileCompany.length > 2) ||
                        (compName.includes(profileCompany2) && profileCompany2.length > 2)) {
                        return true;
                    }
                    // Word-by-word match
                    const filterWords = compName.split(/[\s,]+/).filter(w => w.length > 2);
                    const companyWords = profileCompany.split(/[\s,]+/).filter(w => w.length > 2);
                    const company2Words = profileCompany2.split(/[\s,]+/).filter(w => w.length > 2);
                    return filterWords.some(fw => companyWords.includes(fw) || company2Words.includes(fw));
                });
            });
            
            console.log('🔍 Company filter applied:', { 
                before: beforeCompanyFilter, 
                after: filtered.length,
                removed: beforeCompanyFilter - filtered.length
            });
        }

        // Filter by past company (flexible matching)
        if (filterValues.pastCompanies && filterValues.pastCompanies.length > 0) {
            const pastCompanyNames = filterValues.pastCompanies.map(comp => comp.name.toLowerCase().trim());
            const beforePastCompanyFilter = filtered.length;
            
            filtered = filtered.filter(profile => {
                const profileCompany2 = (profile.pastCompany || profile.company2 || '').toLowerCase().trim();
                const profileHeadline = (profile.headline || '').toLowerCase();
                
                return pastCompanyNames.some(compName => {
                    // Check company2 and headline for past company mentions
                    if (profileCompany2.includes(compName) || profileHeadline.includes(compName)) {
                        return true;
                    }
                    // Reverse match
                    if ((compName.includes(profileCompany2) && profileCompany2.length > 2)) {
                        return true;
                    }
                    // Word-by-word match
                    const filterWords = compName.split(/[\s,]+/).filter(w => w.length > 2);
                    const company2Words = profileCompany2.split(/[\s,]+/).filter(w => w.length > 2);
                    return filterWords.some(fw => company2Words.includes(fw));
                });
            });
            
            console.log('🔍 Past company filter applied:', { 
                before: beforePastCompanyFilter, 
                after: filtered.length,
                removed: beforePastCompanyFilter - filtered.length
            });
        }

        // Filter by industry (flexible matching)
        if (filterValues.industries && filterValues.industries.length > 0) {
            const industryNames = filterValues.industries.map(ind => ind.name.toLowerCase().trim());
            const beforeIndustryFilter = filtered.length;
            
            filtered = filtered.filter(profile => {
                const profileIndustry = (profile.industry || '').toLowerCase().trim();
                
                return industryNames.some(indName => {
                    // Direct match
                    if (profileIndustry.includes(indName)) {
                        return true;
                    }
                    // Reverse match
                    if (indName.includes(profileIndustry) && profileIndustry.length > 2) {
                        return true;
                    }
                    // Word-by-word match
                    const filterWords = indName.split(/[\s,]+/).filter(w => w.length > 2);
                    const industryWords = profileIndustry.split(/[\s,]+/).filter(w => w.length > 2);
                    return filterWords.some(fw => industryWords.includes(fw));
                });
            });
            
            console.log('🔍 Industry filter applied:', { 
                before: beforeIndustryFilter, 
                after: filtered.length,
                removed: beforeIndustryFilter - filtered.length
            });
        }

        // Filter by school (flexible matching)
        if (filterValues.schools && filterValues.schools.length > 0) {
            const schoolNames = filterValues.schools.map(sch => sch.name.toLowerCase().trim());
            const beforeSchoolFilter = filtered.length;
            
            filtered = filtered.filter(profile => {
                const profileSchool = (profile.school || '').toLowerCase().trim();
                const profileSchool2 = (profile.school2 || '').toLowerCase().trim();
                
                return schoolNames.some(schName => {
                    // Direct match
                    if (profileSchool.includes(schName) || profileSchool2.includes(schName)) {
                        return true;
                    }
                    // Reverse match
                    if ((schName.includes(profileSchool) && profileSchool.length > 2) ||
                        (schName.includes(profileSchool2) && profileSchool2.length > 2)) {
                        return true;
                    }
                    // Word-by-word match
                    const filterWords = schName.split(/[\s,]+/).filter(w => w.length > 2);
                    const schoolWords = profileSchool.split(/[\s,]+/).filter(w => w.length > 2);
                    const school2Words = profileSchool2.split(/[\s,]+/).filter(w => w.length > 2);
                    return filterWords.some(fw => schoolWords.includes(fw) || school2Words.includes(fw));
                });
            });
            
            console.log('🔍 School filter applied:', { 
                before: beforeSchoolFilter, 
                after: filtered.length,
                removed: beforeSchoolFilter - filtered.length
            });
        }
    }

    const total = parseInt($('#afs-total').val());
    if (!isNaN(total) && filtered.length > total) {
        filtered = filtered.slice(0, total);
    }

    return filtered;
}

function mapConnectionDegree(degreeLabel) {
    if (!degreeLabel) {
        return 'OUT_OF_NETWORK';
    }

    const normalized = degreeLabel.toString().toLowerCase();
    if (normalized.includes('1')) return 'DISTANCE_1';
    if (normalized.includes('2')) return 'DISTANCE_2';
    if (normalized.includes('3')) return 'DISTANCE_3';
    return 'OUT_OF_NETWORK';
}

function transformProfilesToConnections(profiles, afcAudienceName) {
    const audienceId = Math.floor(Math.random()*90000) + 10000;
    return profiles.map(profile => {
        const distanceCheck = mapConnectionDegree(profile.connectionDegree);
        const firstName = profile.firstName || '';
        const lastName = profile.lastName || '';
        const name = profile.fullName || `${firstName} ${lastName}`.trim();

        return {
            audienceId: audienceId,
            firstName: firstName,
            lastName: lastName,
            name: name,
            title: profile.headline || '',
            locationName: profile.location || '',
            publicIdentifier: profile.publicIdentifier || null,
            connectionId: profile.connectionId || profile.publicIdentifier || profile.profileUrl,
            totalResultCount: profiles.length,
            memberUrn: profile.memberUrn || null,
            networkDistance: profile.connectionDegreeValue || null,
            trackingId: profile.trackingId || profile.connectionId || profile.publicIdentifier,
            navigationUrl: profile.profileUrl || null,
            targetId: profile.publicIdentifier || null,
            distanceCheck: distanceCheck,
            sourcePost: profile.postUrl || null,
            audienceName: afcAudienceName
        };
    });
}

const newAudience = async (con, afcDelay, afcAudienceName, audienceType, memberBadgesData, networkInfoData, positionGroupsData, companyData) => {
    // post auidence name, id and user linkedin id with a call back of audience id
    
    var json_data = {
        "audienceName": afcAudienceName,
        "audienceId": con[0].audienceId,
        "linkedInId": $('#me-publicIdentifier').val(),
        "audienceType": audienceType
    };

    await $.ajax({
        method: 'post',
        url: `${filterApi}/audience`,
        headers: {
            'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning page
        },
        data: json_data,
        success: function(data){
            console.log('Audience creation response:', data);
            
            // Check if the response has the expected structure
            if(data && data.status === 200 && data.data && data.data.audience) {
                console.log('Audience created successfully:', data.data.audience);
                newAudienceList(data.data.audience, con, memberBadgesData, networkInfoData, positionGroupsData, companyData)
            } else if(data && data.length > 0 && data[0].audienceName) {
                // Fallback for old response format
                console.log('Using fallback response format:', data[0]);
                newAudienceList(data[0].audienceName, con, memberBadgesData, networkInfoData, positionGroupsData, companyData)
            } else {
                console.error('Unexpected response format:', data);
                $('.newAudience-notice').show()
                $('#afc-displayNewAudienceStatus').empty()
                $('#afc-displayNewAudienceStatus').html('Unexpected response format from server')
                $('.newAudienceAction').attr('disabled', false)
            }
        },
        error: function(error){
            console.error('Audience creation error:', error)
            $('.newAudienceAction').attr('disabled', false)
            $('.newAudience-notice').show()
            $('#afc-displayNewAudienceStatus').html('Something went wrong. Please try again.')
        }
    })

}

const newAudienceList = async (audienceData, con, memberBadgesData, networkInfoData, positionGroupsData, companyData) => {
    $('.newAudience-notice').show()
    var x=0, s=0, f=0; // x = saved, s = skipped, f = failed
    var index;
    
    // Extract audience_id from the response data
    let audienceId;
    console.log('Extracting audience_id from audienceData:', audienceData);
    
    if (typeof audienceData === 'object') {
        // Try different possible field names
        audienceId = audienceData.audience_id 
            || audienceData.audienceId 
            || audienceData.id
            || (audienceData.audience && (audienceData.audience.audience_id || audienceData.audience.audienceId || audienceData.audience.id));
        
        if (audienceId) {
            console.log('Using audience_id from response:', audienceId);
        } else {
            console.error('Could not extract audience_id. Available keys:', Object.keys(audienceData));
            console.error('Full audienceData:', JSON.stringify(audienceData, null, 2));
        }
    }
    
    if (!audienceId) {
        console.error('Could not extract audience_id from:', audienceData);
        $('#afc-displayNewAudienceStatus').html('Error: Could not get audience ID. Check console for details.')
        $('.newAudienceAction').attr('disabled', false)
        return;
    }

    console.log('Starting to save connections. Total connections to save:', con.length);
    console.log('Connections array:', con.map(c => ({ name: c.firstName + ' ' + c.lastName, connectionId: c.connectionId })));

    // loop through to post each connections
    for(var i=0; i<con.length; i++){
        if(con[i] && con[i].hasOwnProperty('connectionId')) {
            if(con[i].connectionId) {
                var distance, companyUrl, premium, influencer, jobSeeker, email=null;
                var location = null;

                $.each(networkInfoData,function(x,item){
                    if(con[i].connectionId == item.connectId){
                        distance = item.distance;
                        return false;
                    }
                })
                $.each(companyData,function(x,item){
                    if(con[i].connectionId == item.connectId){
                        companyUrl = item.companyPageUrl;
                        return false;
                    }
                })
                $.each(memberBadgesData,function(x,item){
                    if(con[i].connectionId == item.connectId){
                        premium = item.premium;
                        influencer = item.influencer;
                        jobSeeker = item.jobSeeker;
                        return false;
                    }
                })
                $.each(positionGroupsData,function(x,item){
                    if(con[i].connectionId == item.connectId){
                        location = item.companyLocation;
                        return false;
                    }
                })
                $.each(connectionEmails,function(i,item){
                    if(con[i].connectionId == item.connectionId){
                        email = item.email;
                        return false;
                    }
                })
        
                console.log(`Saving connection ${i+1}/${con.length}:`, {
                    name: con[i].firstName + ' ' + con[i].lastName,
                    connectionId: con[i].connectionId,
                    audienceId: audienceId
                });
        
                // Use a promise to properly handle async in the loop
                await new Promise((resolve, reject) => {
                    // Prepare the payload with networkDistance
                    const payload = {
                        audienceId: audienceId,
                        firstName: con[i].firstName,
                        lastName: con[i].lastName,
                        email: email,
                        title: con[i].title,
                        locationName: con[i].locationName == null ? location : con[i].locationName,
                        publicIdentifier: con[i].publicIdentifier,
                        connectionId: con[i].connectionId,
                        trackingId: con[i].trackingId,
                        memberUrn: con[i].memberUrn,
                        networkDistance: con[i].networkDistance || null // Send network distance to backend
                    };
                    
                    // Log what we're sending (especially networkDistance)
                    console.log(`📊 POST-SCRAPING AUDIENCE: Sending to backend for ${con[i].firstName} ${con[i].lastName}:`, {
                        networkDistance: payload.networkDistance,
                        networkDistance_source: con[i].networkDistance !== undefined ? 'from_con_array' : 'not_found',
                        con_i_keys: Object.keys(con[i]),
                        has_networkDistance_in_con: 'networkDistance' in con[i],
                        connectionDegreeValue: con[i].connectionDegreeValue,
                        full_payload: payload
                    });
                    
                    $.ajax({
                        method: 'post',
                        beforeSend: function(request) {
                            request.setRequestHeader('Content-Type', 'application/json')
                            request.setRequestHeader('lk-id', linkedinId)
                            request.setRequestHeader('ngrok-skip-browser-warning', 'true') // Bypass ngrok warning page
                        },
                        url: `${filterApi}/audience/list`,
                        data: JSON.stringify(payload),
                        success: function(data){
                            console.log(`Connection ${i+1}/${con.length} save response:`, data);
                            if(data.message == 'success'){
                                x++; // Increment actual saved count first
                                var name = con[i].firstName+' '+con[i].lastName;
                                var jobtitle = con[i].title;
                                skipped = s;
                                // Use x (actual saved count) instead of index (loop counter)
                                newAudienceListUpdate(con[i].connectionId, audienceId, distance, companyUrl, name, jobtitle, x, premium, influencer, jobSeeker, skipped)
                                resolve(data);
                            }else if(data.message == 'User already added to audience list'){
                                s++; // Increment skipped count
                                $('#afc-displayNewAudienceStatus').empty()
                                display = `
                                Connection already added to list.
                                `;
                                $('#afc-displayNewAudienceStatus').append(display)
                                resolve(data);
                            } else {
                                resolve(data);
                            }
                        },
                        error: function(error){
                            f++; // Increment failed count
                            console.error(`Error saving connection ${i+1}/${con.length}:`, error)
                            // Don't disable the form or clear status on individual errors
                            // Let the process continue for other connections
                            resolve(error); // Resolve instead of reject to continue loop
                        }
                    })
                })
            }
        }
    }
    $('.newAudienceAction').attr('disabled', false)
    
    // Show completion message
    $('#afc-displayNewAudienceStatus').empty()
    let completionMessage = `
        <li><strong>Audience creation completed!</strong></li>
        <li>Total users added: <b>${x}</b></li>
        <li>Total skipped: <b>${s}</b></li>
    `;
    if (f > 0) {
        completionMessage += `<li>Total failed: <b>${f}</b></li>`;
    }
    $('#afc-displayNewAudienceStatus').html(completionMessage)
    
    // Auto-close form after 3 seconds
    setTimeout(function() {
        $('#audienceCreationForm').modal('hide')
        $('#audienceMenu').modal({backdrop:'static', keyboard:false, show:true})
    }, 3000)
    
    // Refresh the audience table after successful creation
    if(typeof getAudienceNameList === 'function') {
        getAudienceNameList();
    }
}

const newAudienceListUpdate = async (connectionId,audienceId,distance,companyUrl,name,jobtitle,index,premium,influencer,jobSeeker,skipped) => {
    var display = '';
    // update connection data using audience id and connection id (unique)

    console.log(`Updating connection ${index}:`, {
        connectionId: connectionId,
        audienceId: audienceId,
        name: name,
        distance: distance,
        companyUrl: companyUrl
    });

    await $.ajax({
        method: 'put',
        beforeSend: function(request) {
            request.setRequestHeader('Content-Type', 'application/json')
            request.setRequestHeader('lk-id', linkedinId)
            request.setRequestHeader('ngrok-skip-browser-warning', 'true') // Bypass ngrok warning page
        },
        url: `${filterApi}/audience/list`,
        data: JSON.stringify({
            audienceId:  audienceId,
            connectionId: connectionId,
            networkDistance: distance,
            premium: premium,
            influencer: influencer,
            jobSeeker: jobSeeker,
            companyUrl: companyUrl
        }),
        success: function(data){
            console.log(`Connection ${index} update response:`, data);
            if(data.message == 'success'){
                $('#afc-displayNewAudienceStatus').empty()
                if(skipped > 0){
                    display = `
                    <li> Adding: <b>${name}</b></li>
                    <li> Title: <b>${jobtitle}</b></li>
                    <li> Users added: <b> ${index} </b></li>
                    <li> Total skipped: <b>${skipped} </b></li>
                    <li> Reason: Connection already exist in list</li>
                `;
                }else{
                    display = `
                    <li> Adding: <b>${name}</b></li>
                    <li> Title: <b>${jobtitle}</b></li>
                    <li> Users added: <b> ${index} </b></li>
                    <li> Total skipped: <b>${skipped} </b></li>
                `;
                }
                $('#afc-displayNewAudienceStatus').append(display)
            } else {
                console.error(`Failed to update connection ${index}:`, data);
            }
        },
        error: function(error){
            console.error(`Error updating connection ${index}:`, error);
        }
    })
}

// Helper function to test keyword strategies
window.testKeywordStrategy = function() {
    console.log('=== KEYWORD STRATEGY TESTER ===');
    console.log('Current positive keywords:', getConnectParams.positiveKeywords);
    console.log('Current negative keywords:', getConnectParams.negativeKeywords);
    
    // Sample titles from your search results
    const sampleTitles = [
        'Rohit Sharma - Software Development Manager at Amazon Ads',
        'Saheel Mayekar - MS CS @ University of Southern California',
        'Ruth Iselema - Chief Executive Officer',
        'Ishita Ganotra - Product Manager @ Meta',
        'Shivam Jalotra - senior swe',
        'Josh Tupas - Software Engineer',
        'Oluwatosin Olushola - Human Resources | Performance Management',
        'Jennifer Cahalen - Google Staffing',
        'Abuchi Okeke - Senior Software Engineer at Walmart',
        'Vincent Monteiro - Recruiter'
    ];
    
    console.log('\n=== TESTING CURRENT KEYWORDS ===');
    sampleTitles.forEach(title => {
        const titleLower = title.toLowerCase();
        const hasPositiveMatch = getConnectParams.positiveKeywords ? 
            getConnectParams.positiveKeywords.split(',').some(keyword => 
                titleLower.includes(keyword.trim().toLowerCase())
            ) : false;
        
        console.log(`${hasPositiveMatch ? '✅' : '❌'} "${title}"`);
    });
    
    console.log('\n=== SUGGESTED KEYWORDS ===');
    console.log('Try these broader keywords that might match more profiles:');
    console.log('- "manager" (matches: Software Development Manager, Product Manager)');
    console.log('- "engineer" (matches: Software Engineer, Senior Software Engineer)');
    console.log('- "recruiter" (matches: Recruiter, Google Staffing)');
    console.log('- "executive" (matches: Chief Executive Officer)');
    console.log('- "senior" (matches: Senior Software Engineer)');
    console.log('- "product" (matches: Product Manager)');
    console.log('- "development" (matches: Software Development Manager)');
    
    console.log('\n=== QUICK FIXES ===');
    console.log('1. Clear keywords to get all results:');
    console.log('   getConnectParams.positiveKeywords = "";');
    console.log('   getConnectParams.negativeKeywords = "";');
    console.log('');
    console.log('2. Use broader keywords:');
    console.log('   getConnectParams.positiveKeywords = "manager,engineer,recruiter";');
    console.log('');
    console.log('3. Use negative keywords instead:');
    console.log('   getConnectParams.positiveKeywords = "";');
    console.log('   getConnectParams.negativeKeywords = "student,intern,unemployed";');
};

// Helper function to clear keywords and restart search
window.clearKeywordsAndRestart = function() {
    console.log('Clearing keywords and restarting search...');
    getConnectParams.positiveKeywords = '';
    getConnectParams.negativeKeywords = '';
    getConnectParams.startPosition = 0;
    audConnectionItems = [];
    
    $('#afc-displayNewAudienceStatus').html('<i class="fas fa-spinner fa-spin"></i> Restarting search without keywords...');
    $('.newAudienceAction').attr('disabled', true);
    
    setTimeout(() => {
        fsGetConnections();
    }, 1000);
};

// Helper function to use broader keywords
window.useBroaderKeywords = function() {
    console.log('Using broader keywords...');
    getConnectParams.positiveKeywords = 'manager,engineer,recruiter,executive,senior,product,development';
    getConnectParams.startPosition = 0;
    audConnectionItems = [];
    
    $('#afc-displayNewAudienceStatus').html('<i class="fas fa-spinner fa-spin"></i> Restarting search with broader keywords...');
    $('.newAudienceAction').attr('disabled', true);
    
    setTimeout(() => {
        fsGetConnections();
    }, 1000);
};
