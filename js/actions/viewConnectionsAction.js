
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

        $(this).attr('disabled', true)  

        if($('#vcp-audience-select').val() =='') {
            if($('#vcp-search-term').val())
                query = `(keywords:${encodeURIComponent($('#vcp-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            vcpGetConnections(query,vcpStartP,vcpTotal,vcpDelay.val())
        }else{
            vcpGetAudienceList($('#vcp-audience-select').val(), vcpDelay.val())
        }
    }
})

const vcpGetConnections = async (queryParams,vcpStartP,vcpTotal,vcpDelay) => {
    $('.viewConnect').show()
    $('#displayViewConnectionStatus').empty()
    $('#displayViewConnectionStatus').html('Scanning. Please wait...')
    let viewItems = [], totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;QazGJ/pNTwuq6OTtMClfPw==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${vcpStartP}`,
                success: function(data){
                    let res = {'data': data}
                    let elements = res['data'].data.elements
                    let included = res['data'].included

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of included) {
                                if(item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                                    if(item.title.text && item.primarySubtitle.text && item.title.text.includes('LinkedIn Member') == false) {
                                        viewItems.push(item)
                                    }
                                }
                            }

                            if(viewItems.length < vcpTotal) {
                                vcpStartP = parseInt(vcpStartP) + 11
                                $('#vcp-startPosition').val(vcpStartP)
                                getConnectionsLooper()
                            }else {
                                vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay)
                            }
                        }else {
                            $('#displayViewConnectionStatus').html('No result found, change your search criteria and try again!')
                            $('.viewConnetionsAction').attr('disabled', false)
                        }
                    }else if(viewItems.length) {
                        $('#displayViewConnectionStatus').html(`Found ${viewItems.length}. Viewing...`)
                        vcpCleanConnectionsData(viewItems, totalResultCount, vcpDelay)
                    }else {
                        $('#displayViewConnectionStatus').html('No result found, change your search criteria and try again!')
                        $('.viewConnetionsAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayViewConnectionStatus').html('Something went wrong while trying to get connections!')
                    $('.viewConnetionsAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

const vcpCleanConnectionsData = (viewItems, totalResultCount, vcpDelay) => {
    let con = [], conArr = [];
    let profileUrn;

    for(let item of viewItems) {
        profileUrn = item.entityUrn

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {
            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            conArr.push({
                name: item.title.text,
                title: item.primarySubtitle.text,
                conId: profileUrn,
                totalResultCount: totalResultCount,
                memberUrn: item.trackingUrn,
                networkDistance: parseInt(item.entityCustomTrackingInfo.memberDistance.split("_")[1]),
                trackingId: item.trackingId,
                navigationUrl: item.navigationUrl,
                targetId: item.trackingUrn.replace('urn:li:member:','')
            })
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

    vcpViewProfile(con, vcpDelay)
}

const vcpGetAudienceList = async (audienceId, vcpDelay) => {
    var conArr = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
                    for(let i=0; i<dataPath.length; i++){
                        var netDistance = dataPath[i].con_distance.split("_")
                        var targetIdd;
                        if(dataPath[i].con_member_urn.includes('urn:li:member:')){
                            targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                        }

                        conArr.push({
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
                        })
                    }
                    vcpViewProfile(conArr, vcpDelay)
                }else{
                    $('.viewConnect').show()
                    $('#displayViewConnectionStatus').empty()
                    $('#displayViewConnectionStatus').html('No data found!')
                    $('.viewConnetionsAction').attr('disabled', false)
                }
            }
        },
        error: function(error){
            console.log(error)
        }
    })
}

var timeOutFollowConViewProfile;
const vcpViewProfile = (profileToViewData, vcpDelay) => {
    var displayLi = '', i = 0, x = 0, displayAutomationRecord = '';
    var d = new Date();
    var dInt = new Date(d).getTime();

    $('.viewConnect').show()

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
                            targetId: profileToViewData[i].targetId,
                            viewType: "profile-view",
                            viewerId: parseInt($('#me-plainId').val())
                        },
                        header: {
                            clientApplicationInstance: {
                                applicationUrn: "urn:li:application:(voyager-web,voyager-web)",
                                trackingId: profileToViewData[i].trackingId,
                                version: "1.10.1648"
                            },
                            pageInstance: {
                                pageUrn: "urn:li:page:d_flagship3_profile_view_base",
                                trackingId: profileToViewData[i].trackingId
                            },
                            time: dInt
                        },
                        networkDistance: profileToViewData[i].networkDistance,
                        profileTrackingId: profileToViewData[i].trackingId,
                        requestHeader: {
                            interfaceLocale: "en_US",
                            pageKey: "d_flagship3_profile_view_base",
                            path: profileToViewData[i].navigationUrl,
                            referer: LINKEDIN_URL,
                            trackingCode: "d_flagship3_feed"
                        },
                        vieweeMemberUrn: profileToViewData[i].memberUrn,
                        viewerPrivacySetting: "F",
                    },
                    eventInfo: {
                        appId: "com.linkedin.flagship3.d_web",
                        eventName: "ProfileViewEvent",
                        topicName: "ProfileViewEvent"
                    }
                }]),
                success: function(data){
                    $('#displayViewConnectionStatus').empty()
                    displayLi = `
                        <li>Viewing: <b>${profileToViewData[i].name}</b></li>
                        <li>Title: <b>${profileToViewData[i].title}</b></li>
                        <li>Total viewed: <b>${x +1}</b></li>
                        <li>Total result: <b>${profileToViewData[i].totalResultCount}</b></li>
                    `;
                    $('#displayViewConnectionStatus').append(displayLi)
                    console.log( new Date())

                    // update automation count done and time remained
                    $('#vcp-numbered').text(`${x +1}/${profileToViewData.length}`)
                    $('#vcp-remained-time').text(`${remainedTime(vcpDelay, profileToViewData.length - (x +1))}`)

                    x++;
                },
                error: function(error){
                    console.log(error)
                    $('#displayViewConnectionStatus').html('Something went wrong while trying to view connections!')
                    $('.viewConnetionsAction').attr('disabled', false)
                }
            })
            i++;
            if(i < profileToViewData.length){
                vcpLooper()
            }
            if(i >= profileToViewData.length){
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