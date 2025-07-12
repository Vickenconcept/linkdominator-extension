
$('body').on('click', '.removeConnectAction', function(){
    $('#displayRemoveStatus').empty()
    var rmcTotalFollow = $('#rmc-totalFollow').val(),
        rmcdelayFollowTime = $('#rmc-delayFollowTime').val(),
        rmcstart = $('#rmc-startPosition').val() == '' ? 0 : $('#rmc-startPosition').val(),
        rmcschoolId = '',
        rmcconnectionId = '',
        rmcregionId = '',
        rmccurrCompId = '',
        rmcpastCompId = '',
        rmcindustryId = '',
        rmclangId='';

    let queryParams = '';

    if(rmcTotalFollow == '' || rmcdelayFollowTime == ''){
        $('#rmc-error-notice').html('<b>Total</b> and <b>Delay</b> fields cannot be empty')
    }
    else if(rmcdelayFollowTime < 30){
        $('#rmc-error-notice').html('Minimum of delay time is 30')
    }else if($('#rmc-agreeRemove').prop('checked') == false){
        $('#rmc-error-notice').html('Kindly agree to disconnect')
    }
    else{
        $('#rmc-error-notice').html('')

        // check if value exists in list dropdown
        if($('#rmc-selectedConnectOf li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#rmc-selectedLocation li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedLocation','regionid','geoUrn')
        }
        if($('#rmc-selectedSchool li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedSchool','schoolid','schoolFilter')
        }
        if($('#rmc-selectedCurrComp li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#rmc-selectedPastComp li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#rmc-selectedIndustry li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedIndustry','industryid','industry')
        }
        if($('#rmc-selectedLanguage li').length){
            queryParams += setFIlterQueryParams('#rmc-selectedLanguage','langcode','profileLanguage')
        }

        if($('#rmc-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#rmc-firstName','firstName')
        if($('#rmc-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#rmc-lastName','lastName')
        if($('#rmc-school').val())
            queryParams += setFIlterQueryParamsFreeText('#rmc-school','schoolFreetext')
        if($('#rmc-title').val())
            queryParams += setFIlterQueryParamsFreeText('#rmc-title','title')
        if($('#rmc-company').val())
            queryParams += setFIlterQueryParamsFreeText('#rmc-company','company')

        $(this).attr('disabled', true)

        if($('#rmc-search-term').val())
            query = `(keywords:${encodeURIComponent($('#rmc-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
        else
            query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;

        rmcGetConnections(query,rmcTotalFollow,rmcstart,rmcdelayFollowTime)
    }
})

const rmcGetConnections = async (queryParams,rmcTotalFollow,rmcstart,rmcdelayFollowTime) => {
    $('.remove-connect').show()
    $('#displayRemoveStatus').empty()
    $('#displayRemoveStatus').html('Scanning. Please wait...')
    let removeItems = [], totalResultCount = 0;

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', acceptVnd);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;VvO74HUwSl+U9XiOm5HEwg==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2304","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${rmcstart}`,
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
                                        removeItems.push(item)
                                    }
                                }
                            }

                            if(removeItems.length < totalFollow) {
                                rmcstart = parseInt(rmcstart) + 11
                                $('#rmc-startPosition').val(rmcstart)
                                getConnectionsLooper()
                            }else {
                                rmcCleanConnectionsData(removeItems, totalResultCount, rmcdelayFollowTime, rmcTotalFollow)
                            }
                        }else {
                            $('#displayRemoveStatus').html('No result found, change your search criteria and try again!')
                            $('.removeConnectAction').attr('disabled', false)
                        }
                    }else if(removeItems.length) {
                        $('#displayRemoveStatus').html(`Found ${removeItems.length}. Removing...`)
                        rmcCleanConnectionsData(removeItems, totalResultCount, rmcdelayFollowTime, rmcTotalFollow)
                    }else {
                        $('#displayRemoveStatus').html('No result found, change your search criteria and try again!')
                        $('.removeConnectAction').attr('disabled', false)
                    }
                },
                error: function(error){
                    console.log(error)
                    $('#displayRemoveStatus').html('Something went wrong while trying to get connections!')
                    $('.removeConnectAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

const rmcCleanConnectionsData = (removeItems, totalResultCount, rmcdelayFollowTime, rmcTotalFollow) => {
    let con = [], conArr = [];
    let profileUrn;

    for(let item of removeItems) {
        profileUrn = item.entityUrn

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {
            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')

            conArr.push({
                name: item.title.text,
                title: item.primarySubtitle.text,
                conId: profileUrn,
                totalResultCount: totalResultCount
            })
        }
    }

    for(let z=0;z<conArr.length;z++) {
        if(z<rmcTotalFollow) 
            con.push(conArr[z]);
        else break;
    }

    if($('#rmc-blockConnect').prop('checked') == true){
        rmcBlockConnection(con, rmcdelayFollowTime)
    }else{
        removeConnection(con, rmcdelayFollowTime)
    }
}

const rmcGetAudienceData = async (audience, rmcdelayFollowTime) => {
    var totalFollow = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audience}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
                    for(let i=0; i<dataPath.length; i++){
                        totalFollow.push({
                            name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                            title: dataPath[i].con_job_title,
                            conId: dataPath[i].con_id,
                            totalResultCount: dataPath.length
                        })
                    }

                    if($('#rmc-blockConnect').prop('checked') == true){
                        rmcBlockConnection(totalFollow, rmcdelayFollowTime)
                    }else{
                        removeConnection(totalFollow, rmcdelayFollowTime)
                    }
                }else{
                    $('.follow').show()
                    $('#displayFollowStatus').empty()
                    $('#displayFollowStatus').html('No data found!')
                    $('.removeConnectAction').attr('disabled', false)
                }
            }
        },
        error: function(error){
            console.log(error)
            $('.removeConnectAction').attr('disabled', false)
        }
    })
}

var timeOutRemoveCon;
const removeConnection = async (totalFollow, rmcdelayFollowTime) => {
    var displayLi = '', i = 0, x = 0, displayAutomationRecord = '';

    $('.remove-connect').show();

    // automation table data setup
    displayAutomationRecord = `
        <tr class="remove-connect-record">
            <td>Remove Connections</td>
            <td class="rmc-status">Running</td>
            <td>${totalFollow.length}</td>
            <td class="rmc-numbered">0/${totalFollow.length}</td>
            <td class="rmc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td class="rmc-remained-time">${remainedTime(rmcdelayFollowTime,totalFollow.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var rmcLooper = () => {
        timeOutRemoveCon = setTimeout(async function(){
            await $.ajax({ 
                method: 'POST',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', 'text/plain, */*; q=0.01');
                    request.setRequestHeader('content-type', 'application/json; charset=UTF-8');
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:p_flagship3_search_srp_people;L3W7eMvcSeS0Gv2Ig7hlnA==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.8.4154","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/identity/profiles/${totalFollow[i].conId}/profileActions?versionTag=3533619214&action=disconnect`,
                data: JSON.stringify({
                    actions: [],
                    overflowActions: []
                }),
                success: function(data){
                    if(data.value == 'Disconnected'){
                        $('#displayRemoveStatus').empty()
                        displayLi = `
                            <li>Disconnecting: <b>${totalFollow[i].name}</b></li>
                            <li>Title: <b>${totalFollow[i].title}</b></li>
                            <li>Total removed: <b>${x +1}</b></li>
                            <li>Total result: <b>${totalFollow[i].totalResultCount}</b></li>
                        `;
                        $('#displayRemoveStatus').append(displayLi)
                        console.log( new Date())

                        // update automation count done and time remained
                        $('.rmc-numbered').text(`${x +1}/${totalFollow.length}`)
                        $('.rmc-remained-time').text(`${remainedTime(rmcdelayFollowTime, totalFollow.length - (x +1))}`)
                        x++;
                    }
                },
                error: function(error){
                    console.log(error.responseJSON)
                    if(error.responseJSON.hasOwnProperty('message'))
                        $('#displayRemoveStatus').html(error.responseJSON.message)
                    else
                        $('#displayRemoveStatus').html('Something went wrong while trying to remove connections!')
                    $('.removeConnectAction').attr('disabled', false)
                }
            })
            i++;
            if(i < totalFollow.length)
                rmcLooper()
            if(i >= totalFollow.length){
                $('.removeConnectAction').attr('disabled', false)

                if(x > 0){
                    let module = 'Connections removed';
                    sendStats(x, module)
                }
                // update automation status
                $('.rmc-status').text('Completed')
                setTimeout(function(){
                    $('.remove-connect-record').remove()
                }, 5000)
            }
        }, rmcdelayFollowTime*1000)
    }
    rmcLooper()
}

const rmcBlockConnection = (totalFollow, rmcdelayFollowTime) => {
    var displayLi = '', i = 0, x=0, displayAutomationRecord = '';

    $('.remove-connect').show();

    // automation table data setup
    displayAutomationRecord = `
        <tr class="remove-connect-record">
            <td>Remove Connections</td>
            <td class="rmc-status">Running</td>
            <td>${totalFollow.length}</td>
            <td class="rmc-numbered">0/${totalFollow.length}</td>
            <td class="rmc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td class="rmc-remained-time">${remainedTime(rmcdelayFollowTime,totalFollow.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var rmcLooper = () => {
        timeOutRemoveCon = setTimeout(async function(){
            await $.ajax({
                method: 'post',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                },
                url: `${linkedinBlock}/block?memberId=${totalFollow[i].conId}&trk=block-profile&csrfToken=${jsession}`,
                success: function(response){
                    if(response.result.responseCode == 200){
                        $('#displayRemoveStatus').empty()
                        displayLi = `
                            <li>Disconnecting: <b>${totalFollow[i].name}</b></li>
                            <li>Title: <b>${totalFollow[i].title}</b></li>
                            <li>Total removed: <b>${x +1}</b></li>
                            <li>Total result: <b>${totalFollow[i].totalResultCount}</b></li>
                        `;
                        $('#displayRemoveStatus').append(displayLi)
                        console.log( new Date())

                        // update automation count done and time remained
                        $('.rmc-numbered').text(`${x +1}/${totalFollow.length}`)
                        $('.rmc-remained-time').text(`${remainedTime(rmcdelayFollowTime, totalFollow.length - (x +1))}`)

                        x++;
                    }
                },
                error: function(error){
                    console.log(error)
                    $('.removeConnectAction').attr('disabled', false)
                }
            })
            i++;
            if(i < totalFollow.length)
                rmcLooper()
            if(i >= totalFollow.length){
                $('.removeConnectAction').attr('disabled', false)
                if(x > 0){
                    let module = 'Connections removed';
                    sendStats(x, module)
                }
                // update automation status
                $('.rmc-status').text('Completed')
                setTimeout(function(){
                    $('.remove-connect-record').remove()
                }, 5000)
            }
        }, rmcdelayFollowTime*1000)
    }
    rmcLooper()
}

// stop automation 
$('body').on('click','.rmc-bot-action',function(){
    clearTimeout(timeOutRemoveCon);
    $('.rmc-status').text('Stopped')
    $('.removeConnectAction').attr('disabled', false)
    setTimeout(function(){
        $('.remove-connect-record').remove()
    }, 5000)
})