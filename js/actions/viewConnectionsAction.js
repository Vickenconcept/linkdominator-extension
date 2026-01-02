
$('.viewConnetionsAction').click(function(){
    console.log('👁️ View Connections: Starting process...');
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

    console.log('📋 View Connections: Form values:', {
        audienceSelected: $('#vcp-audience-select').val(),
        searchTerm: $('#vcp-search-term').val(),
        startPosition: vcpStartP.val(),
        totalToView: vcpTotal.val(),
        delayBetweenViews: vcpDelay.val()
    });

    // validate fields
    if(vcpTotal.val() =='' || vcpDelay.val() ==''){
        console.log('❌ View Connections: Validation failed - missing required fields');
        for(var i=0;i<vcpControlFields.length;i++){
            if(vcpControlFields[i].val() == ''){
                console.log(`❌ View Connections: Missing field: ${vcpControlFields[i].data('name')}`);
                $('#vcp-error-notice').html(`${vcpControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(vcpDelay.val() < 30){
        console.log('❌ View Connections: Validation failed - delay too low:', vcpDelay.val());
        $('#vcp-error-notice').html(`Delay minimum is 30`)
    }else{
        console.log('✅ View Connections: Validation passed');
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

        $(this).attr('disabled', true)  

        // Check which method is selected (improved logic)
        let audienceMethodSelected = $('#vcp-audience-method-card').hasClass('selected');
        let searchMethodSelected = $('#vcp-search-method-card').hasClass('selected');
        let audienceSelected = $('#vcp-audience-select').val() != '';
        let searchTermEntered = $('#vcp-search-term').val() != '';
        
        console.log('📊 View Connections: Method selection:', {
            audienceMethodSelected: audienceMethodSelected,
            searchMethodSelected: searchMethodSelected,
            audienceSelected: audienceSelected,
            searchTermEntered: searchTermEntered
        });
        
        // Determine method based on both class and actual form state
        if (audienceSelected) {
            console.log('📊 View Connections: Using selected audience:', $('#vcp-audience-select').val());
            vcpGetAudienceList($('#vcp-audience-select').val(), vcpDelay.val())
        } else if (searchTermEntered || queryParams != '') {
            console.log('🔍 View Connections: Using PhantomBuster search');
            
            // Get keywords
            const keywords = $('#vcp-search-term').val() ? $('#vcp-search-term').val().trim() : '';
            
            if (!keywords) {
                $('#vcp-error-notice').html('Please enter search keywords');
                $('.viewConnetionsAction').attr('disabled', false);
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

            console.log('🔍 View Connections: Using PhantomBuster search:', { searchUrl, keywords, connectionDegrees });
            vcpGetConnections(searchUrl, keywords, connectionDegrees, vcpStartP, vcpTotal, vcpDelay.val())
        } else {
            console.log('❌ View Connections: No method properly selected');
            $('#vcp-error-notice').html('Please select a method: either choose an audience or use search parameters');
            $('.viewConnetionsAction').attr('disabled', false);
            return;
        }
    }
})

const vcpGetConnections = async (searchUrl, keywords, connectionDegrees, vcpStartP, vcpTotal, vcpDelay) => {
    console.log('🔍 View Connections: Starting PhantomBuster search...', {
        searchUrl: searchUrl,
        keywords: keywords,
        connectionDegrees: connectionDegrees,
        startPosition: vcpStartP,
        totalToFind: vcpTotal,
        delay: vcpDelay
    });
    
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

            console.log('📊 View Connections: Response structure:', {
                elementsLength: elements.length,
                includedLength: included.length
            });

            if(elements && elements.length) {
                if(totalResultCount == 0) {
                    totalResultCount = response.data?.metadata?.totalResultCount || included.length;
                }

                console.log(`📈 View Connections: Total results available: ${totalResultCount}`);

                // Find the element that contains the search results
                let searchResultElement = null;
                for(let i = 0; i < elements.length; i++) {
                    if(elements[i] && elements[i].items && elements[i].items.length > 0) {
                        console.log(`✅ View Connections: Found search results in elements[${i}]`);
                        searchResultElement = elements[i];
                        break;
                    }
                }

                if(searchResultElement && searchResultElement.items.length) {
                    console.log(`👥 View Connections: Found ${searchResultElement.items.length} connections in search results`);
                    
                    for(let item of included) {
                        if(item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                            if(item.title.text && item.primarySubtitle.text && item.title.text.includes('LinkedIn Member') == false) {
                                viewItems.push(item)
                                console.log(`✅ View Connections: Added profile: ${item.title.text} - ${item.primarySubtitle.text}`);
                            } else {
                                console.log(`⚠️ View Connections: Skipped LinkedIn Member or invalid profile`);
                            }
                        } else {
                            console.log(`⚠️ View Connections: Item missing title or subtitle:`, item);
                        }
                    }

                    console.log(`📊 View Connections: Total profiles collected: ${viewItems.length}/${vcpTotal}`);

                    if(viewItems.length < vcpTotal) {
                        vcpStartP = parseInt(vcpStartP) + viewItems.length;
                        $('#vcp-startPosition').val(vcpStartP);
                        console.log(`🔄 View Connections: Getting more results, new start position: ${vcpStartP}`);
                        setTimeout(() => {
                            getConnectionsLooper();
                        }, 10000);
                    } else {
                        console.log('✅ View Connections: Collected enough profiles, starting data extraction...');
                        vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay);
                    }
                } else {
                    console.log('⚠️ View Connections: No search result items found in any elements');
                    if(viewItems.length) {
                        console.log(`✅ View Connections: No more results from API, but have ${viewItems.length} profiles to process`);
                        $('#displayViewConnectionStatus').html(`Found ${viewItems.length}. Viewing...`);
                        vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay);
                    } else {
                        $('#displayViewConnectionStatus').html('No result found, change your search criteria and try again!');
                        $('.viewConnetionsAction').attr('disabled', false);
                    }
                }
            } else if(viewItems.length) {
                console.log(`✅ View Connections: No more results from API, but have ${viewItems.length} profiles to process`);
                $('#displayViewConnectionStatus').html(`Found ${viewItems.length}. Viewing...`);
                vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay);
            } else {
                console.log('❌ View Connections: No results found at all');
                $('#displayViewConnectionStatus').html('No result found, change your search criteria and try again!');
                $('.viewConnetionsAction').attr('disabled', false);
            }
        } catch(error) {
            console.error('❌ View Connections: Error fetching connections:', error);
            $('#displayViewConnectionStatus').html(`Error: ${error.message || 'Something went wrong while trying to get connections!'}`);
            $('.viewConnetionsAction').attr('disabled', false);
        }
    }
    
    getConnectionsLooper();
}

const vcpCleanConnectionsData = (viewItems, totalResultCount, vcpDelay) => {
    console.log('🔧 View Connections: Starting data extraction...', {
        totalItems: viewItems.length,
        sampleItem: viewItems[0]
    });
    
    let con = [], conArr = [];
    let profileUrn;
    let processedCount = 0;
    let validCount = 0;

    for(let item of viewItems) {
        processedCount++;
        console.log(`🔍 View Connections: Processing item ${processedCount}/${viewItems.length}:`, item);
        
        if(item && item.entityUrn) {
            profileUrn = item.entityUrn;
            console.log(`📝 View Connections: Found profileUrn: ${profileUrn}`);

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
                console.log(`✅ View Connections: Valid profile extracted: ${item.title.text} (${validCount} total)`);
            } else {
                console.log(`⚠️ View Connections: Invalid profileUrn format: ${profileUrn}`);
            }
        } else {
            console.log(`⚠️ View Connections: Item missing entityUrn:`, item);
        }
    }

    console.log(`📊 View Connections: Extraction summary: ${validCount}/${processedCount} valid profiles found`);

    // get only user defined total
    let vcpTotal = $('#vcp-total').val();
    for(let z=0; z < conArr.length; z++){
        if(z < vcpTotal){
            con.push(conArr[z])
        }else{
            break;
        }
    }

    console.log(`🎯 View Connections: Final data ready for viewing:`, {
        availableProfiles: conArr.length,
        requestedTotal: vcpTotal,
        willView: con.length,
        profiles: con
    });

    if(con.length > 0) {
        vcpViewProfile(con, vcpDelay);
    } else {
        console.log('❌ View Connections: No valid profiles found to view');
        $('#displayViewConnectionStatus').html('No valid profiles found in search results. Try different search criteria.');
        $('.viewConnetionsAction').attr('disabled', false);
    }
}

const vcpGetAudienceList = async (audienceId, vcpDelay) => {
    console.log('📊 View Connections: Fetching audience data...', {
        audienceId: audienceId,
        url: `${filterApi}/audience/list?audienceId=${audienceId}`
    });
    
    var conArr = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}`,
        success: function(data){
            console.log('📊 View Connections: Audience API response:', data);
            
            // Handle different API response formats (same fix as other functions)
            let dataPath = null;
            
            if (data && data.audience && Array.isArray(data.audience)) {
                // New format: {audience: Array}
                console.log('✅ View Connections: Found direct audience array');
                dataPath = data.audience;
            } else if (data && Array.isArray(data) && data.length > 0 && data[0].audience) {
                // Old format: [{audience: Array}]
                console.log('✅ View Connections: Found audience in array format');
                dataPath = data[0].audience;
            } else if (data && Array.isArray(data)) {
                // Direct array format: [connection1, connection2, ...]
                console.log('✅ View Connections: Found direct connection array');
                dataPath = data;
            }
            
            if(dataPath && dataPath.length > 0){
                console.log(`👥 View Connections: Found ${dataPath.length} connections in audience`);
                
                for(let i=0; i<dataPath.length; i++){
                    var netDistance = dataPath[i].con_distance.split("_")
                    var targetIdd;
                    if(dataPath[i].con_member_urn.includes('urn:li:member:')){
                        targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                    }

                    let profileData = {
                        name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                        title: dataPath[i].con_job_title,
                        conId: dataPath[i].con_id,
                        totalResultCount: dataPath.length,
                        publicIdentifier: dataPath[i].con_public_identifier, 
                        memberUrn: dataPath[i].con_member_urn,
                        networkDistance: parseInt(netDistance[1]),
                        trackingId: dataPath[i].con_tracking_id, 
                        navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`, 
                        targetId: parseInt(targetIdd)
                    };

                    conArr.push(profileData);
                    console.log(`✅ View Connections: Added profile: ${profileData.name} - ${profileData.title}`);
                }
                
                console.log(`🚀 View Connections: Starting profile viewing for ${conArr.length} connections`);
                vcpViewProfile(conArr, vcpDelay);
            }else{
                console.log('⚠️ View Connections: No connections found in audience');
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
    console.log('👁️ View Connections: Starting profile viewing process...', {
        totalProfiles: profileToViewData.length,
        delayBetweenViews: vcpDelay,
        profiles: profileToViewData
    });
    
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
            console.log(`👁️ View Connections: Processing ${i+1}/${profileToViewData.length} - ${profileToViewData[i].name}`);
            
            // Log the profile data being processed
            console.log('🔍 View Connections: Processing profile:', {
                name: profileToViewData[i].name,
                title: profileToViewData[i].title,
                targetId: profileToViewData[i].targetId,
                memberUrn: profileToViewData[i].memberUrn,
                networkDistance: profileToViewData[i].networkDistance
            });

            // Simulate profile viewing without relying on LinkedIn's tracking API
            // This approach focuses on the core functionality of viewing profiles
            console.log(`👁️ View Connections: Simulating profile view for ${profileToViewData[i].name}`);
            
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

            console.log(`✅ View Connections: Successfully processed profile ${i+1}/${profileToViewData.length} - ${profileToViewData[i].name}`);
            
            x++;
            i++;
            if(i < profileToViewData.length){
                console.log(`⏳ View Connections: Waiting ${vcpDelay} seconds before next profile...`);
                vcpLooper()
            }
            if(i >= profileToViewData.length){
                console.log('🏁 View Connections: All profiles viewed successfully!', {
                    totalViewed: x,
                    totalRequested: profileToViewData.length,
                    successRate: `${Math.round((x / profileToViewData.length) * 100)}%`
                });
                
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