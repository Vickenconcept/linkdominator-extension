
let getAdcConnectParams = {}

// Utility to get JSESSIONID value without quotes
function getJSessionId() {
    const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
    return match ? match[1] : '';
}

$('body').on('click', '.addConnect', function(){
    console.log('Add Connect button clicked');
    $('#addc-displayConnectStatus').empty();
    $('#addc-displayConnectStatus').html('<li>Processing... Please wait.</li>');
    $('.addConnect').attr('disabled', true);
    var addcTotalFollow = $('#addc-totalFollow').val() < 10 ? 10 : $('#addc-totalFollow').val(),
        addcDelayFollowTime = $('#addc-delayFollowTime').val(),
        addcStart = $('#addc-startPosition').val() == '' ? 0 : $('#addc-startPosition').val(),
        addcSchoolId = '',
        addcConnectionId = '',
        addcRegionId = '',
        addcCurrCompId = '',
        addcPastCompId = '',
        addcIndustryId = '',
        addcLangId='',
        addcConnDegree = '',
        addcConnectIdList = '';

    let queryParams = '';

    $('#addc-startPosition').val() == '' ? $('#addc-startPosition').val(0) : $('#addc-startPosition').val()

    if(addcTotalFollow == '' || addcDelayFollowTime == ''){
        console.log('Validation failed: Total or Delay is empty');
        $('#addc-error-notice').html('<b>Total</b> and <b>Delay</b> fields cannot be empty')
        $('.addConnect').attr('disabled', false);
        return;
    }
    else if(addcDelayFollowTime < 30){
        console.log('Validation failed: Delay is less than 30');
        $('#addc-error-notice').html('Minimum of delay time is 30')
        $('.addConnect').attr('disabled', false);
        return;
    }else{
        console.log('Validation passed');
        $('#error-notice').html('')

            // check if value exists in list dropdown
        if($('#addc-selectedConnectOf li').length > 0){
            queryParams += setFIlterQueryParams('#addc-selectedConnectOf','connectionid','connectionOf')
        }
        if($('#addc-selectedLocation li').length > 0){
            queryParams += setFIlterQueryParams('#addc-selectedLocation','regionid','geoUrn')
        }
        if($('#addc-selectedSchool li').length > 0){
            queryParams += setFIlterQueryParams('#addc-selectedSchool','schoolid','schoolFilter')
        }
        if($('#addc-selectedCurrComp li').length > 0){
            queryParams += setFIlterQueryParams('#addc-selectedCurrComp','currcompid','currentCompany')
        }
        if($('#addc-selectedPastComp li').length > 0){
            queryParams += setFIlterQueryParams('#addc-selectedPastComp','pastcompid','pastCompany')
        }
        if($('#addc-selectedIndustry li').length > 0){
            queryParams += setFIlterQueryParams('#addc-selectedIndustry','industryid','industry')
        }
        if($('#addc-selectedLanguage li').length > 0){
            $('#addc-selectedLanguage li').each(function(index) {
                if(index == ($('#addc-selectedLanguage li').length -1)){
                    addcLangId += $(this).data('langcode');
                }else{
                    addcLangId += $(this).data('langcode')+',';
                }
            })
        }

        // set degree network to array and pass on
        var addcDegreeArr = []; 
        $('.addc-conn-degree input').each(function(index){
            if($(this).prop('checked') == true){
                addcDegreeArr.push($(this).val())
            }
        })
        for (var i = 0; i < addcDegreeArr.length; i++) {
            if(i == (addcDegreeArr.length -1)){
                addcConnDegree += addcDegreeArr[i]
            }else{
                addcConnDegree += addcDegreeArr[i] +','
            }
        }
        if(addcDegreeArr.length)
            queryParams += `network:List(${addcConnDegree}),`

        if($('#addc-firstName').val())
            queryParams += setFIlterQueryParamsFreeText('#addc-firstName','firstName')
        if($('#addc-lastName').val())
            queryParams += setFIlterQueryParamsFreeText('#addc-lastName','lastName')
        if($('#addc-school').val())
            queryParams += setFIlterQueryParamsFreeText('#addc-school','schoolFreetext')
        if($('#addc-title').val())
            queryParams += setFIlterQueryParamsFreeText('#addc-title','title')
        if($('#addc-company').val())
            queryParams += setFIlterQueryParamsFreeText('#addc-company','company')

        // check if connect with user who comment on field is checked
        var addcPostIdComment = $('#addc-commented-postid');
        var addcArticleIdComment = $('#addc-commented-articleid');
        var addcVideoIdComment = $('#addc-commented-videoid');
        var addcPostIdLiked = $('#addc-liked-postid');
        var addcArticleIdLiked = $('#addc-liked-articleid');
        var addcVideoIdLiked = $('#addc-liked-videoid');
        var addcCommentId;

        getAdcConnectParams = {
            positiveKeywords: $('#addc-keywordsForConnect').val(),
            negativeKeywords: $('#addc-excludeUser').val(),
        }

        if(addcPostIdComment.val() !=''){
            addcCommentId = 'activity%3A'+addcPostIdComment.val();

            addcGetCommentProfiles(addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime);
        }else if(addcArticleIdComment.val() !=''){
            addcCommentId = 'article%3A'+addcArticleIdComment.val();

            addcGetCommentProfiles(addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime);

        }else if(addcVideoIdComment.val() !=''){
            addcCommentId = 'ugcPost%3A'+addcVideoIdComment.val();

            addcGetCommentProfiles(addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime);

        }else if(addcPostIdLiked.val() !=''){
            addcCommentId = 'activity%3A'+addcPostIdLiked.val();

            addcGetLikedProfiles(addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime);

        }else if(addcArticleIdLiked.val() !=''){
            addcCommentId = 'article%3A'+addcArticleIdLiked.val();

            addcGetLikedProfiles(addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime);

        }else if(addcVideoIdLiked.val() !=''){
            addcCommentId = 'ugcPost%3A'+addcVideoIdLiked.val();

            addcGetLikedProfiles(addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime);

        }else {
            // Check which method is selected
            let audienceMethodSelected = $('#audience-method-card').hasClass('selected');
            let searchMethodSelected = $('#search-method-card').hasClass('selected');
            
            // If audience method is selected, validate that an audience is chosen
            if(audienceMethodSelected && $('#addc-audience-select').val() == ''){
                console.log('Validation failed: Audience method selected but no audience chosen');
                $('#addc-error-notice').html('Please select an audience from the dropdown');
                $('.addConnect').attr('disabled', false);
                return;
            }
            
            // If audience is selected (either method), use audience data
            if($('#addc-audience-select').val() !='' || $('#addc-audience-select-search').val() !=''){
                let audience = parseInt($('#addc-audience-select').val() || $('#addc-audience-select-search').val());
                console.log('Audience selected:', audience);
                addcGetAudienceData(audience, addcDelayFollowTime);
            }
            // If search method is selected and no audience, use search parameters
            else if(searchMethodSelected || (!audienceMethodSelected && !searchMethodSelected)) {
                if($('#addc-search-term').val())
                    query = `(keywords:${encodeURIComponent($('#addc-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
                else
                    query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
                console.log('Using search parameters, query:', query);
                addcGetConnections(addcConnectIdList,query,addcTotalFollow,addcStart,addcDelayFollowTime)
            }
            // If no method is selected, show error
            else {
                console.log('Validation failed: No method selected');
                $('#addc-error-notice').html('Please select either an audience or search parameters');
                $('.addConnect').attr('disabled', false);
                return;
            }
        }
        
        $(this).attr('disabled', true)
    }
})

const addcGetLikedProfiles = async (addcCommentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime) => {
    var addcLikedArr = [];
    var addcLikedArrMain = [];

    await fetch(`${voyagerApi}/feed/likes?count=${addcTotalFollow}&objectId=${addcCommentId}&q=likes&start=${addcStart}`, {
        headers: {
            'cookie': document.cookie,
            'csrf-token': jsession
        }
    })
    .then( response => response.json() )
    .then( response => {
        if(response.elements.length > 0){
            $.each(response.elements, function(index, item){
                var urnPath = item.actor['com.linkedin.voyager.feed.MemberActor'].miniProfile;
                var memberUrnPath = item.actor['com.linkedin.voyager.feed.MemberActor'];
                var targetIdd;
                if(memberUrnPath.urn.includes('urn:li:member:')){
                    targetIdd = memberUrnPath.urn.replace('urn:li:member:','') 
                }

                if(urnPath.entityUrn.includes('urn:li:fs_miniProfile:'))
                    var connectId = urnPath.entityUrn.replace('urn:li:fs_miniProfile:','')
                
                addcLikedArr.push({
                    name: urnPath.firstName+' '+urnPath.lastName,
                    title: urnPath.occupation,
                    connectId: connectId,
                    trackingId: urnPath.trackingId,
                    profileId: urnPath.publicIdentifier,
                    firstName: urnPath.firstName,
                    lastName: urnPath.lastName,
                    navigationUrl: `https://www.linkedin.com/in/${urnPath.publicIdentifier}`,
                    targetId: parseInt(targetIdd),
                    memberUrn: memberUrnPath.urn
                })
            })
            if($('#addc-connectUser').prop('checked') == true && $('#addc-keywordsForConnect').val() !=''){
                // keywords for connecting use case
                var keywords = $('#addc-keywordsForConnect').val().toLowerCase().split(',');

                $.each(addcLikedArr, function(i, item){
                    for(let x=0; x<keywords.length; x++){
                        if(item.name.toLowerCase().includes(keywords[x]) || item.title.toLowerCase().includes(keywords[x])){
                            addcLikedArrMain.push(item)
                        }
                    }
                })
                if(addcLikedArrMain.length > 0){
                    let filterConArr = addcLikedArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                    addcProfileActionList(filterConArr, addcConnectIdList,addcDelayFollowTime)
                }else{
                    $('.add-connect').show()
                    $('#addc-displayConnectStatus').empty()
                    $('#addc-displayConnectStatus').html('No match found!')
                    $('.addConnect').attr('disabled', false)
                }
            }else if($('#addc-excludeUser').prop('checked') == true && $('#addc-excludeKeywords').val() !=''){
                // excluded keywords for connecting use case
                var exkeywords = $('#addc-excludeKeywords').val().toLowerCase().split(',');

                $.each(addcLikedArr, function(i, item){
                    for(let x=0; x<exkeywords.length; x++){
                        if(!item.name.toLowerCase().includes(exkeywords[x]) || !item.title.toLowerCase().includes(exkeywords[x])){
                            addcLikedArrMain.push(item)
                        }
                    }
                })
                if(addcLikedArrMain.length > 0){
                    let filterConArr = addcLikedArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                    addcProfileActionList(filterConArr, addcConnectIdList,addcDelayFollowTime)
                }else{
                    $('.add-connect').show()
                    $('#addc-displayConnectStatus').empty()
                    $('#addc-displayConnectStatus').html('No match found!')
                    $('.addConnect').attr('disabled', false)
                }
            }else{
                addcProfileActionList(addcLikedArr, addcConnectIdList,addcDelayFollowTime)
            }
            
        }else{
            $('.add-connect').show();
            $('#addc-displayConnectStatus').text('No Connection found in search criteria!');
            $('.addConnect').attr('disabled', false)
        }
    })

}

const addcGetCommentProfiles = async (commentId,addcConnectIdList,addcTotalFollow,addcStart,addcDelayFollowTime) => {
    var addcCommentArr = [];
    var addcCommentArrMain = [];

    await fetch(`${voyagerApi}/feed/comments?count=${addcTotalFollow}&q=comments&sortOrder=CHRON&start=${addcStart}&updateId=${commentId}`, {
            headers: {
                'cookie': document.cookie,
                'csrf-token': jsession
            }
        }
    )
    .then( response => response.json() )
    .then( response => {
        if( response.elements.length > 0){
            $.each(response.elements, function(index, item){
                var urnPath = item.commenter['com.linkedin.voyager.feed.MemberActor'].miniProfile;
                var memberUrnPath = item.commenter['com.linkedin.voyager.feed.MemberActor'];
                var targetIdd;
                if(memberUrnPath.urn.includes('urn:li:member:')){
                    targetIdd = memberUrnPath.urn.replace('urn:li:member:','') 
                }

                addcCommentArr.push({
                    name: urnPath.firstName+' '+urnPath.lastName,
                    title: urnPath.occupation,
                    connectId: item.commenterProfileId,
                    trackingId: urnPath.trackingId,
                    profileId: urnPath.publicIdentifier,
                    firstName: urnPath.firstName,
                    lastName: urnPath.lastName,
                    navigationUrl: `https://www.linkedin.com/in/${urnPath.publicIdentifier}`,
                    targetId: parseInt(targetIdd),
                    memberUrn: memberUrnPath.urn
                })
            })

            if($('#addc-connectUser').prop('checked') == true && $('#addc-keywordsForConnect').val() !=''){
                // keywords for connecting use case
                var keywords = $('#addc-keywordsForConnect').val().toLowerCase().split(',');

                $.each(addcCommentArr, function(i, item){
                    for(let x=0; x<keywords.length; x++){
                        if(item.name.toLowerCase().includes(keywords[x]) || item.title.toLowerCase().includes(keywords[x])){
                            addcCommentArrMain.push(item)
                        }
                    }
                })
                if(addcCommentArrMain.length > 0){
                    // remove duplicates
                    let filterConArr = addcCommentArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                    addcProfileActionList(filterConArr, addcConnectIdList,addcDelayFollowTime)
                }else{
                    $('.add-connect').show()
                    $('#addc-displayConnectStatus').empty()
                    $('#addc-displayConnectStatus').html('No match found!')
                    $('.addConnect').attr('disabled', false)
                }
                
            }else if($('#addc-excludeUser').prop('checked') == true && $('#addc-excludeKeywords').val() !=''){
                // excluded keywords for connecting use case
                var exkeywords = $('#addc-excludeKeywords').val().toLowerCase().split(',');

                $.each(addcCommentArr, function(i, item){
                    for(let x=0; x<exkeywords.length; x++){
                        if(!item.name.toLowerCase().includes(exkeywords[x]) || !item.title.toLowerCase().includes(exkeywords[x])){
                            addcCommentArrMain.push(item)
                        }
                    }
                })

                if(addcCommentArrMain.length > 0){
                    let filterConArr = addcCommentArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                    addcProfileActionList(filterConArr, addcConnectIdList,addcDelayFollowTime)
                }else{
                    $('.add-connect').show()
                    $('#addc-displayConnectStatus').empty()
                    $('#addc-displayConnectStatus').html('No match found!')
                    $('.addConnect').attr('disabled', false)
                }
            }else{
                addcProfileActionList(addcCommentArr, addcConnectIdList,addcDelayFollowTime)
            }

        }else{
            $('.add-connect').show();
            $('#addc-displayConnectStatus').text('No Connection found in search criteria!');
            $('.addConnect').attr('disabled', false)
        }
    })
}

var timeOutGetCon;
// const addcGetConnections = (addcConnectIdList,queryParams,addcTotalFollow,addcStart,addcDelayFollowTime) => {
//     // var addcParams;
//     // var addcFirstName = $('#addc-firstName').val(),
//     //     addcLastName = $('#addc-lastName').val(),
//     //     addcTitle = $('#addc-title').val(),
//     //     addcCompany = $('#addc-company').val(),
//     //     addcSchool = $('#addc-school').val();
//     var con = [];
//     var conArr = [];
//     var seiveConnArr = [];
//     var newposition = 0;
//     var totalSearchCount = 0;
//     var totalS_userSpnT = 0;

//     var addccLooper = () => {
//         seiveConnArr = seiveConnArr.filter(function( element ) {
//             return element !== undefined;
//         });
//         // if(addcSearchTerm != ''){
//         //     addcParams = `count=${addcTotalFollow}&filters=List(resultType-%3EPEOPLE,network-%3E${addcConnDegree},geoRegion-%3E${addcRegionId},industry-%3E${addcIndustryId},currentCompany-%3E${addcCurrCompId},pastCompany-%3E${addcPastCompId},connectionOf-%3E${addcConnectionId},school-%3E${addcSchoolId},firstName-%3E${addcFirstName},lastName-%3E${addcLastName},title-%3E${addcTitle},company-%3E${addcCompany},school-%3E${addcSchool},profileLanguage-%3E${addcLangId})&keywords=${addcSearchTerm}&queryContext=List(spellCorrectionEnabled-%3Etrue,relatedSearchesEnabled-%3Etrue,kcardTypes-%3EPROFILE%7CCOMPANY)&origin=FACETED_SEARCH&q=all&start=${addcStart}`;
//         // }else{
//         //     addcParams = `count=${addcTotalFollow}&filters=List(resultType-%3EPEOPLE,network-%3E${addcConnDegree},geoRegion-%3E${addcRegionId},industry-%3E${addcIndustryId},currentCompany-%3E${addcCurrCompId},pastCompany-%3E${addcPastCompId},connectionOf-%3E${addcConnectionId},school-%3E${addcSchoolId},firstName-%3E${addcFirstName},lastName-%3E${addcLastName},title-%3E${addcTitle},company-%3E${addcCompany},school-%3E${addcSchool},profileLanguage-%3E${addcLangId})&queryContext=List(spellCorrectionEnabled-%3Etrue,relatedSearchesEnabled-%3Etrue,kcardTypes-%3EPROFILE%7CCOMPANY)&origin=FACETED_SEARCH&q=all&start=${addcStart}`;
//         // }

//         timeOutGetCon = setTimeout(async function(){
//             await fetch(`${voyagerApi}/search/blended?${addcParams}`, {
//                 headers: {
//                     'cookie': document.cookie,
//                     'csrf-token': jsession,
//                     'accept': acceptVnd,
//                     'content-type': contentType,
//                     'x-li-lang': xLiLang,
//                     'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;QazGJ/pNTwuq6OTtMClfPw==',
//                     'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
//                     'x-restli-protocol-version': xRestliProtocolVersion
//                 }
//             })
//             .then( response => response.json() )
//             .then( response => {
//                 var res = {'data': response};

//                 if(res['data'].data.elements.length > 0){
//                     var addcConnectionResponse = res['data'].data.elements[0].elements;
//                     var addcConnectionResponse1 = res['data'].data.elements[1] ? res['data'].data.elements[1].elements : '';

//                     if (addcConnectionResponse.length > 0) {
//                         var totalResult = res['data'].data.paging.total;

//                         // get all connection ids to an array
//                         $.each(addcConnectionResponse, function(index, item){
//                             var addcProfilUrn = item.targetUrn;
//                             var fullname = item.title.text.split(" ");
//                             var targetIdd;
//                             if(item.trackingUrn.includes('urn:li:member:')){
//                                 targetIdd = item.trackingUrn.replace('urn:li:member:','') 
//                             }
//                             if(addcProfilUrn.includes('urn:li:fs_miniProfile:')){
//                                 var addcConnectionId = addcProfilUrn.replace('urn:li:fs_miniProfile:','')

//                                 con.push({
//                                     name: item.title.text,
//                                     title: item.headline.text,
//                                     connectId: addcConnectionId,
//                                     trackingId: item.trackingId,
//                                     profileId: item.publicIdentifier,
//                                     firstName: fullname[0],
//                                     lastName: fullname[1],
//                                     navigationUrl: `https://www.linkedin.com/in/${item.publicIdentifier}`,
//                                     targetId: parseInt(targetIdd),
//                                     memberUrn: item.trackingUrn,
//                                     totalResultCount: totalResult
//                                 })			
//                             }
//                         })
//                         if($('#addc-connectUser').prop('checked') == true && $('#addc-keywordsForConnect').val() !=''){
//                             $('.add-connect').show()
//                             $('#addc-displayConnectStatus').empty()
//                             $('#addc-displayConnectStatus').html(`Search result found: ${totalResult}.<br>Scanning through search result for keyword(s).<br>This may take some time. Please wait...`)
//                             // keywords for connecting use case
//                             var keywords = $('#addc-keywordsForConnect').val().toLowerCase().split(',');
//                             $.each(con, function(i, item){
//                                 for(let s=0; s<keywords.length; s++){
//                                     if(item.name.toLowerCase().includes(keywords[s]) || item.title.toLowerCase().includes(keywords[s])){
//                                         conArr.push(item)
//                                     }
//                                 }
//                             })
//                             if(conArr.length > 0){
//                                 // remove duplicate 
//                                 var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);
//                                 // seive count of data to user total
//                                 totalUserConnect = parseInt($('#addc-totalFollow').val()) - seiveConnArr.length

//                                 if(filterConArr.length > totalUserConnect){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     // pass to addcProfileActionList endpoint because it meets criteria in keyword and total
//                                     addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                                 }else if(seiveConnArr.length < parseInt($('#addc-totalFollow').val())){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     let start = parseInt($('#addc-startPosition').val());
//                                     ////////////////
//                                     totalS_userSpnT = totalResult - start
//                                     if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                         newposition = totalS_userSpnT
//                                     }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                         newposition = 10
//                                     }else{
//                                         newposition = parseInt($('#addc-totalFollow').val())
//                                     }
//                                     $('#addc-startPosition').val(start + newposition);
//                                     ///////////////
//                                     addcStart = $('#addc-startPosition').val();
//                                     addccLooper()
//                                 }
//                             } else if (conArr.length == 0 && seiveConnArr.length < parseInt($('#addc-totalFollow').val())) {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             } else {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             }
//                         }else if($('#addc-excludeUser').prop('checked') == true && $('#addc-excludeKeywords').val() !='') {
//                             $('.add-connect').show()
//                             $('#addc-displayConnectStatus').empty()
//                             $('#addc-displayConnectStatus').html(`Search result found: ${totalResult}.<br>Scanning through search result for keyword(s).<br>This may take some time. Please wait...`)
//                             // excluded keywords for connecting use case
//                             var exkeywords = $('#addc-excludeKeywords').val().toLowerCase().split(',');
//                             $.each(con, function(i, item){
//                                 for(let x=0; x<exkeywords.length; x++){
//                                     if(!item.name.toLowerCase().includes(exkeywords[x]) || !item.title.toLowerCase().includes(exkeywords[x])){
//                                         conArr.push(item)
//                                     }
//                                 }
//                             })
//                             if(conArr.length > 0){
//                                 // remove duplicate 
//                                 var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);
//                                 // seive count of data to user total
//                                 totalUserConnect = parseInt($('#addc-totalFollow').val()) - seiveConnArr.length

//                                 if(filterConArr.length > totalUserConnect){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     // pass to addcProfileActionList endpoint because it meets criteria in keyword and total
//                                     addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                                 }else if(seiveConnArr.length < parseInt($('#addc-totalFollow').val())){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     let start = parseInt($('#addc-startPosition').val());
//                                     ////////////////
//                                     totalS_userSpnT = totalResult - start
//                                     if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                         newposition = totalS_userSpnT
//                                     }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                         newposition = 10
//                                     }else{
//                                         newposition = parseInt($('#addc-totalFollow').val())
//                                     }
//                                     $('#addc-startPosition').val(start + newposition);
//                                     ///////////////
//                                     addcStart = $('#addc-startPosition').val();
//                                     addccLooper()
//                                 }
//                             } else if (conArr.length == 0 && seiveConnArr.length < parseInt($('#addc-totalFollow').val())) {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             } else {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             }

//                         }else {
//                             // no +ive / -ive keyword use case
//                             // seive count of data to user total
//                             if(con.length > parseInt($('#addc-totalFollow').val())){
//                                 for(var s = 0; s < parseInt($('#addc-totalFollow').val()); s++){
//                                     seiveConnArr.push(con[s])
//                                 }
//                                 // pass to memberBadges endpoint
//                                 addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                             }else if (con.length < parseInt($('#addc-totalFollow').val())){
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalSearchCount = totalResult
//                                 totalS_userSpnT = totalSearchCount - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             }else{
//                                 seiveConnArr = con.slice();
//                                 // pass to memberBadges endpoint
//                                 addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                             }
//                         }

//                     }else if (addcConnectionResponse1.length > 0) {
//                         var totalResult = res['data'].data.paging.total;

//                         // get all connection ids to an array
//                         $.each(addcConnectionResponse1, function(index, item){
//                             var addcProfilUrn = item.targetUrn;
//                             var fullname = item.title.text.split(" ");
//                             var targetIdd;
//                             if(item.trackingUrn.includes('urn:li:member:')){
//                                 targetIdd = item.trackingUrn.replace('urn:li:member:','') 
//                             }
//                             if(addcProfilUrn.includes('urn:li:fs_miniProfile:')){
//                                 var addcConnectionId = addcProfilUrn.replace('urn:li:fs_miniProfile:','')

//                                 con.push({
//                                     name: item.title.text,
//                                     title: item.headline.text,
//                                     connectId: addcConnectionId,
//                                     trackingId: item.trackingId,
//                                     profileId: item.publicIdentifier,
//                                     firstName: fullname[0],
//                                     lastName: fullname[1],
//                                     navigationUrl: `https://www.linkedin.com/in/${item.publicIdentifier}`,
//                                     targetId: parseInt(targetIdd),
//                                     memberUrn: item.trackingUrn,
//                                     totalResultCount: totalResult
//                                 })			
//                             }
//                         })
//                         if($('#addc-connectUser').prop('checked') == true && $('#addc-keywordsForConnect').val() !=''){
//                             $('.add-connect').show()
//                             $('#addc-displayConnectStatus').empty()
//                             $('#addc-displayConnectStatus').html(`Search result found: ${totalResult}.<br>Scanning through search result for keyword(s).<br>This may take some time. Please wait...`)
//                             // keywords for connecting use case
//                             var keywords = $('#addc-keywordsForConnect').val().toLowerCase().split(',');
//                             $.each(con, function(i, item){
//                                 for(let s=0; s<keywords.length; s++){
//                                     if(item.name.toLowerCase().includes(keywords[s]) || item.title.toLowerCase().includes(keywords[s])){
//                                         conArr.push(item)
//                                     }
//                                 }
//                             })
//                             if(conArr.length > 0){
//                                 // remove duplicate 
//                                 var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);
//                                 // seive count of data to user total
//                                 totalUserConnect = parseInt($('#addc-totalFollow').val()) - seiveConnArr.length

//                                 if(filterConArr.length > totalUserConnect){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     // pass to addcProfileActionList endpoint because it meets criteria in keyword and total
//                                     addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                                 }else if(seiveConnArr.length < parseInt($('#addc-totalFollow').val())){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     let start = parseInt($('#addc-startPosition').val());
//                                     ////////////////
//                                     totalS_userSpnT = totalResult - start
//                                     if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                         newposition = totalS_userSpnT
//                                     }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                         newposition = 10
//                                     }else{
//                                         newposition = parseInt($('#addc-totalFollow').val())
//                                     }
//                                     $('#addc-startPosition').val(start + newposition);
//                                     ///////////////
//                                     addcStart = $('#addc-startPosition').val();
//                                     addccLooper()
//                                 }
//                             } else if (conArr.length == 0 && seiveConnArr.length < parseInt($('#addc-totalFollow').val())) {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             } else {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             }
//                         }else if($('#addc-excludeUser').prop('checked') == true && $('#addc-excludeKeywords').val() !='') {
//                             $('.add-connect').show()
//                             $('#addc-displayConnectStatus').empty()
//                             $('#addc-displayConnectStatus').html(`Search result found: ${totalResult}.<br>Scanning through search result for keyword(s).<br>This may take some time. Please wait...`)
//                             // excluded keywords for connecting use case
//                             var exkeywords = $('#addc-excludeKeywords').val().toLowerCase().split(',');
//                             $.each(con, function(i, item){
//                                 for(let x=0; x<exkeywords.length; x++){
//                                     if(!item.name.toLowerCase().includes(exkeywords[x]) || !item.title.toLowerCase().includes(exkeywords[x])){
//                                         conArr.push(item)
//                                     }
//                                 }
//                             })
//                             if(conArr.length > 0){
//                                 // remove duplicate 
//                                 var filterConArr = conArr.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);
//                                 // seive count of data to user total
//                                 totalUserConnect = parseInt($('#addc-totalFollow').val()) - seiveConnArr.length

//                                 if(filterConArr.length > totalUserConnect){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     // pass to addcProfileActionList endpoint because it meets criteria in keyword and total
//                                     addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                                 }else if(seiveConnArr.length < parseInt($('#addc-totalFollow').val())){
//                                     for(var s = seiveConnArr.length; s < parseInt($('#addc-totalFollow').val()); s++){
//                                         seiveConnArr.push(filterConArr[s])
//                                     }
//                                     let start = parseInt($('#addc-startPosition').val());
//                                     ////////////////
//                                     totalS_userSpnT = totalResult - start
//                                     if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                         newposition = totalS_userSpnT
//                                     }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                         newposition = 10
//                                     }else{
//                                         newposition = parseInt($('#addc-totalFollow').val())
//                                     }
//                                     $('#addc-startPosition').val(start + newposition);
//                                     ///////////////
//                                     addcStart = $('#addc-startPosition').val();
//                                     addccLooper()
//                                 }
//                             } else if (conArr.length == 0 && seiveConnArr.length < parseInt($('#addc-totalFollow').val())) {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             } else {
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalS_userSpnT = totalResult - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             }

//                         }else {
//                             // no +ive / -ive keyword use case
//                             // seive count of data to user total
//                             if(con.length > parseInt($('#addc-totalFollow').val())){
//                                 for(var s = 0; s < parseInt($('#addc-totalFollow').val()); s++){
//                                     seiveConnArr.push(con[s])
//                                 }
//                                 // pass to memberBadges endpoint
//                                 addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                             }else if (con.length < parseInt($('#addc-totalFollow').val())){
//                                 let start = parseInt($('#addc-startPosition').val());
//                                 ////////////////
//                                 totalSearchCount = totalResult
//                                 totalS_userSpnT = totalSearchCount - start
//                                 if (totalS_userSpnT < parseInt($('#addc-totalFollow').val())){
//                                     newposition = totalS_userSpnT
//                                 }else if (parseInt($('#addc-totalFollow').val()) < 10){
//                                     newposition = 10
//                                 }else{
//                                     newposition = parseInt($('#addc-totalFollow').val())
//                                 }
//                                 $('#addc-startPosition').val(start + newposition);
//                                 ///////////////
//                                 addcStart = $('#addc-startPosition').val();
//                                 addccLooper()
//                             }else{
//                                 seiveConnArr = con.slice();
//                                 // pass to memberBadges endpoint
//                                 addcProfileActionList(seiveConnArr, addcConnectIdList,addcDelayFollowTime)
//                             }
//                         }

//                     }else if (addcConnectionResponse.length == 0 && seiveConnArr.length > 0) {
//                         $('.add-connect').show()
//                         $('#addc-displayConnectStatus').empty()
//                         $('#addc-displayConnectStatus').html('Found '+seiveConnArr.length+'<br> Adding '+seiveConnArr.length+' to list')
//                         addcProfileActionList(seiveConnArr,addcConnectIdList,addcDelayFollowTime)
//                     }else{
//                         $('.add-connect').show()
//                         $('#addc-displayConnectStatus').empty()
//                         $('#addc-displayConnectStatus').html('No match found!')
//                         $('.addConnect').attr('disabled', false)
//                         return false;
//                     }
//                 }else if(res['data'].data.elements.length == 0 && seiveConnArr.length > 0){
//                     $('.add-connect').show()
//                     $('#addc-displayConnectStatus').empty()
//                     $('#addc-displayConnectStatus').html('Found '+seiveConnArr.length+' <br> Adding '+seiveConnArr.length+' to list')
//                     addcProfileActionList(seiveConnArr,addcConnectIdList,addcDelayFollowTime)
//                 }else{
//                     $('.add-connect').show()
//                     $('#addc-displayConnectStatus').empty()
//                     $('#addc-displayConnectStatus').html('No match found!')
//                     $('.addConnect').attr('disabled', false)
//                     return false;
//                 }
//             })
//         }, 10000)
//     }
//     addccLooper()

// }

const addcGetConnections = (addcConnectIdList,queryParams,addcTotalFollow,addcStart,addcDelayConnectTime) => {
    console.log('Fetching connections with params:', queryParams, 'Total:', addcTotalFollow, 'Start:', addcStart);
    $('.add-connect').show()
    $('#addc-displayConnectStatus').empty()
    $('#addc-displayConnectStatus').html('Scanning. Please wait...')
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
                url: `${voyagerBlockSearchUrl}&query=${queryParams}&start=${addcStart}`,
                success: function(data) {
                    try {
                        console.log('Connections response:', data);
                        let res = {'data': data}
                        
                        // Check if the expected data structure exists
                        if(!res['data'] || !res['data'].data || !res['data'].data.elements) {
                            console.error('❌ Unexpected response structure:', res);
                            $('#addc-displayConnectStatus').html('Unexpected response structure from LinkedIn API');
                            $('.addConnect').attr('disabled', false);
                            return;
                        }
                        
                        let elements = res['data'].data.elements
                        let included = res['data'].included

                    console.log('🔍 Response structure analysis:', {
                        elementsLength: elements ? elements.length : 'undefined',
                        elementsType: typeof elements,
                        hasElements1: elements && elements[1] ? 'yes' : 'no',
                        elements1Type: elements && elements[1] ? typeof elements[1] : 'N/A',
                        hasItems: elements && elements[1] && elements[1].items ? 'yes' : 'no'
                    });

                    if(elements && elements.length) {
                        if(totalResultCount == 0)
                            totalResultCount = res['data'].data.metadata.totalResultCount

                        // Check if elements[1] exists and has items
                        if(elements[1] && elements[1].items && elements[1].items.length) {
                            for(let item of included) {
                                // perform checks
                                if(item.hasOwnProperty('title') && item.hasOwnProperty('primarySubtitle')) {
                                    if(item.title.text && item.primarySubtitle.text && item.title.text.includes('LinkedIn Member') == false) {
                                        if(getAdcConnectParams.positiveKeywords && $('#addc-connectUser').prop('checked') == true) {
                                            for(let text of getAdcConnectParams.positiveKeywords.split(',')) {
                                                if(item.title.text.toLowerCase().includes(text.toLowerCase()) == true || item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == true) {
                                                    connectionItems.push(item)
                                                }
                                            }
                                        }else if(getAdcConnectParams.negativeKeywords && $('#addc-excludeUser').prop('checked') == true) {
                                            for(let text of getAdcConnectParams.negativeKeywords.split(',')) {
                                                if(item.title.text.toLowerCase().includes(text.toLowerCase()) == false && item.primarySubtitle.text.toLowerCase().includes(text.toLowerCase()) == false) {
                                                    audConnectionItems.push(item)
                                                }
                                            }
                                        }else {
                                            connectionItems.push(item)
                                        }
                                    }
                                }
                            }

                            if(connectionItems.length < addcTotalFollow) {
                                addcStart = parseInt(addcStart) + 11
                                $('#addc-startPosition').val(addcStart)
                                getConnectionsLooper()
                            }else {
                                addcCleanConnectionsData(connectionItems,totalResultCount,addcConnectIdList,addcDelayConnectTime)
                            }
                        }else {
                            console.log('⚠️ Unexpected response structure - elements[1] or items not found');
                            console.log('🔍 Elements structure:', elements);
                            
                            // Try alternative approach - check if included has profile data directly
                            if(included && included.length > 0) {
                                console.log('🔄 Trying alternative approach with included data...');
                                let validProfiles = included.filter(item => 
                                    item && item.hasOwnProperty('title') && 
                                    item.hasOwnProperty('primarySubtitle') &&
                                    item.title && item.title.text &&
                                    item.primarySubtitle && item.primarySubtitle.text
                                );
                                
                                if(validProfiles.length > 0) {
                                    console.log(`✅ Found ${validProfiles.length} valid profiles in included data`);
                                    for(let item of validProfiles) {
                                        if(item.title.text.includes('LinkedIn Member') == false) {
                                            connectionItems.push(item);
                                        }
                                    }
                                    
                                    if(connectionItems.length > 0) {
                                        addcCleanConnectionsData(connectionItems, totalResultCount, addcConnectIdList, addcDelayConnectTime);
                                        return;
                                    }
                                }
                            }
                            
                            console.log('No result found, changing search criteria and trying again.');
                            $('#addc-displayConnectStatus').html('No result found, change your search criteria and try again!')
                            $('.addConnect').attr('disabled', false)
                        }
                    }else if(connectionItems.length) {
                        console.log('Found', connectionItems.length, 'results. Messaging...');
                        $('#addc-displayConnectStatus').html(`Found ${connectionItems.length}. Messaging...`)
                        addcCleanConnectionsData(connectionItems,totalResultCount,addcConnectIdList,addcDelayConnectTime)
                    }else {
                        console.log('No result found, changing search criteria and trying again.');
                        $('#addc-displayConnectStatus').html('No result found, change your search criteria and try again!')
                        $('.addConnect').attr('disabled', false)
                    }
                    } catch (error) {
                        console.error('❌ Error processing connections response:', error);
                        $('#addc-displayConnectStatus').html('Error processing LinkedIn response');
                        $('.addConnect').attr('disabled', false);
                    }
                },
                error: function(error){
                    console.log('AJAX error fetching connections:', error)
                    $('#addc-displayConnectStatus').html('Something went wrong while trying to get connections!')
                    $('.addConnect').attr('disabled', false)
                }
            })
        },5000)
    }
    getConnectionsLooper()
}

const addcCleanConnectionsData = (connectionItems,totalResultCount,addcConnectIdList,addcDelayConnectTime) => {
    console.log('Cleaning connections data. Total results:', totalResultCount, 'Total connections to process:', connectionItems.length);
    let conArr = [], totalConnections = [];
    let profileUrn, publicIdentifier;

    connectionItems = connectionItems.filter((obj, index) => {
        return index === connectionItems.findIndex(o => obj.trackingId === o.trackingId);
    });

    for(let item of connectionItems) {
        profileUrn = item.entityUrn

        if(profileUrn.includes('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:') && 
            profileUrn.includes(',SEARCH_SRP,DEFAULT)')) {

            profileUrn = profileUrn.replace('urn:li:fsd_entityResultViewModel:(urn:li:fsd_profile:','')
            profileUrn = profileUrn.replace(',SEARCH_SRP,DEFAULT)','')
            publicIdentifier = item.navigationUrl.split('?')[0]

            conArr.push({
                firstName: item.title.text.split(' ')[0],
                lastName: item.title.text.split(' ')[1],
                name: item.title.text,
                title: item.primarySubtitle.text,
                locationName: item.secondarySubtitle.text,
                profileId: publicIdentifier.replace('https://www.linkedin.com/in/',''), 
                connectId: profileUrn,
                totalResultCount: totalResultCount,
                memberUrn: item.trackingUrn, 
                netDistance: parseInt(item.entityCustomTrackingInfo.memberDistance.split("_")[1]),
                trackingId: item.trackingId,
                navigationUrl: item.navigationUrl, 
                targetId: item.trackingUrn.replace('urn:li:member:','') 
            })			
        }
    }

    // get only user defined total
    for (let index = 0; index < conArr.length; index++) {
        if(index >= $('#addc-totalFollow').val()) {
            break;
        }else{
            totalConnections.push(conArr[index]);
        }
    }

    addcProfileActionList(totalConnections, addcConnectIdList, addcDelayConnectTime);
}

const addcProfileActionList = async (addcConArr, addcConnectIdList,addcDelayFollowTime) => {
    console.log('Preparing to send profile actions for:', addcConArr.length, 'connections.');
    for (var i = 0; i < addcConArr.length; i++) {
        if(i == (addcConArr.length -1)){
            addcConnectIdList += addcConArr[i].connectId
        }else{
            addcConnectIdList += addcConArr[i].connectId +','
        }
    }

    await fetch(`${voyagerApi}/identity/profileActionsV2?ids=List(${addcConnectIdList})`, {
            headers: {
                'cookie': document.cookie,
                'csrf-token': jsession,
                'content-type': contentTypeJsonOnly,
                'x-li-lang': xLiLang,
                'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people10psI218TqWAsaq9vD+ltw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': xRestliProtocolVersion
            }
        }
    )
    .then( response => response.json() )
    .then( response => {
        console.log('Profile actions response:', response);
        addcAddConnections(addcConArr, addcDelayFollowTime)
    })
}

const addcGetAudienceData = async (audience, addcDelayFollowTime) => {
    console.log('Fetching audience data for audience:', audience, 'with delay:', addcDelayFollowTime);
    var conArr = [];
    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audience}&totalCount=${$('#addc-totalFollow').val()}`,
        success: function(data){
            console.log('Audience data response:', data);
            let dataPath = [];
            if (Array.isArray(data)) {
                if (data.length > 0 && Array.isArray(data[0].audience)) {
                    dataPath = data[0].audience;
                }
            } else if (Array.isArray(data.audience)) {
                dataPath = data.audience;
            }
            if (dataPath.length > 0) {
                for(let i=0; i<dataPath.length; i++){
                    var netDistance = dataPath[i].con_distance !== null ? dataPath[i].con_distance.split("_") : ''
                    var targetIdd;
                    if(dataPath[i].con_member_urn && dataPath[i].con_member_urn.includes('urn:li:member:')){
                        targetIdd = dataPath[i].con_member_urn.replace('urn:li:member:','') 
                    }
                    conArr.push({
                        name: dataPath[i].con_first_name+' '+dataPath[i].con_last_name,
                        title: dataPath[i].con_job_title,
                        conId: dataPath[i].con_id,
                        totalResultCount: dataPath.length,
                        publicIdentifier: dataPath[i].con_public_identifier, 
                        profileId: dataPath[i].con_public_identifier, 
                        memberUrn: dataPath[i].con_member_urn,
                        networkDistance: netDistance && netDistance[1] ? parseInt(netDistance[1]) : null,
                        trackingId: dataPath[i].con_tracking_id, 
                        navigationUrl: `https://www.linkedin.com/in/${dataPath[i].con_public_identifier}`, 
                        targetId: targetIdd ? parseInt(targetIdd) : null
                    })
                }
                if(conArr.length > 0){
                    console.log('Audience contacts found:', conArr.length);
                    addcAddConnections(conArr, addcDelayFollowTime)
                }else{
                    console.log('No contact in audience!');
                    $('.follow').show()
                    $('#displayFollowStatus').empty()
                    $('#displayFollowStatus').html('No contact in audience!')
                    $('.addConnect').attr('disabled', false)
                }
            }else{
                console.log('No data found in audience!');
                $('.follow').show()
                $('#displayFollowStatus').empty()
                $('#displayFollowStatus').html('No data found!')
                $('.addConnect').attr('disabled', false)
            }
        },
        error: function(error){
            console.log('AJAX error fetching audience data:', error)
            $('.addConnect').attr('disabled', false)
        }
    })
}

var timeOutAddCon;
const addcAddConnections = async (addcConArrMain, addcDelayFollowTime) => {
    console.log('Starting connection addition for:', addcConArrMain.length, 'connections.');
    let addcDisplayLi = '', displayAutomationRecord = ''
	let x = 0;
    let addcConArr = [];

    $('.add-connect').show()

    // seive for user's total invitation
    if(addcConArrMain.length > $('#addc-totalFollow').val()){
        for(let i=0; i<addcConArrMain.length; i++){
            if(i >= $('#addc-totalFollow').val()){
                break;
            }else{
                addcConArr.push(addcConArrMain[i])
            }
        }
    }else{
        for(let x=0; x<addcConArrMain.length; x++){
            addcConArr.push(addcConArrMain[x])
        }
    }

    // automation table data setup
    displayAutomationRecord = `
        <tr id="add-connect-record">
            <td>Add Connection</td>
            <td id="addc-status">Running</td>
            <td>${addcConArr.length}</td>
            <td id="addc-numbered">0/${addcConArr.length}</td>
            <td id="addc-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="addc-remained-time">${remainedTime(addcDelayFollowTime,addcConArr.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    // Get personal message if provided
    let personalMessage = $('#addc-personalMessage').val();
    if (personalMessage && personalMessage.trim() !== '') {
        console.log('📝 Personal message will be included with invites');
    }

            // Show initial instruction for automated connection process
        $('#addc-displayConnectStatus').html(`
            <li style="color: blue; font-weight: bold;">🤖 Automated Connection Process Started</li>
            <li style="color: blue;">📝 Profiles will open in background tabs for automated connection</li>
            <li style="color: blue;">⏱️ Each tab will be processed automatically and closed</li>
            <li style="color: blue;">🔄 No manual intervention required - fully automated</li>
            <li style="color: blue;">💡 You can continue working while connections are being sent</li>
        `);
        
        // Process each connection using manual profile opening
        for(const [i,v] of addcConArr.entries()) {
        const profile = addcConArr[i];
        console.log(`🔍 Processing connection ${i+1}/${addcConArr.length}: ${profile.name}`);

        try {
            // Use the new browser automation function instead of broken API
            const result = await sendConnectionInviteBrowser(profile, personalMessage);
            
                               if (result.success && result.manual) {
                       // Fallback manual connection - profile opened for user to connect
                       addcDisplayLi = `
                           <li style="color: orange;">⚠️ Fallback: Profile opened for: <b>${profile.name}</b></li>
                           <li style="color: orange;">📝 Automation failed - please connect manually</li>
                           <li>Title: <b>${profile.title || 'N/A'}</b></li>
                           <li>Total profiles processed: <b>${i+1}</b></li>
                       `;
                       $('#addc-displayConnectStatus').html(addcDisplayLi);
                       console.log(`⚠️ Fallback manual connection needed for: ${profile.name}`);
                   } else if (result.success) {
                       x++;
                       addcDisplayLi = `
                           <li style="color: green;">✅ Connection invite sent to: <b>${profile.name}</b></li>
                           <li>Title: <b>${profile.title || 'N/A'}</b></li>
                           <li>Total invites sent: <b>${x}</b></li>
                       `;
                       $('#addc-displayConnectStatus').html(addcDisplayLi);
                       console.log(`✅ Successfully sent invite to: ${profile.name}`);
                   } else if (result.skipped) {
                       addcDisplayLi = `
                           <li style="color: orange;">⏭️ Skipped: <b>${profile.name}</b> - ${result.reason}</li>
                           <li>Total invites sent: <b>${x}</b></li>
                       `;
                       $('#addc-displayConnectStatus').html(addcDisplayLi);
                       console.log(`⏭️ Skipped ${profile.name}: ${result.reason}`);
                   } else {
                       addcDisplayLi = `
                           <li style="color: red;">❌ Failed to send invite to: <b>${profile.name}</b></li>
                           <li style="color: red;">Error: ${result.error}</li>
                           <li>Total invites sent: <b>${x}</b></li>
                       `;
                       $('#addc-displayConnectStatus').html(addcDisplayLi);
                       console.log(`❌ Failed to send invite to: ${profile.name}: ${result.error}`);
                   }

            // Update progress
            $('#addc-numbered').text(`${i+1}/${addcConArr.length}`);
            $('#addc-remained-time').text(`${remainedTime(addcDelayFollowTime, addcConArr.length - (i+1))}`);

            // Wait before next invite (except for the last one)
            if (i < addcConArr.length - 1) {
                console.log(`⏳ Waiting ${addcDelayFollowTime} seconds before next invite...`);
                await new Promise(resolve => setTimeout(resolve, addcDelayFollowTime * 1000));
            }

        } catch (error) {
            console.error(`❌ Error processing ${profile.name}:`, error);
            addcDisplayLi = `
                <li style="color: red;">❌ Error with: <b>${profile.name}</b></li>
                <li style="color: red;">Error: ${error.message}</li>
                <li>Total invites sent: <b>${x}</b></li>
            `;
            $('#addc-displayConnectStatus').html(addcDisplayLi);
        }
    }

    $('.addConnect').attr('disabled', false)
    sendStats(x, 'Invitation sent')

    if($('#addc-viewProfile').prop('checked') == true)
        sendStats(x, 'Profile viwed');
    
    // update automation status
    $('#addc-status').text('Completed')
    setTimeout(function(){
        $('#add-connect-record').remove()
    }, 5000)
}

const addcViewProfile = async (conArr) => {
    await $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('csrf-token', jsession);
            request.setRequestHeader('content-type', 'application/json');
        },
        url: `https://www.linkedin.com/li/track`,
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
                    referer: "https://www.linkedin.com",
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
        success: function(data){},
        error: function(error){
            // console.log(error)
            $('.addConnect').attr('disabled', false)
        }
    })
}

// stop automation 
$('body').on('click','#addc-bot-action',function(){
    clearTimeout(timeOutAddCon);
    // clearTimeout(timeOutGetCon);
    $('#addc-status').text('Stopped')
    $('.addConnect').attr('disabled', false)
    setTimeout(function(){
        $('#add-connect-record').remove()
    }, 5000)
})

/**
 * Send connection invite using browser automation (same as campaign system)
 * @param {Object} profile - Profile object with connection data
 * @param {string} customMessage - Custom message to include with invite
 * @returns {Promise<Object>} - Result object with success status
 */
const sendConnectionInviteBrowser = async (profile, customMessage = null) => {
    console.log('🚀🚀🚀 sendConnectionInviteBrowser function STARTED!');
    console.log('🔍 Function called with:', { 
        profileName: profile.name, 
        profileId: profile.conId || profile.connectionId,
        hasCustomMessage: !!customMessage 
    });
    
    try {
        // Create profile URL from connection ID - handle both search and audience data
        let profileId = profile.conId || profile.connectionId || profile.profileId || profile.publicIdentifier;
        
        if (!profileId) {
            console.error('❌ No profile ID found in profile data:', profile);
            return { 
                success: false, 
                error: 'User profile not accessible' 
            };
        }
        
        // Validate profile ID is not "undefined" or empty
        if (profileId === 'undefined' || profileId === '' || profileId === null) {
            console.error('❌ Invalid profile ID:', profileId);
            return { 
                success: false, 
                error: 'User profile not accessible' 
            };
        }
        
        const profileUrl = `https://www.linkedin.com/in/${profileId}`;
        console.log(`🌐 Profile URL: ${profileUrl}`);
        console.log(`🔍 Profile ID source:`, {
            conId: profile.conId,
            connectionId: profile.connectionId,
            profileId: profile.profileId,
            publicIdentifier: profile.publicIdentifier,
            usedId: profileId
        });
        
                // Step 1: Open LinkedIn profile in background tab using chrome.tabs.create
        console.log('🔄 Step 1: Opening LinkedIn profile page in background tab...');
        
                // Always try to send message to background script first
        console.log('🔄 Attempting to send message to background script for automation...');
        
        try {
            const result = await chrome.runtime.sendMessage({
                action: 'sendConnectionInvite',
                data: {
                    profileName: profile.name,
                    profileId: profileId,
                    profileUrl: profileUrl,
                    customMessage: customMessage
                }
            });
            
            console.log('📊 Background script automation result:', result);
            return result;
            
        } catch (messageError) {
            console.error('❌ Error sending message to background script:', messageError);
            console.log('🔄 Background script automation failed, using fallback method...');
        }
        
        // Fallback: use window.open if background script is not available
        console.log('🔄 Fallback: Using window.open for background tab...');
            const newWindow = window.open(profileUrl, '_blank');
            console.log(`✅ Fallback window opened for profile: ${profile.name}`);
            
            if (!newWindow) {
                throw new Error('Failed to open profile - popup may be blocked');
            }
            
            // Wait a bit for the window to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Close the window after a reasonable time
            setTimeout(() => {
                try {
                    newWindow.close();
                    console.log('✅ Fallback window closed');
                } catch (error) {
                    console.log('⚠️ Could not close fallback window:', error.message);
                }
            }, 15000); // Keep window open for 15 seconds
            
            console.log(`✅ FALLBACK WINDOW OPENED for ${profile.name} - please connect manually`);
            return { 
                success: true, 
                message: 'Fallback window opened - please connect manually',
                manual: true 
            };
    } catch (error) {
        console.error('❌ Error in sendConnectionInviteBrowser:', error.message);
        return { success: false, error: error.message };
    }
};