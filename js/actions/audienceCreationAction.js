
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

            if($('#afs-search-term').val())
                query = `(keywords:${encodeURIComponent($('#afs-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
            else
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
                    afcPostId = 'activity:'+afcPostIdLiked.val();

                    afcGetLikedProfiles(afcPostId,afcTotal,afcStartP.val(),afcDelay.val(), afcAudienceName.val(),audienceType);
                }else if (afcArticleIdLiked.val() != ''){
                    afcPostId = 'article%3A'+afcArticleIdLiked.val();

                    afcGetLikedProfiles(afcPostId,afcTotal,afcStartP.val(),afcDelay.val(),afcAudienceName.val(),audienceType);
                }else if (afcVideoIdLiked.val() != ''){
                    afcPostId = 'ugcPost%3A'+afcVideoIdLiked.val();

                    afcGetLikedProfiles(afcPostId,afcTotal,afcStartP.val(),afcDelay.val(),afcAudienceName.val(),audienceType);
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

const afcGetLikedProfiles = (afcPostId,afcTotal,afcStartP,afcDelay,afcAudienceName,audienceType) => {
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

const fsGetConnections = () => {
    let totalResultCount = 0;

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
                url: `${voyagerBlockSearchUrl}&query=${getConnectParams.queryParams}&start=${getConnectParams.startPosition}`,
                success: function(data) {
                    let res = {'data': data}
                    let elements = res['data'].data.elements
                    let included = res['data'].included

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if((elements.length > 1 && elements[1].items.length) || (elements.length == 1 && elements[0].items.length)) {
                            for(let item of included) {
                                // perform checks
                                if(item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                                    if(item.title.text && item.primarySubtitle.text && item.title.text.includes('LinkedIn Member') == false) {
                                        if(getConnectParams.positiveKeywords) {
                                            for(let text of getConnectParams.positiveKeywords.split(',')) {
                                                if(item.title.text.toLowerCase().includes(text.toLowerCase()) == true || item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == true) {
                                                    audConnectionItems.push(item)
                                                }
                                            }
                                        }else if(getConnectParams.negativeKeywords) {
                                            for(let text of getConnectParams.negativeKeywords.split(',')) {
                                                if(item.title.text.toLowerCase().includes(text.toLowerCase()) == false && item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == false) {
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
                                afcSetConnectionData(totalResultCount)
                            }

                        }else if((elements.length > 1 && !elements[1].items.length) || (elements.length == 1 && !elements[0].items.length) && !audConnectionItems.length) {
                            $('#afc-displayNewAudienceStatus').html('No result found, change your search criteria and try again!')
                            $('.newAudienceAction').attr('disabled', false)

                        }else if((elements.length > 1 && !elements[1].items.length) || (elements.length == 1 && !elements[0].items.length) && audConnectionItems.length) {
                            $('#displayNewAudienceStatus').html(`Found ${audConnectionItems.length} audience.`)
                            // call next action: cleanConnectionData or memberBadge
                            audConnectionItems
                            afcSetConnectionData(totalResultCount)
                        }

                    }else if(audConnectionItems.length) {
                        $('#displayNewAudienceStatus').html(`Found ${audConnectionItems.length} audience.`)
                        // call next action: cleanConnectionData or memberBadge
                        afcSetConnectionData(totalResultCount)
                    }else {
                        $('#afc-displayNewAudienceStatus').html('No result found, change your search criteria and try again!')
                        $('.newAudienceAction').attr('disabled', false)
                    }
                },
                error: function(err) {
                    console.log(err.responseJSON)
                    $('#afc-displayNewAudienceStatus').html('Something went wrong while trying to get connections!')
                    $('.newAudienceAction').attr('disabled', false)
                }
            })
        },5000)
    }
    getConnectionsLooper()
}

const afcEventAttendees = async () => {
    let totalResultCount = 0;
    voyagerBlockSearchUrl = voyagerBlockSearchUrl.replace('GLOBAL_SEARCH_HEADER','EVENT_PAGE_CANNED_SEARCH')

    let getConnectionsLooper = () => {
        setTimeout(async () => {
            await $.ajax({
                method: 'get',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', acceptVnd);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_search_srp_people;+DUrmPTDTtOGzG9sI/UzuA==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerBlockSearchUrl}&query=${getConnectParams.queryParams}&start=${getConnectParams.startPosition}`,
                success: function(data){
                    let res = {'data': data}
                    let elements = res['data'].data.elements
                    let included = res['data'].included

                    if(elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        if(elements[1].items.length) {
                            for(let item of included) {
                                // perform checks
                                if(item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                                    if(item.title.text && item.primarySubtitle.text && item.title.text.includes('LinkedIn Member') == false) {
                                        if(getConnectParams.positiveKeywords) {
                                            for(let text of getConnectParams.positiveKeywords.split(',')) {
                                                if(item.title.text.toLowerCase().includes(text.toLowerCase()) == true || item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == true) {
                                                    audConnectionItems.push(item)
                                                }
                                            }
                                        }else if(getConnectParams.negativeKeywords) {
                                            for(let text of getConnectParams.negativeKeywords.split(',')) {
                                                if(item.title.text.toLowerCase().includes(text.toLowerCase()) == false && item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == false) {
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
                                afcSetConnectionData(totalResultCount)
                            }
                        }else if(!elements[1].items.length && !audConnectionItems.length) {
                            $('#afc-displayNewAudienceStatus').html('No result found, change your search criteria and try again!')
                            $('.newAudienceAction').attr('disabled', false)

                        }else if(!elements[1].items.length && audConnectionItems.length) {
                            $('#displayNewAudienceStatus').html(`Found ${audConnectionItems.length} audience.`)
                            // call next action: cleanConnectionData or memberBadge
                            afcSetConnectionData(totalResultCount)
                        }

                    }else if(audConnectionItems.length) {
                        $('#displayNewAudienceStatus').html(`Found ${audConnectionItems.length} audience.`)
                        // call next action: cleanConnectionData or memberBadge
                        afcSetConnectionData(totalResultCount)
                    }else {
                        $('#afc-displayNewAudienceStatus').html('No result found, change your search criteria and try again!')
                        $('.newAudienceAction').attr('disabled', false)
                    }
                },
                error: function(err) {
                    console.log(err.responseJSON)
                    $('#afc-displayNewAudienceStatus').html('Something went wrong while trying to get event attendees!')
                    $('.newAudienceAction').attr('disabled', false)
                }
            })
        },10000)
    }
    getConnectionsLooper()
}

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

    memberBadgesEndpoint(connections,getConnectParams.delayTime,getConnectParams.audienceName,getConnectParams.audienceType)
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

    memberBadgesEndpoint(connections, getConnectParams.delayTime,getConnectParams.audienceName,getConnectParams.audienceType);
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
        data: json_data,
        success: function(data){
            if(data.length > 0 ){
                newAudienceList(data[0].audienceName, con, memberBadgesData, networkInfoData, positionGroupsData, companyData)
            }else {
                $('.newAudience-notice').show()
                $('#afc-displayNewAudienceStatus').empty()
                $('#afc-displayNewAudienceStatus').html(data.message)
                $('.newAudienceAction').attr('disabled', false)
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

const newAudienceList = async (audienceName, con, memberBadgesData, networkInfoData, positionGroupsData, companyData) => {
    $('.newAudience-notice').show()
    var x=0, s=0;
    var index;

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
        
                await $.ajax({
                    method: 'post',
                    beforeSend: function(request) {
                        request.setRequestHeader('Content-Type', 'application/json')
                        request.setRequestHeader('lk-id', linkedinId)
                    },
                    url: `${filterApi}/audience/list`,
                    data: JSON.stringify({
                        audienceId: audienceName.audience_id,
                        firstName: con[i].firstName,
                        lastName: con[i].lastName,
                        email: email,
                        title: con[i].title,
                        locationName: con[i].locationName == null ? location : con[i].locationName,
                        publicIdentifier: con[i].publicIdentifier,
                        connectionId: con[i].connectionId,
                        trackingId: con[i].trackingId,
                        memberUrn: con[i].memberUrn
                    }),
                    success: function(data){
                        if(data.message == 'success'){
                            var name = con[i].firstName+' '+con[i].lastName;
                            var jobtitle = con[i].title;
                            index = i +1;
                            skipped= s;
                            newAudienceListUpdate(con[i].connectionId,audienceName.audience_id,distance,companyUrl,name,jobtitle,index,premium,influencer,jobSeeker,skipped)
                            x++;
                        }else if(data.message == 'User already added to audience list'){
                            $('#afc-displayNewAudienceStatus').empty()
                            display = `
                            Connection already added to list.
                            `;
                            $('#afc-displayNewAudienceStatus').append(display)
                            s++;
                        }
                    },
                    error: function(error){
                        console.log(error)
                        $('.newAudienceAction').attr('disabled', false)
                        $('#afc-displayNewAudienceStatus').html('Something went wrong please try again.');
                    }
                })
            }
        }
    }
    $('.newAudienceAction').attr('disabled', false)
    
    // Show completion message
    $('#afc-displayNewAudienceStatus').empty()
    $('#afc-displayNewAudienceStatus').html(`
        <li><strong>Audience creation completed successfully!</strong></li>
        <li>Total users added: <b>${x}</b></li>
        <li>Total skipped: <b>${s}</b></li>
    `)
    
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

    await $.ajax({
        method: 'put',
        beforeSend: function(request) {
            request.setRequestHeader('Content-Type', 'application/json')
            request.setRequestHeader('lk-id', linkedinId)
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
            }
        },
        error: function(error){
            console.log(error)
            $('.newAudienceAction').attr('disabled', false)
        }
    })
}
