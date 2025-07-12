
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

    var queryParams = '';

    if(totalFollow == '' || delayFollowTime == ''){
        $('#error-notice').html('<b>Total</b> and <b>Delay</b> fields cannot be empty')
    }
    else if(delayFollowTime < 30){
        $('#error-notice').html('Minimum of delay time is 30')
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

            getConnections(query,totalFollow,start,delayFollowTime)
        }else{
            let audience = parseInt($('#audience-select').val());

            getAudienceData(audience, delayFollowTime);
        }
    }
})

const getConnections = async (queryParams,totalFollow,start,delayFollowTime) => {
    $('.follow').show()
    $('#displayFollowStatus').empty()
    $('#displayFollowStatus').html('Scanning. Please wait...')
    let followItems = [], totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;+veAhjOISYuf47u7igxvzw==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.8.4154","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${start}`,
                success: function(data){
                    let res = {'data': data}
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of elements[1].items) {
                                followItems.push(item)
                            }

                            if(followItems.length < totalFollow) {
                                start = parseInt(start) + 11
                                $('#startPosition').val(start)
                                getConnectionsLooper()
                            }else {
                                cleanConnectionsData(followItems, totalResultCount, delayFollowTime)
                            }
                        }else {
                            $('#displayFollowStatus').empty()
                            $('#displayFollowStatus').html('No result found, change your search criteria and try again!')
                            $('.followConnect').attr('disabled', false)
                        }                        
                    }else if(followItems.length) {
                        $('#displayFollowStatus').empty()
                        $('#displayFollowStatus').html(`Found ${followItems.length}. Following...`)
                        cleanConnectionsData(followItems, totalResultCount, delayFollowTime)
                    }else {
                        $('#displayFollowStatus').empty()
                        $('#displayFollowStatus').html('No result found, change your search criteria and try again!')
                        $('.followConnect').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayFollowStatus').html('Something went wrong while trying to get connections!')
                    $('.followConnect').attr('disabled', false)
                }
            })
        }, 10000)
    }
    getConnectionsLooper()
}

const cleanConnectionsData = (followItems, totalResultCount, delayFollowTime) => {
    let con = []
    let conArr = [];
    let profileUrn;

    // get all connection ids to an array
    for(let item of followItems) {
        // var imgUrn = item.targetUrn;
        // var netDistance = item.memberDistance.value.split("_")
        // var targetIdd;
        // if(item.trackingUrn.includes('urn:li:member:')){
        //     targetIdd = item.trackingUrn.replace('urn:li:member:','') 
        // }
        
        profileUrn = item.itemUnion['*entityResult']

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            con.push({
                // name: item.title.text,
                // title: item.headline.text,
                conId: profileUrn,
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
    followConnection(conArr, delayFollowTime)
}

const getAudienceData = async (audience, delayFollowTime) => {
    var conArr = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audience}&totalCount=${$('#totalFollow').val()}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
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
                    followConnection(conArr, delayFollowTime)
                }else{
                    $('.follow').show()
                    $('#displayFollowStatus').empty()
                    $('#displayFollowStatus').html('No data found!')
                    $('.followConnect').attr('disabled', false)
                }
            }
        },
        error: function(error){
            console.log(error)
        }
    })
}

var timeOutFollowCon;
const followConnection = (conArr, delayFollowTime) => {
    var displayLi = '', x = 0,
		i = 0, displayAutomationRecord = '';
    
    $('.follow').show()

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