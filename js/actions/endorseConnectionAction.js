
$('.endorseConnectionAction').click(function(){
    $('#displayEndorseConnectionStatus').empty()
    var edcStartP = $('#edc-startPosition'),
        edcTotal = $('#edc-total'),
        edcDelay = $('#edc-delayTime'),
        edcSkills = $('#edc-totalSkills');
    var edcconnectnId = '',
        edcregionId = '',
        edccurrCompId = '',
        edcpastCompId = '',
        edcindustryId = '',
        edcschoolId = '',
        edclangId='';
    var edcControlFields = [edcSkills,edcDelay,edcTotal];

    var queryParams = '';

    // validate fields
    if(edcTotal.val() =='' || edcDelay.val() =='' || edcSkills.val() ==''){
        for(var i=0;i<edcControlFields.length;i++){
            if(edcControlFields[i].val() == ''){
                $('#edc-error-notice').html(`${edcControlFields[i].data('name')} field cannot be empty`)
            }
        }
    }else if(edcDelay.val() < 30){
        $('#edc-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#edc-error-notice').html(``)

        // check if value exists in accordion list dropdown
        if($('#edc-selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#edc-selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedLocation','regionid','geoUrn')
        }
        if($('#edc-selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedSchool','schoolid','schoolFilter')
        }
        if($('#edc-selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#edc-selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#edc-selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedIndustry','industryid','industry')
        }
        if($('#edc-selectedLanguage li').length > 0){
            queryParams += setFIlterQueryParams('#edc-selectedLanguage','langcode','profileLanguage')
        }

        edcTotal = edcTotal.val() < 10 ? 10 : edcTotal.val()
        edcStartP = edcStartP.val() == '' ? 0 : edcStartP.val()

        if($('#edc-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-firstName','firstName')
        if($('#edc-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-lastName','lastName')
        if($('#edc-school').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-school','schoolFreetext')
        if($('#edc-title').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-title','title')
        if($('#edc-company').val())
            queryParams += setFIlterQueryParamsFreeText('#edc-company','company')

        $(this).attr('disabled', true)

        if($('#edc-audience-select').val() == '') {
            if($('#edc-search-term').val())
                query = `(keywords:${encodeURIComponent($('#edc-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

            edcGetConnections(query,edcStartP,edcTotal,edcDelay.val(),edcSkills.val())
        }else{
            edcGetAudienceList($('#vcp-audience-select').val(), edcDelay.val(), edcSkills.val())
        }
    }
})

const  edcGetConnections = async (queryParams,edcStartP,edcTotal,edcDelay,edcSkills) => {
    $('.endorseConnect').show()
    $('#displayEndorseConnectionStatus').empty()
    $('#displayEndorseConnectionStatus').html('Scanning. Please wait...')
    let endorseItems = [], totalResultCount = 0;

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
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${edcStartP}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of elements[1].items) {
                                endorseItems.push(item)
                            }

                            if(endorseItems.length < edcTotal) {
                                edcStartP = parseInt(edcStartP) + 11
                                $('#edc-startPosition').val(edcStartP)
                                getConnectionsLooper()
                            }else {
                                edcCleanConnectionsData(endorseItems, totalResultCount, edcDelay, edcSkills)
                            }
                        }else {
                            $('#displayEndorseConnectionStatus').empty()
                            $('#displayEndorseConnectionStatus').html('No result found, change your search criteria and try again!')
                            $('.endorseConnectionAction').attr('disabled', false)
                        }
                    }else if(endorseItems.length) {
                        $('#displayEndorseConnectionStatus').empty()
                        $('#displayEndorseConnectionStatus').html(`Found ${endorseItems.length}. Endorsing...`)
                        edcCleanConnectionsData(endorseItems, totalResultCount, edcDelay, edcSkills)
                    }else {
                        $('#displayEndorseConnectionStatus').empty()
                        $('#displayEndorseConnectionStatus').html('No result found, change your search criteria and try again!')
                        $('.endorseConnectionAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.endorseConnectionAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

const edcCleanConnectionsData = (endorseItems, totalResultCount, edcDelay, edcSkills) => {
    let conArr = [];
    let dataToEndorse = [];
    let profileUrn;

    for(let item of endorseItems) {
        profileUrn = item.itemUnion['*entityResult']

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            conArr.push({
                conId: profileUrn,
                totalResultCount: totalResultCount,
            })			
        }
    }

    // get only user defined total
    for(let z=0; z < conArr.length; z++) {
        if(z < $('#edc-total').val())
            dataToEndorse.push(conArr[z])
        else
            break;
    }

    edcGetFeaturedSkills(dataToEndorse, edcDelay, edcSkills)
}

const edcGetAudienceList = async (audienceId, edcDelay, edcSkills) => {
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
                            totalResult: dataPath.length,
                            publicIdentifier: dataPath[i].con_public_identifier, 
                            memberUrn: dataPath[i].con_member_urn,
                            networkDistance: parseInt(netDistance[1]),
                            trackingId: dataPath[i].con_tracking_id, 
                            navigationUrl: `${LINKEDIN_URL}/in/${dataPath[i].con_public_identifier}`, 
                            targetId: parseInt(targetIdd),
                        })
                    }
                    edcGetFeaturedSkills(conArr, edcDelay, edcSkills)
                }else{
                    $('.endorseConnect').show()
                    $('#displayEndorseConnectionStatus').empty()
                    $('#displayEndorseConnectionStatus').html('No data found!')
                    $('.endorseConnectionAction').attr('disabled', false)
                }
            }
        },
        error: function(error){
            console.log(error)
        }
    })
}

var timeOutEndorseCon;
const edcGetFeaturedSkills = async (dataToEndorse, edcDelay, edcSkills) => {
    var i = 0, x = 0, displayAutomationRecord = '';

    $('.endorseConnect').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="endorse-connect-record">
            <td>Endorse Connections</td>
            <td id="edc-status">Running</td>
            <td>${dataToEndorse.length}</td>
            <td id="edc-numbered">0/${dataToEndorse.length}</td>
            <td id="edc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="edc-remained-time">${remainedTime(edcDelay, dataToEndorse.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var edcLooper = () => {
        timeOutEndorseCon = setTimeout(async function(){
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_profile_view_base;OSmjmgZVQ1enfa5KB7KLQg==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/identity/profiles/${dataToEndorse[i].conId}/featuredSkills?includeHiddenEndorsers=false&count=${edcSkills}&_=${dInt}`,
                success: function(data){
                    var res = {'data': data};
                    if(res['data'].data['*elements'].length > 0){
                        // var endorseSkillUrns = res['data'].data['*elements'];
                        var endorseIncludeData = res['data'].included;

                        $.each(endorseIncludeData, function(index,item) {
                            if(item.hasOwnProperty('name')){
                                triggerEndorsement(item.name, item.entityUrn, dataToEndorse[i].conId,  dataToEndorse[i].totalResultCount, x)

                                // update automation count done and time remained
                                $('#edc-numbered').text(`${x +1}/${dataToEndorse.length}`)
                                $('#edc-remained-time').text(`${remainedTime(edcDelay, dataToEndorse.length - (x +1))}`)
                            }
                        })

                        if($('#edc-viewProfile').prop('checked') == true){
                            // edcViewProfile(dataToEndorse[i])
                        }
                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayEndorseConnectionStatus').html('Something went wrong while trying to get featured skills, please try again.')
                    $('.endorseConnectionAction').attr('disabled', false)
                }
            })
            i++;
            if(i < dataToEndorse.length)
                edcLooper()
            if(i >= dataToEndorse.length){
                $('.endorseConnectionAction').attr('disabled', false)

                let module = 'Connections endorsed';
                sendStats(x, module)

                if($('#edc-viewProfile').prop('checked') == true){
                    let module = 'Profile viwed';
                    sendStats(x, module)
                }
                // update automation status
                $('#edc-status').text('Completed')
                setTimeout(function(){
                    $('#endorse-connect-record').remove()
                }, 5000)
            }
        }, edcDelay*1000)
    }
    edcLooper()
}

const triggerEndorsement = async (skillName, entityUrn, connectId, totalResult, currentCnt) => {
    var displayLi = '';

    await $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('accept', accept);
            request.setRequestHeader('content-type', contentType);
            request.setRequestHeader('x-li-lang', xLiLang);
            request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_profile_view_base;3T8zGiC6TaW88WAryS7olA==');
            request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
            request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/identity/profiles/${connectId}/normEndorsements`,
        data: JSON.stringify({
            skill: {
                entityUrn: entityUrn,
                name: skillName,
            }
        }),
        success: function(data){
            $('#displayEndorseConnectionStatus').empty()
            displayLi = `
                <li>Skills: <b>${skillName}</b></li>
                <li>Total connection endorsed: <b>${currentCnt +1}</b></li>
                <li>Total result: <b>${totalResult}</b></li>
            `;
            $('#displayEndorseConnectionStatus').append(displayLi)
        },
        error: function(error){
            console.log(error)
            $('#displayEndorseConnectionStatus').html('Something went wrong while trying to endorse connection, please try again.')
            $('.endorseConnectionAction').attr('disabled', false)
        }
    })
}

const edcViewProfile = async (dataToEndorse) => {
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
                    targetId: dataToEndorse.targetId,
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
                        trackingId: dataToEndorse.trackingId
                    },
                    time: dInt
                },
                networkDistance: dataToEndorse.networkDistance,
                profileTrackingId: dataToEndorse.trackingId,
                requestHeader: {
                    interfaceLocale: "en_US",
                    pageKey: "d_flagship3_profile_view_base",
                    path: dataToEndorse.navigationUrl,
                    referer: LINKEDIN_URL,
                    trackingCode: "d_flagship3_feed"
                },
                vieweeMemberUrn: dataToEndorse.memberUrn,
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
$('body').on('click','#edc-bot-action',function(){
    clearTimeout(timeOutEndorseCon);
    $('#edc-status').text('Stopped')
    $('.endorseConnectionAction').attr('disabled', false)
    setTimeout(function(){
        $('#endorse-connect-record').remove()
    }, 5000)
})