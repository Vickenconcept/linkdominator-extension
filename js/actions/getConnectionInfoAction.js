$('.connectionInfoAction').click(function(){
    $('#displayGetConnectInfoStatus').empty()
    var gciStartP = $('#gci-startPosition'),
        gciTotal = $('#gci-totalScrape'),
        gciDelay = $('#gci-delayTime');
    var gciconnectnId = '',
        gciregionId = '',
        gcicurrCompId = '',
        gcipastCompId = '',
        gciindustryId = '',
        gcischoolId = '',
        gcilangId='',
        gciconnDegree = '';
    var gciControlFiels = [gciDelay,gciTotal];

    var queryParams = '';

    // validate fields
    if(gciTotal.val() =='' || gciDelay.val() =='' ){
        for(var i=0;i<gciControlFiels.length;i++){
            if(gciControlFiels[i].val() == ''){
                $('#gci-error-notice').html(`${gciControlFiels[i].data('name')} field cannot be empty`)
            }
        }
    }else if(gciDelay.val() < 30){
        $('#gci-error-notice').html(`Delay minimum is 30`)
    }else{
        $('#gci-error-notice').html(``)

        // check if value exists in accordion list dropdown
        if($('#gci-selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#gci-selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedLocation','regionid','geoUrn')
        }
        if($('#gci-selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedSchool','schoolid','schoolFilter')
        }
        if($('#gci-selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#gci-selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#gci-selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedIndustry','industryid','industry')
        }
        if($('#gci-selectedLanguage li').length > 0){
            queryParams += setFIlterQueryParams('#gci-selectedLanguage','langcode','profileLanguage')
        }
        // set degree network to array and pass on
        var degreeArr = []; 
        $('.gci-conn-degree input').each(function(index){
            if($(this).prop('checked') == true){
                degreeArr.push($(this).val())
            }
        })
        for (var i = 0; i < degreeArr.length; i++) {
            if(i == (degreeArr.length -1)){
                gciconnDegree += degreeArr[i]
            }else{
                gciconnDegree += degreeArr[i] +','
            }
        }
        if(degreeArr.length)
            queryParams += `network:List(${gciconnDegree}),`

        if($('#gci-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-firstName','firstName')
        if($('#gci-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-lastName','lastName')
        if($('#gci-school').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-school','schoolFreetext')
        if($('#gci-title').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-title','title')
        if($('#gci-company').val())
            queryParams += setFIlterQueryParamsFreeText('#gci-company','company')


        gciTotal = gciTotal.val() < 10 ? 10 : gciTotal.val()
        gciStartP = gciStartP.val() == '' ? 0 : gciStartP.val()

        $(this).attr('disabled', true)  

        if ($('#gci-audience-select').val() != '') {
            gciAudienceList($('#gci-totalScrape').val(), gciDelay.val(), $('#gci-audience-select').val())
        }else {
            if($('#gci-search-term').val())
                query = `(keywords:${encodeURIComponent($('#gci-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
                
            gciGetConnections(query,gciStartP,gciTotal,gciDelay.val())
    
        }    
    }
})

const gciGetConnections = async (queryParams,gciStartP,gciTotal,gciDelay) => {
    $('.getConnectInfo').show()
    $('#displayGetConnectInfoStatus').empty()
    $('#displayGetConnectInfoStatus').html('Scanning. Please wait...')
    let connectionItems = [], totalResultCount = 0;

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
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${gciStartP}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data.elements

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of elements[1].items) {
                                connectionItems.push(item)
                            }

                            if(connectionItems.length < gciTotal) {
                                gciStartP = parseInt(gciStartP) + 11
                                $('#gci-startPosition').val(gciStartP)
                                getConnectionsLooper()
                            }else {
                                gciCleanConnectionsData(connectionItems, totalResultCount, gciDelay)
                            }

                        }else {
                            $('#displayGetConnectInfoStatus').empty()
                            $('#displayGetConnectInfoStatus').html('No result found, change your search criteria and try again!')
                            $('.connectionInfoAction').attr('disabled', false)
                        }
                    }else if(connectionItems.length) {
                        $('#displayGetConnectInfoStatus').empty()
                        $('#displayGetConnectInfoStatus').html(`Found ${connectionItems.length}. Getting Info...`)
                        gciCleanConnectionsData(connectionItems, totalResultCount, gciDelay)
                    }else {
                        $('#displayGetConnectInfoStatus').empty()
                        $('#displayGetConnectInfoStatus').html('No result found, change your search criteria and try again!')
                        $('.connectionInfoAction').attr('disabled', false)
                    }
                },
                error: function(error) {
                    console.log(error)
                    $('.connectionInfoAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}



const gciCleanConnectionsData = (connectionItems, totalResultCount, gciDelay) => {
    let conArr = [];
    let dataToScrape = [];
    let profileUrn;

    for(let item of connectionItems) {
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
        if(z < $('#gci-totalScrape').val())
            dataToScrape.push(conArr[z])
        else
            break;
    }
    gciGetConnectionInfo(dataToScrape, gciDelay)
}

const gciAudienceList = async (gciTotal, gciDelay, audienceId) => {
    var dataToScrape = [];

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audienceId}&totalCount=${gciTotal}`,
        success: function(data){
            if(data.length > 0){
                var dataPath = data[0].audience;
                if(dataPath.length > 0){
                    for(let i=0; i<dataPath.length; i++){
                        dataToScrape.push({connectionId: dataPath[i].con_id, publicIdentifier: dataPath[i].con_public_identifier})
                    }
                }else{
                    $('.getConnectInfo').show()
                    $('#displayGetConnectInfoStatus').empty()
                    $('#displayGetConnectInfoStatus').html('No contact on audeince list!')
                    $('.connectionInfoAction').attr('disabled', false)
                }
            }
        },
        error: function (error){
            console.log(error)
        }
    })
    gciGetConnectionInfo(dataToScrape, gciDelay)
}

var timeOutGetConnInfo;
const gciGetConnectionInfo = async (dataToScrape, gciDelay) => {
    var displayLi = '', x = 0, displayAutomationRecord = '';
    var scrapedData = [];

    $('.getConnectInfo').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr id="get-connect-info-record">
            <td>Get Connections Info</td>
            <td id="gci-status">Running</td>
            <td>${dataToScrape.length}</td>
            <td id="gci-numbered">0/${dataToScrape.length}</td>
            <td id="gci-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="gci-remained-time">${remainedTime(gciDelay,dataToScrape.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    for(const [i,v] of dataToScrape.entries()) {
        $.ajax({
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
            url: `${voyagerApi}/identity/profiles/${dataToScrape[i].conId}/profileContactInfo`,
            success: function(data){
                var resp = {'data': data};

                if (resp['data'].data){
                    var profileViewCall = async () => {
                        await $.ajax({
                            method: 'get',
                            async: false,
                            beforeSend: function(request) {
                                request.setRequestHeader('csrf-token', jsession);
                            },
                            url: `${voyagerApi}/identity/profiles/${dataToScrape[i].conId}/profileView`,
                            success: function(data){
                                var res = {'data': data}
                                
                                if(res['data'].profile.entityUrn){

                                    scrapedData.push({main: res, contact: resp, connectId: res['data'].profile.entityUrn.replace('urn:li:fs_profile:','')})
                                    var name = res['data'].profile.firstName +' '+  res['data'].profile.lastName;
            
                                    $('#displayGetConnectInfoStatus').empty()
                                    displayLi = `
                                        <li>Connection: <b>${name}</b></li>
                                        <li>Total scraped: <b>${x +1}</b></li>
                                    `;
                                    $('#displayGetConnectInfoStatus').append(displayLi)
                                    // console.log( new Date())
            
                                    // update automation count done and time remained
                                    $('#gci-numbered').text(`${x +1}/${dataToScrape.length}`)
                                    $('#gci-remained-time').text(`${remainedTime(gciDelay, dataToScrape.length - (x +1))}`)
            
                                    x++;
                                }
                            },
                            error: function(error){
                                // console.log(error)
                                $('#displayGetConnectInfoStatus').html('Something went wrong while trying to get profile.')
                            }
                        })
                    }
                    profileViewCall()
               }
            },
            error: function(error){
                // console.log(error)
                $('#displayGetConnectInfoStatus').html('Something went wrong while trying to get profile contact.')
            }
        })

        await sleep(gciDelay*1000)
    }

    $('.connectionInfoAction').attr('disabled', false)
                
    gciSetExportData(scrapedData);
    sendStats(x, 'Profiles scraped')

    // update automation status
    $('#gci-status').text('Completed')
    setTimeout(function(){
        $('#get-connect-info-record').remove()
    }, 5000)
}

const gciSetExportData = (scrapedData) => {
    var dataToExport = [];

    $.each(scrapedData, function(i,item){
        var mainPath = item.main['data'];
        var contactInfoPath = item.contact['data'].data;
        var skillPath = mainPath.skillView.elements,
            languagePath = mainPath.languageView.elements,
            certificationPath = mainPath.certificationView.elements,
            coursesPath = mainPath.courseView.elements,
            educationPath = mainPath.educationView.elements,
            positionPath = mainPath.positionView.elements;

        var timePeriodPath, startDate, endDate, period;
        var description, companyName, companySize, companyIndustry, companyLocation;

        if(positionPath[0]){
            if (positionPath[0].hasOwnProperty('timePeriod')) {
                timePeriodPath = positionPath[0].timePeriod;
                startDate = timePeriodPath.startDate ? monthModifier(timePeriodPath.startDate.month)+' '+timePeriodPath.startDate.year : 'Present';
                endDate = timePeriodPath.endDate ? monthModifier(timePeriodPath.endDate.month)+' '+timePeriodPath.endDate.year : 'Present';
                period = startDate+' - '+endDate;
            } else {
                period = null;
            }
            description = positionPath[0].description ? positionPath[0].description : null;
            companyName = positionPath[0].companyName ?  positionPath[0].companyName : null;
            if (positionPath[0].hasOwnProperty('company')){
                if(positionPath[0].company.hasOwnProperty('employeeCountRange')) {
                    companySize = positionPath[0].company.employeeCountRange.start;
                }else{ companySize = null; }
                if(positionPath[0].company.hasOwnProperty('industries')){
                    companyIndustry = positionPath[0].company.industries[0];
                }else{ companyIndustry = null; }
            }else{
                companyIndustry = null;
                companySize = null;
            }
            companyLocation = positionPath[0].locationName ? positionPath[0].locationName : null;
        } else {
            period = null;
            description = null;
            companyName = null;
            companySize = null;
            companyIndustry = null;
            companyLocation = null;
        }

        var timePeriodPath1, startDate1, endDate1, period1;
        var description1, companyName1, companySize1, companyIndustry1, companyLocation1;

        if(positionPath[1]){
            if (positionPath[1].hasOwnProperty('timePeriod')) {
                timePeriodPath1 = positionPath[1].timePeriod;
                startDate1 = timePeriodPath1.startDate ? monthModifier(timePeriodPath1.startDate.month)+' '+timePeriodPath1.startDate.year : 'Present';
                endDate1 = timePeriodPath1.endDate ? monthModifier(timePeriodPath1.endDate.month)+' '+timePeriodPath1.endDate.year : 'Present';
                period1 = startDate1+' - '+endDate1;
            } else {
                period1 = null;
            }
            description1 = positionPath[1].description ? positionPath[1].description : null;
            companyName1 = positionPath[1].companyName ?  positionPath[1].companyName : null;
            if(positionPath[1].hasOwnProperty('company')) {
                if(positionPath[1].company.hasOwnProperty('employeeCountRange')) {
                    companySize1 = positionPath[1].company.employeeCountRange.start;
                }else{ companySize1 = null; }
                if(positionPath[1].company.hasOwnProperty('industries')){
                    companyIndustry1 = positionPath[1].company.industries[0];
                }else{ companyIndustry1 = null; }
            }else{
                companyIndustry1 = null;
                companySize1 = null;
            }
            companyLocation1 = positionPath[1].locationName ? positionPath[1].locationName : null;
        } else {
            period1 = null;
            description1 = null;
            companyName1 = null;
            companySize1 = null;
            companyIndustry1 = null;
            companyLocation1 = null;
        }
        
        var timePeriodPath2, startDate2, endDate2, period2;
        var description2, companyName2, companySize2, companyIndustry2, companyLocation2;

        if(positionPath[2]){
            if (positionPath[2].hasOwnProperty('timePeriod')) {
                var timePeriodPath2 = positionPath[2].timePeriod;
                var startDate2 = timePeriodPath2.startDate ? monthModifier(timePeriodPath2.startDate.month)+' '+timePeriodPath2.startDate.year : 'Present';
                var endDate2 = timePeriodPath2.endDate ? monthModifier(timePeriodPath2.endDate.month)+' '+timePeriodPath2.endDate.year : 'Present';
                period2 = startDate2+' - '+endDate2;
            } else {
                period2 = null;
            }
            description2 = positionPath[2].description ? positionPath[2].description : null;
            companyName2 = positionPath[2].companyName ?  positionPath[2].companyName : null;
            if(positionPath[2].hasOwnProperty('company')) {
                if(positionPath[2].company.hasOwnProperty('employeeCountRange')) {
                    companySize2 = positionPath[2].company.employeeCountRange.start;
                }else{ companySize2 = null; }
                if(positionPath[2].company.hasOwnProperty('industries')) {
                    companyIndustry2 = positionPath[2].company.industries[0];
                }else{ companyIndustry2 = null; }
            }else{
                companyIndustry2 = null;
                companySize2 = null;
            }
            companyLocation2 = positionPath[2].locationName ? positionPath[2].locationName : null;
        }else {
            period2 = null;
            description2 = null;
            companyName2 = null;
            companySize2 = null;
            companyIndustry2 = null;
            companyLocation2 = null;
        }

        var language = '',
            skills = '',
            certification = '',
            courses = '';

        if(skillPath.length > 0){
            for(let i=0; i < skillPath.length; i++){
                if(i == (skillPath.length -1)){
                    skills += skillPath[i].name
                }else{
                    skills += skillPath[i].name+', '
                }
            }
        }
        if(languagePath.length > 0){
            for(let i=0; i < languagePath.length; i++){
                if(i == (languagePath.length -1)){
                    language += languagePath[i].name
                }else{
                    language += languagePath[i].name+', '
                }
            }
        }
        if(certificationPath.length > 0){
            for(let i=0; i < certificationPath.length; i++){
                if(i == (certificationPath.length -1)){
                    certification += certificationPath[i].name
                }else{
                    certification += certificationPath[i].name+', '
                }
            }
        }
        if(coursesPath.length > 0){
            for(let i=0; i < coursesPath.length; i++){
                if(i == (coursesPath.length -1)){
                    courses += coursesPath[i].name
                }else{
                    courses += coursesPath[i].name+', '
                }
            }
        }
        
        dataToExport.push({
            firstName: mainPath.profile.firstName,
            lastName: mainPath.profile.lastName,
            Email: contactInfoPath.emailAddress != null ? contactInfoPath.emailAddress : null,
            Phone: contactInfoPath.phoneNumbers != null ? contactInfoPath.phoneNumbers[0].number : null,
            Twitter: contactInfoPath.twitterHandles.length > 0 ? contactInfoPath.twitterHandles[0].name : null,
            headLine: mainPath.profile.headline,
            industry: mainPath.profile.industryName,
            skills: skills !='' ? skills : null,
            locationName: mainPath.profile.locationName,
            countryCode: mainPath.profile.location.basicLocation.countryCode,
            linkedUrl: `${LINKEDIN_URL}/in/${item.connectId}`,
            language: language !='' ? language: null,
            summary: mainPath.profile.summary ? mainPath.profile.summary : null,
            certification: certification !='' ? certification : null,
            courses: courses !='' ? courses : null,
            degreeName01: educationPath[0] ? educationPath[0].degreeName : null,
            fieldOfStudy01: educationPath[0] ? educationPath[0].fieldOfStudy : null,
            schoolName01: educationPath[0] ? educationPath[0].schoolName : null,
            degreeName02: educationPath[1] ? educationPath[1].degreeName : null,
            fieldOfStudy02: educationPath[1] ? educationPath[1].fieldOfStudy : null,
            schoolName02: educationPath[1] ? educationPath[1].schoolName : null,
            degreeName03: educationPath[2] ? educationPath[2].degreeName : null,
            fieldOfStudy03: educationPath[2] ? educationPath[2].fieldOfStudy : null,
            schoolName03: educationPath[2] ? educationPath[2].schoolName : null,
            position01: positionPath[0] ? positionPath[0].title : null,
            timePeriod01: period,
            positionDescription01: description,
            companyName01: companyName,
            employeeCount01: companySize,
            companyIndustry01: companyIndustry,
            companyLocation01: companyLocation,
            position02: positionPath[1] ? positionPath[1].title : null,
            timePeriod02: period1,
            positionDescription02: description1,
            companyName02: companyName1,
            employeeCount02: companySize1,
            companyIndustry02: companyIndustry1,
            companyLocation02: companyLocation1,
            position03: positionPath[2] ? positionPath[2].title : null,
            timePeriod03: period2,
            positionDescription03: description2,
            companyName03: companyName2,
            employeeCount03: companySize2,
            companyIndustry03: companyIndustry2,
            companyLocation03: companyLocation2
        })
    })

    gciExportData(dataToExport)

    $('.connectionInfoAction').attr('disabled', false)
}

const gciExportData = (dataToExport) => {
    const date = new Date();
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const mtn = date.getMinutes();
    const fileName =  `connection_data_${d}${m}${y}${mtn}.csv`; 

    if(dataToExport.length > 0){
        const csvRows = [];
        const headers = Object.keys(dataToExport[0]);
        csvRows.push(headers.join(','));

        for (const row of dataToExport) {
            const values = headers.map(header => {
                const val = row[header]
                return `"${val}"`;
            });

            // To add, sepearater between each value
            csvRows.push(values.join(','));
        }
        const download = csvRows.join('\n');

        var blob = new Blob([download]);
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    }
}

const monthModifier = (monthNum) => {
    const date = new Date(); 
    date.setMonth(monthNum - 1);

    return date.toLocaleString('en-US', {
        month: 'short',
    });
}

// stop automation 
$('body').on('click','#gci-bot-action',function(){
    clearTimeout(timeOutGetConnInfo);
    $('#gci-status').text('Stopped')
    $('.connectionInfoAction').attr('disabled', false)
    setTimeout(function(){
        $('#get-connect-info-record').remove()
    }, 5000)
})