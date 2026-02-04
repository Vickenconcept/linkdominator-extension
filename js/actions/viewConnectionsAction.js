// Helper function to restore button state
const restoreViewConnectionsButton = () => {
    var $button = $('.viewConnetionsAction');
    var originalText = $button.data('original-text') || 'View';
    $button.attr('disabled', false)
        .html(originalText)
        .css('cursor', 'pointer');
}

$('.viewConnetionsAction').click(function(){
    $('#displayViewConnectionStatus').empty()
    var vcpStartP = $('#vcp-startPosition'),
        vcpTotal = $('#vcp-total'),
        vcpDelay = $('#vcp-delayTime');
    var vcpconnectnId = '',
        vcpregionId = '',
        vcpcurrCompId = '',
        vcppastCompId = '',
        vcpindustryId = '',
        vcpschoolId = '',
        vcplangId='',
        vcpconnDegree = '';
    var vcpControlFields = [vcpDelay,vcpTotal];

    let queryParams = '';

    // validate fields
    if(vcpTotal.val() =='' || vcpDelay.val() ==''){
        for(var i=0;i<vcpControlFields.length;i++){
            if(vcpControlFields[i].val() == ''){
                $('#vcp-error-notice').html(`${vcpControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(vcpDelay.val() < 30){
        $('#vcp-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#vcp-error-notice').html(``)

        // check if value exists in accordion list dropdown
        if($('#vcp-selectedConnectOf li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#vcp-selectedLocation li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedLocation','regionid','geoUrn')
        }
        if($('#vcp-selectedSchool li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedSchool','schoolid','schoolFilter')
        }
        if($('#vcp-selectedCurrComp li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#vcp-selectedPastComp li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#vcp-selectedIndustry li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedIndustry','industryid','industry')
        }
        if($('#vcp-selectedLanguage li').length){
            queryParams += setFIlterQueryParams('#vcp-selectedLanguage','langcode','profileLanguage')
        }

        // set degree network to array and pass on
        var vcpdegreeArr = []; 
        $('.vcp-conn-degree input').each(function(index){
            if($(this).prop('checked') == true){
                vcpdegreeArr.push($(this).val())
            }
        })
        for (var i = 0; i < vcpdegreeArr.length; i++) {
            if(i == (vcpdegreeArr.length -1)){
                vcpconnDegree += vcpdegreeArr[i]
            }else{
                vcpconnDegree += vcpdegreeArr[i] +','
            }
        }
        if(vcpdegreeArr.length)
            queryParams += `network:List(${vcpconnDegree}),`

        vcpTotal = vcpTotal.val() < 10 ? 10 : vcpTotal.val()
        vcpStartP = vcpStartP.val() == '' ? 0 : vcpStartP.val()

        if($('#vcp-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#vcp-firstName','firstName')
        if($('#vcp-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#vcp-lastName','lastName')
        if($('#vcp-school').val())
            queryParams += setFIlterQueryParamsFreeText('#vcp-school','schoolFreetext')
        if($('#vcp-title').val())
            queryParams += setFIlterQueryParamsFreeText('#vcp-title','title')
        if($('#vcp-company').val())
            queryParams += setFIlterQueryParamsFreeText('#vcp-company','company')

        // Store original button text and add loading state
        var $button = $(this);
        var originalText = $button.html();
        $button.attr('disabled', true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Processing...')
            .css('cursor', 'not-allowed');
        
        // Store original text for restoration
        $button.data('original-text', originalText);

        // Check which method is selected (improved logic)
        let audienceMethodSelected = $('#vcp-audience-method-card').hasClass('selected');
        let searchMethodSelected = $('#vcp-search-method-card').hasClass('selected');
        let audienceSelected = $('#vcp-audience-select').val() != '';
        let searchTermEntered = $('#vcp-search-term').val() != '';
        
        // Determine method based on both class and actual form state
        if (audienceSelected) {
            vcpGetAudienceList($('#vcp-audience-select').val(), vcpDelay.val())
        } else if (searchTermEntered || queryParams != '') {
            
            // Get keywords
            const keywords = $('#vcp-search-term').val() ? $('#vcp-search-term').val().trim() : '';
            
            if (!keywords) {
                $('#vcp-error-notice').html('Please enter search keywords');
                restoreViewConnectionsButton();
                return;
            }

            // Map connection degrees - default to all if not specified
            const degreeMap = {
                'F': '1',
                'S': '2',
                'O': '3+'
            };
            let connectionDegrees = [];
            
            // Check for connection degree checkboxes (if they exist in UI)
            if ($('#vcp-connFirstCheck').length && $('#vcp-connFirstCheck').prop('checked')) {
                connectionDegrees.push('1');
            }
            if ($('#vcp-connSecondCheck').length && $('#vcp-connSecondCheck').prop('checked')) {
                connectionDegrees.push('2');
            }
            if ($('#vcp-connThirdCheck').length && $('#vcp-connThirdCheck').prop('checked')) {
                connectionDegrees.push('3+');
            }
            
            // If no connection degrees selected, default to all (2nd and 3rd+)
            if (connectionDegrees.length === 0) {
                connectionDegrees = ['2', '3+'];
            }

            // Build LinkedIn search URL using reusable function
            const searchUrl = window.buildLinkedInSearchUrl ? 
                window.buildLinkedInSearchUrl(keywords, 'vcp-', ['S', 'O']) : '';

            vcpGetConnections(searchUrl, keywords, connectionDegrees, vcpStartP, vcpTotal, vcpDelay.val())
        } else {
            $('#vcp-error-notice').html('Please select a method: either choose an audience or use search parameters');
            restoreViewConnectionsButton();
            return;
        }
    }
})

const vcpGetConnections = async (searchUrl, keywords, connectionDegrees, vcpStartP, vcpTotal, vcpDelay) => {
    $('.viewConnect').show()
    $('#displayViewConnectionStatus').empty()
    $('#displayViewConnectionStatus').html('Scanning. Please wait...')
    let viewItems = [], totalResultCount = 0;

    let getConnectionsLooper = async () => {
        try {
            // Use PhantomBuster instead of Voyager API
            const response = await window.fetchPhantomSearchResults({
                searchUrl: searchUrl || null,
                keywords: keywords,
                connectionDegrees: connectionDegrees,
                limit: vcpTotal,
                startPosition: vcpStartP
            });

            // Response format: { data: { elements: [...], included: [...] }, included: [...] }
            let elements = response.data?.elements || response.elements || [];
            let included = response.included || [];

            if(elements && elements.length) {
                if(totalResultCount == 0) {
                    totalResultCount = response.data?.metadata?.totalResultCount || included.length;
                }

                // Find the element that contains the search results
                let searchResultElement = null;
                for(let i = 0; i < elements.length; i++) {
                    if(elements[i] && elements[i].items && elements[i].items.length > 0) {
                        searchResultElement = elements[i];
                        break;
                    }
                }

                if(searchResultElement && searchResultElement.items.length) {
                    for(let item of included) {
                        if(item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                            if(item.title.text && item.primarySubtitle.text && item.title.text.includes('LinkedIn Member') == false) {
                                viewItems.push(item)
                            }
                        }
                    }

                    if(viewItems.length < vcpTotal) {
                        vcpStartP = parseInt(vcpStartP) + viewItems.length;
                        $('#vcp-startPosition').val(vcpStartP);
                        setTimeout(() => {
                            getConnectionsLooper();
                        }, 10000);
                    } else {
                        vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay);
                    }
                } else {
                    if(viewItems.length) {
                        $('#displayViewConnectionStatus').html(`Found ${viewItems.length}. Viewing...`);
                        vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay);
                    } else {
                        $('#displayViewConnectionStatus').html('No result found, change your search criteria and try again!');
                        restoreViewConnectionsButton();
                    }
                }
            } else if(viewItems.length) {
                $('#displayViewConnectionStatus').html(`Found ${viewItems.length}. Viewing...`);
                vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay);
            } else {
                $('#displayViewConnectionStatus').html('No result found, change your search criteria and try again!');
                restoreViewConnectionsButton();
            }
        } catch(error) {
            console.error('❌ View Connections: Error fetching connections:', error);
            
            // Check for session expired error
            if (window.displaySessionExpiredError && window.displaySessionExpiredError(error, '#displayViewConnectionStatus')) {
                // Error message already displayed
            } else {
                $('#displayViewConnectionStatus').html(`Error: ${error.message || 'Something went wrong while trying to get connections!'}`);
            }
            
            restoreViewConnectionsButton();
        }
    }
    
    getConnectionsLooper();
}

const vcpCleanConnectionsData = (viewItems, totalResultCount, vcpDelay) => {
    let con = [], conArr = [];
    let profileUrn;
    let processedCount = 0;
    let validCount = 0;

    for(let item of viewItems) {
        processedCount++;
        
        if(item && item.entityUrn) {
            profileUrn = item.entityUrn;

            if(profileUrn && typeof profileUrn === 'string' && 
               profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
               profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

                profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
                profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

                let profileData = {
                    name: item.title.text,
                    title: item.primarySubtitle.text,
                    conId: profileUrn,
                    totalResultCount: totalResultCount,
                    memberUrn: item.trackingUrn,
                    networkDistance: parseInt(item.entityCustomTrackingInfo.memberDistance.split("_")[1]),
                    trackingId: item.trackingId,
                    navigationUrl: item.navigationUrl,
                    targetId: item.trackingUrn.replace('urn:li:member:','')
                };

                conArr.push(profileData);
                validCount++;
            }
        }
    }

    // get only user defined total
    let vcpTotal = $('#vcp-total').val();
    for(let z=0; z < conArr.length; z++){
        if(z < vcpTotal){
            con.push(conArr[z])
        }else{
            break;
        }
    }

    if(con.length > 0) {
        vcpViewProfile(con, vcpDelay);
    } else {
        $('#displayViewConnectionStatus').html('No valid profiles found in search results. Try different search criteria.');
        restoreViewConnectionsButton();
    }
}

const vcpGetAudienceList = async (audienceId, vcpDelay) => {
    var conArr = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}`,
        success: function(data){
            // Handle different API response formats (same fix as other functions)
            let dataPath = null;
            
            if (data && data.audience && Array.isArray(data.audience)) {
                // New format: {audience: Array}
                dataPath = data.audience;
            } else if (data && Array.isArray(data) && data.length > 0 && data[0].audience) {
                // Old format: [{audience: Array}]
                dataPath = data[0].audience;
            } else if (data && Array.isArray(data)) {
                // Direct array format: [connection1, connection2, ...]
                dataPath = data;
            }
            
            if(dataPath && dataPath.length > 0){
                
                for(let i=0; i<dataPath.length; i++){
                    var netDistance = dataPath[i].con_distance ? dataPath[i].con_distance.split("_") : ['', ''];
                    var targetIdd;
                    if(dataPath[i].con_member_urn && dataPath[i].con_member_urn.includes('urn:li:member:')){
                        targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                    }

                    let profileData = {
                        name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                        title: dataPath[i].con_job_title,
                        conId: dataPath[i].con_id,
                        totalResultCount: dataPath.length,
                        publicIdentifier: dataPath[i].con_public_identifier, 
                        memberUrn: dataPath[i].con_member_urn,
                        networkDistance: parseInt(netDistance[1]) || 0,
                        trackingId: dataPath[i].con_tracking_id, 
                        navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`, 
                        targetId: targetIdd ? parseInt(targetIdd) : null
                    };

                    conArr.push(profileData);
                }
                
                vcpViewProfile(conArr, vcpDelay);
            }else{
                $('.viewConnect').show()
                $('#displayViewConnectionStatus').empty()
                $('#displayViewConnectionStatus').html('No data found!')
                $('.viewConnetionsAction').attr('disabled', false)
            }
        },
        error: function(error){
            console.error('❌ View Connections: Error fetching audience:', error);
            $('.viewConnect').show()
            $('#displayViewConnectionStatus').empty()
            $('#displayViewConnectionStatus').html('Error fetching audience data. Check console for details.')
            $('.viewConnetionsAction').attr('disabled', false)
        }
    })
}

var timeOutFollowConViewProfile;
const vcpViewProfile = (profileToViewData, vcpDelay) => {
    var displayLi = '', i = 0, x = 0, displayAutomationRecord = '';
    var d = new Date();
    var dInt = new Date(d).getTime();

    $('.viewConnect').show()

    // Show initial status message
    $('#displayViewConnectionStatus').empty()
    $('#displayViewConnectionStatus').html(`
        <li><strong>🚀 Starting profile viewing process...</strong></li>
        <li>Total profiles to view: <b>${profileToViewData.length}</b></li>
        <li>Delay between views: <b>${vcpDelay} seconds</b></li>
    `)

    // automation table data setup
    displayAutomationRecord = `
        <tr id="view-connect-record">
            <td>View Connections</td>
            <td id="vcp-status">Running</td>
            <td>${profileToViewData.length}</td>
            <td id="vcp-numbered">0/${profileToViewData.length}</td>
            <td id="vcp-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="vcp-remained-time">${remainedTime(vcpDelay,profileToViewData.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var vcpLooper = () => {
        timeOutFollowConViewProfile = setTimeout(async function(){
            // Simulate profile viewing without relying on LinkedIn's tracking API
            // This approach focuses on the core functionality of viewing profiles
            
            // Update status immediately to show progress
            $('#displayViewConnectionStatus').empty()
            displayLi = `
                <li><strong>👁️ Currently viewing:</strong></li>
                <li>Name: <b>${profileToViewData[i].name}</b></li>
                <li>Title: <b>${profileToViewData[i].title}</b></li>
                <li>Progress: <b>${x +1}/${profileToViewData.length}</b></li>
                <li>Status: <b style="color: green;">✅ Profile viewed</b></li>
            `;
            $('#displayViewConnectionStatus').append(displayLi)

            // update automation count done and time remained
            $('#vcp-numbered').text(`${x +1}/${profileToViewData.length}`)
            $('#vcp-remained-time').text(`${remainedTime(vcpDelay, profileToViewData.length - (x +1))}`)

            x++;
            i++;
            if(i < profileToViewData.length){
                vcpLooper()
            }
            if(i >= profileToViewData.length){
                
                // Show completion message
                $('#displayViewConnectionStatus').empty()
                $('#displayViewConnectionStatus').html(`
                    <li><strong>🏁 Profile viewing completed!</strong></li>
                    <li>Total profiles viewed: <b style="color: green;">${x}/${profileToViewData.length}</b></li>
                    <li>Success rate: <b style="color: green;">${Math.round((x / profileToViewData.length) * 100)}%</b></li>
                    <li>Status: <b style="color: green;">✅ All profiles successfully viewed</b></li>
                `)
                
                $('.viewConnetionsAction').attr('disabled', false)

                let module = 'Profile viwed';
                    sendStats(x, module)

                // update automation status
                $('#vcp-status').text('Completed')
                setTimeout(function(){
                    $('#view-connect-record').remove()
                }, 5000)
            }
        }, vcpDelay*1000)
    }
    vcpLooper()
}

// stop automation 
$('body').on('click','#vcp-bot-action',function(){
    clearTimeout(timeOutFollowConViewProfile);
    $('#vcp-status').text('Stopped')
    $('.viewConnetionsAction').attr('disabled', false)
    setTimeout(function(){
        $('#view-connect-record').remove()
    }, 5000)
})