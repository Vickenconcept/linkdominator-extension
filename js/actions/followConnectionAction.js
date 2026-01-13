
$('body').on('click', '.followConnect', function(){
    $('#displayFollowStatus').empty()
    var totalFollow = $('#totalFollow').val() < 10 ? 10 : $('#totalFollow').val(),
        delayFollowTime = $('#delayFollowTime').val(),
        start = $('#startPosition').val() == '' ? 0 : $('#startPosition').val(),
        schoolId = '',
        connectionId = '',
        regionId = '',
        currCompId = '',
        pastCompId = '',
        industryId = '',
        langId='',
        connDegree = '';

    console.log('FLC Start clicked', {
        total: totalFollow,
        delay: delayFollowTime,
        startPosition: start,
        audienceSelected: $('#audience-select').val(),
        searchTerm: $('#search-term').val()
    });
    var queryParams = '';

    if(totalFollow == '' || delayFollowTime == ''){
        $('#error-notice').html('<b>Total</b> and <b>Delay</b> fields cannot be empty')
        console.warn('FLC validation: missing total or delay')
    }
    else if(delayFollowTime < 30){
        $('#error-notice').html('Minimum of delay time is 30')
        console.warn('FLC validation: delay below minimum', { delay: delayFollowTime })
    }
    else{
        $('#error-notice').html('')

        // check if value exists in list dropdown
        if($('#selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#selectedConnectOf','connectionid','connectionOf')
        }
        if($('#selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#selectedLocation','regionid','geoUrn')
        }
        if($('#selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#selectedSchool','schoolid','schoolFilter')
        }
        if($('#selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#selectedCurrComp','currcompid','currentCompany')
        }
        if($('#selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#selectedPastComp','pastcompid','pastCompany')
        }
        if($('#selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#selectedIndustry','industryid','industry')
        }
        if($('#selectedLanguage li').length > 0){
            queryParams += setFIlterQueryParams('#selectedLanguage','langcode','profileLanguage')
        }

        // set degree network to array and pass on
        var degreeArr = []; 
        $('.conn-degree input').each(function(index){
            if($(this).prop('checked') == true){
                if($(this).val())
                    degreeArr.push($(this).val())
            }
        })
        for (var i = 0; i < degreeArr.length; i++) {
            if(i == (degreeArr.length -1)){
                connDegree += degreeArr[i]
            }else{
                connDegree += degreeArr[i] +','
            }
        }
        if(degreeArr.length)
            queryParams += `network:List(${connDegree}),`

        if($('#firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#firstName','firstName')
        if($('#lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#lastName','lastName')
        if($('#school').val())
            queryParams += setFIlterQueryParamsFreeText('#school','schoolFreetext')
        if($('#title').val())
            queryParams += setFIlterQueryParamsFreeText('#title','title')
        if($('#company').val())
            queryParams += setFIlterQueryParamsFreeText('#company','company')

        $('.followConnect').attr('disabled', true) 

        if($('#audience-select').val() == ''){
            let query='';

            if($('#search-term').val())
                query = `(keywords:${encodeURIComponent($('#search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            console.log('FLC fetching via search', { queryStart: start, total: totalFollow })
            getConnections(query,totalFollow,start,delayFollowTime)
        }else{
            let audience = parseInt($('#audience-select').val());
            console.log('FLC fetching via audience list', { audienceId: audience, total: $('#totalFollow').val() })
            getAudienceData(audience, delayFollowTime);
        }
    }
})

const getConnections = async (searchUrl, keywords, connectionDegrees, totalFollow, start, delayFollowTime) => {
    $('.follow').show()
    $('#displayFollowStatus').empty()
    $('#displayFollowStatus').html('Scanning. Please wait...')
    console.log('FLC getConnections start with PhantomBuster', { searchUrl, keywords, connectionDegrees, start, totalFollow, delayFollowTime })
    let followItems = [], totalResultCount = 0;

    let getConnectionsLooper = async () => {
        try {
            // Use PhantomBuster instead of Voyager API
            const response = await window.fetchPhantomSearchResults({
                searchUrl: searchUrl || null,
                keywords: keywords,
                connectionDegrees: connectionDegrees,
                limit: totalFollow,
                startPosition: start
            });

            // Response format: { data: { elements: [...], included: [...] }, included: [...] }
            let elements = response.data?.elements || response.elements || [];
            let included = response.included || [];

            console.log('FLC fetch success', { elementsLen: elements.length, includedLen: included.length });

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

                if(searchResultElement && searchResultElement.items && searchResultElement.items.length > 0) {
                    // Add items from elements
                    for(let item of searchResultElement.items) {
                        followItems.push(item);
                    }

                    // Also add items from included array
                    for(let item of included) {
                        if(item.title && item.title.text && !item.title.text.includes('LinkedIn Member')) {
                            // Check if already added (avoid duplicates)
                            const alreadyAdded = followItems.some(f => 
                                f.trackingId === item.trackingId || 
                                f.navigationUrl === item.navigationUrl
                            );
                            if(!alreadyAdded) {
                                followItems.push(item);
                            }
                        }
                    }

                    if(followItems.length < totalFollow) {
                        start = parseInt(start) + followItems.length;
                        $('#startPosition').val(start);
                        console.log('FLC paging next chunk', { newStart: start, collected: followItems.length, target: totalFollow });
                        setTimeout(() => {
                            getConnectionsLooper();
                        }, 10000);
                    } else {
                        console.log('FLC collected enough items', { collected: followItems.length, totalResultCount });
                        cleanConnectionsData(followItems, totalResultCount, delayFollowTime);
                    }
                } else {
                    if(followItems.length) {
                        $('#displayFollowStatus').html(`Found ${followItems.length}. Following...`);
                        console.log('FLC switching to follow phase', { collected: followItems.length });
                        cleanConnectionsData(followItems, totalResultCount, delayFollowTime);
                    } else {
                        $('#displayFollowStatus').html('No result found, change your search criteria and try again!');
                        console.warn('FLC no items in search results');
                        $('.followConnect').attr('disabled', false);
                    }
                }
            } else if(followItems.length) {
                $('#displayFollowStatus').html(`Found ${followItems.length}. Following...`);
                console.log('FLC switching to follow phase', { collected: followItems.length });
                cleanConnectionsData(followItems, totalResultCount, delayFollowTime);
            } else {
                $('#displayFollowStatus').html('No result found, change your search criteria and try again!');
                console.warn('FLC no elements and no collected items');
                $('.followConnect').attr('disabled', false);
            }
        } catch(error) {
            console.error('FLC fetch error', error);
            
            // Check for session expired error
            if (window.displaySessionExpiredError && window.displaySessionExpiredError(error, '#displayFollowStatus')) {
                // Error message already displayed
            } else {
                $('#displayFollowStatus').html(`Error: ${error.message || 'Something went wrong while trying to get connections!'}`);
            }
            
            $('.followConnect').attr('disabled', false);
        }
    }
    
    getConnectionsLooper();
}

const cleanConnectionsData = (followItems, totalResultCount, delayFollowTime) => {
    let con = []
    let conArr = [];
    let profileUrn;

    console.log('FLC cleaning data', { items: followItems.length, totalResultCount })

    // get all connection ids to an array
    for(let item of followItems) {
        let publicIdentifier = null;
        
        // Handle PhantomBuster/LinkedIn API format (new format)
        if (item.entityUrn) {
            // Extract from entityUrn: "urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:username,SEARCH_SRP,DEFAULT)"
            const match = item.entityUrn.match(/urn:li:fsd_profile:([^,]+)/);
            if (match && match[1]) {
                publicIdentifier = match[1];
            }
        } 
        
        if (!publicIdentifier && item.navigationUrl) {
            // Extract from navigationUrl: "https://www.linkedin.com/in/username"
            const match = item.navigationUrl.match(/\/in\/([^\/\?]+)/);
            if (match && match[1]) {
                publicIdentifier = match[1];
            }
        } 
        
        if (!publicIdentifier && item.trackingUrn) {
            // Extract from trackingUrn: "urn:li:member:username"
            const match = item.trackingUrn.match(/urn:li:member:(.+)/);
            if (match && match[1]) {
                publicIdentifier = match[1];
            }
        }
        
        // Handle old Voyager API format (legacy format)
        if (!publicIdentifier && item.itemUnion && item.itemUnion['*entityResult']) {
            profileUrn = item.itemUnion['*entityResult'];
            if (profileUrn && profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
                profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {
                profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:', '');
                profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)', '');
                publicIdentifier = profileUrn;
            }
        }

        if (publicIdentifier) {
            con.push({
                name: item.title?.text || '',
                title: item.primarySubtitle?.text || '',
                conId: publicIdentifier,
                totalResultCount: totalResultCount,
                // publicIdentifier: item.publicIdentifier, 
                // memberUrn: item.trackingUrn, 
                // networkDistance: parseInt(netDistance[1]),
                // trackingId: item.trackingId, 
                // navigationUrl: item.navigationUrl, 
                // targetId: parseInt(targetIdd) 
            })			
        }
    }

    // take only user define total
    for (let index = 0; index < con.length; index++) {
        if(index >= parseInt($('#totalFollow').val())){
            break
        }else{
            conArr.push(con[index])
        }
    }
    console.log('FLC ready to follow', { toFollow: conArr.length })
    followConnection(conArr, delayFollowTime)
}

const getAudienceData = async (audience, delayFollowTime) => {
    var conArr = [];

    await $.ajax({
        method: 'get',
        timeout: 30000,
        url: `${filterApi}/audience/list?audienceId=${audience}&totalCount=${$('#totalFollow').val()}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
                    console.log('FLC audience fetch success', { count: dataPath.length })
                    for(let i=0; i<dataPath.length; i++){
                        // var netDistance = dataPath[i].con_distance.split("_")
                        // var targetIdd;
                        
                        // if(dataPath[i].con_member_urn.includes('urn:li:member:')){
                        //     targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                        // }

                        conArr.push({
                            // name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                            // title: dataPath[i].con_job_title,
                            conId: dataPath[i].con_id,
                            totalResultCount: dataPath.length,
                            // publicIdentifier: dataPath[i].con_public_identifier, 
                            // memberUrn: dataPath[i].con_member_urn,
                            // networkDistance: parseInt(netDistance[1]),
                            // trackingId: dataPath[i].con_tracking_id, 
                            // navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`, 
                            // targetId: parseInt(targetIdd) 
                        })
                    }
                    console.log('FLC ready to follow (audience)', { toFollow: conArr.length })
                    followConnection(conArr, delayFollowTime)
                }else{
                    $('.follow').show()
                    $('#displayFollowStatus').empty()
                    $('#displayFollowStatus').html('No data found!')
                    console.warn('FLC audience returned empty list')
                    $('.followConnect').attr('disabled', false)
                }
            }
        },
        error: function(error){
            console.error('FLC audience fetch error', error)
        }
    })
}

var timeOutFollowCon;
const followConnection = (conArr, delayFollowTime) => {
    var displayLi = '', x = 0,
		i = 0, displayAutomationRecord = '';
    
    $('.follow').show()
    $('#displayFollowStatus').html('Starting following...')
    console.log('FLC starting follow loop', { total: conArr.length, delaySeconds: delayFollowTime })

    // automation table data setup
    displayAutomationRecord = `
        <tr id="follow-connect-record">
            <td>Follow Connections</td>
            <td id="flc-status">Running</td>
            <td>${conArr.length}</td>
            <td id="flc-numbered">0/${conArr.length}</td>
            <td id="flc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="flc-remained-time">${remainedTime(delayFollowTime,conArr.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)
    
    var looper = () => {
        timeOutFollowCon = setTimeout(async function(){
            await fetch(`${voyagerApi}/identity/profiles/${conArr[i].conId}/profileActions?versionTag=3533619214&action=follow`,
                {
                    method: 'post',
                    headers: {
                        'Cookie': document.cookie,
                        'csrf-token': jsession,
                        'accept': accept,
                        'content-type': contentType,
                        'x-li-lang': xLiLang,
                        'x-li-page-instance': 'urn:li:page:p_flagship3_search_srp_people;QyXMiN7pT8uwOeco13WjEg==',
                        'x-li-track': JSON.stringify({"clientVersion":"1.10.1848","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                        'x-restli-protocol-version': xRestliProtocolVersion
                    },
                    body: JSON.stringify({
                        actions: [],
                        overflowActions: []
                    })
                }
            )
            .then( response => response.json() )
            .then( response => {
                console.log('FLC follow response', { index: i, value: response.value })
                if(response.value == 'Now following'){
                    $('#displayFollowStatus').empty()
                    displayLi = `
                        <!--li>Following: <b>${conArr[i].name}</b></li-->
                        <!--li>Title: <b>${conArr[i].title}</b></li-->
                        <li>Total followed: <b>${x +1}</b></li>
                        <li>Total: <b>${conArr[i].totalResultCount}</b></li>
                    `;
                    $('#displayFollowStatus').append(displayLi)
                    console.log( new Date())

                    // update automation count done and time remained
                    $('#flc-numbered').text(`${x +1}/${conArr.length}`)
                    $('#flc-remained-time').text(`${remainedTime(delayFollowTime, conArr.length - (x +1))}`)
                    
                    x++;
                    if($('#viewProfile').prop('checked') == true){
                        // flcViewProfile(conArr[i])
                    }
                }
            })
            i++;
            if(i < conArr.length)
                looper()
            if(i >= conArr.length){
                $('.followConnect').attr('disabled', false)
                sendStats(x, 'Connection followed')

                if($('#viewProfile').prop('checked') == true){
                    sendStats(x, 'Profile viwed')
                }
                // update automation status
                $('#flc-status').text('Completed')
                console.log('FLC completed follow loop', { totalFollowed: x })
                setTimeout(function(){
                    $('#follow-connect-record').remove()
                }, 5000)
            }
        }, delayFollowTime*1000)
    }
    looper()
}

const flcViewProfile = async (conArr) => {
    await $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('content-type', 'application/json');
        },
        url: `${LINKEDIN_URL}/li/track`,
        data: JSON.stringify([{
            eventBody: {
                entityView: {
                    targetId: conArr.targetId,
                    viewType: "profile-view",
                    viewerId: parseInt($('#me-plainId').val())
                },
                header: {
                    clientApplicationInstance: {
                        applicationUrn: "urn:li:application:(voyager-web,voyager-web)",
                        trackingId: [115, -68, -55, -67, 121, 34, 64, 122, -102, -63, 39, 86, 88, 27, 112, 104],
                        version: "1.10.1648"
                    },
                    pageInstance: {
                        pageUrn: "urn:li:page:d_flagship3_profile_view_base",
                        trackingId: conArr.trackingId
                    },
                    time: dInt
                },
                networkDistance: conArr.networkDistance,
                profileTrackingId: conArr.trackingId,
                requestHeader: {
                    interfaceLocale: "en_US",
                    pageKey: "d_flagship3_profile_view_base",
                    path: conArr.navigationUrl,
                    referer: LINKEDIN_URL,
                    trackingCode: "d_flagship3_feed"
                },
                vieweeMemberUrn: conArr.memberUrn,
                viewerPrivacySetting: "F",
            },
            eventInfo: {
                appId: "com.linkedin.flagship3.d_web",
                eventName: "ProfileViewEvent",
                topicName: "ProfileViewEvent"
            }
        }]),
        success: function(data){
            
        },
        error: function(error){
            console.log(error)
            $('.endorseConnectionAction').attr('disabled', false)
        }
    })
}

// stop automation 
$('body').on('click','#flc-bot-action',function(){
    clearTimeout(timeOutFollowCon);
    $('#flc-status').text('Stopped')
    $('.followConnect').attr('disabled', false)
    setTimeout(function(){
        $('#follow-connect-record').remove()
    }, 5000)
})