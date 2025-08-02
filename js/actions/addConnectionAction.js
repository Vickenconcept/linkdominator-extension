
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
    }
    else if(addcDelayFollowTime < 30){
        console.log('Validation failed: Delay is less than 30');
        $('#addc-error-notice').html('Minimum of delay time is 30')
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

        }else if($('#addc-audience-select').val() !=''){
            let audience = parseInt($('#addc-audience-select').val());
            console.log('Audience selected:', audience);
            addcGetAudienceData(audience, addcDelayFollowTime);
        }else {
            if($('#addc-search-term').val())
                query = `(keywords:${encodeURIComponent($('#addc-search-term').val())},flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`
            else
                query = `(flagshipSearchIntent:SEARCH_SRP,queryParameters:(${queryParams}resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
            console.log('No audience selected, using search query:', query);
            addcGetConnections(addcConnectIdList,query,addcTotalFollow,addcStart,addcDelayFollowTime)
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
                    console.log('Connections response:', data);
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

    for(const [i,v] of addcConArr.entries()) {
        // Back to original LinkedIn API endpoint with improved error handling
        var data = {};
        var message = $('#addc-personalMessage').val();
        var newMessage = '';

        if(message != ''){
            newMessage = changeMessageVariableNames(message, addcConArr[i]);
            // Remove line breaks that might cause 422 errors
            newMessage = newMessage.replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
            data = {
                trackingId: addcConArr[i].trackingId,
                invitee: {
                    'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                        profileId: addcConArr[i].profileId,
                    },
                },
                message: newMessage,
                emberEntityName: 'growth/invitation/norm-invitation',                
            };
        } else {
            data = {
                trackingId: addcConArr[i].trackingId,
                invitee: {
                    'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                        profileId: addcConArr[i].profileId,
                    },
                },
                emberEntityName: 'growth/invitation/norm-invitation',                
            };
        }

        const jsession = getJSessionId();
        console.log('🔍 Old LinkedIn API Request for:', addcConArr[i].name);
        console.log('📦 Payload:', JSON.stringify(data, null, 2));
        console.log('🔑 CSRF Token:', jsession ? 'Present' : 'Missing');
        
        try {
            await fetch(`${voyagerApi}/growth/normInvitations`, {
                method: 'POST',
                headers: {
                    'csrf-token': jsession,
                    'accept': 'application/vnd.linkedin.normalized+json+2.1',
                    'content-type': 'application/json; charset=UTF-8',
                    'x-restli-protocol-version': '2.0.0',
                    'x-li-lang': 'en_US',
                    'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;QazGJ/pNTwuq6OTtMClfPw==',
                    'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"})
                },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            .then(async response => {
                console.log(`📧 LinkedIn API Response Status: ${response.status} (${response.statusText})`);
                
                if (response.status === 200 || response.status === 201) {
                    console.log('✅ STATUS', response.status, ': Invitation sent successfully to', addcConArr[i].name);
                    $('#addc-displayConnectStatus').empty();
                    addcDisplayLi = `
                        <li>✅ Invitation sent to: <b>${addcConArr[i].name}</b></li>
                        <li>Title: <b>${addcConArr[i].title}</b></li>
                        <li>Total sent: <b>${i + 1}</b></li>
                    `;
                    $('#addc-displayConnectStatus').html(addcDisplayLi);
                } else if (response.status === 301) {
                    console.log('⚠️ STATUS 301: API endpoint moved - LinkedIn may have changed the endpoint');
                    $('#addc-displayConnectStatus').empty();
                    $('#addc-displayConnectStatus').html(`<li style='color:orange;'>⚠️ API endpoint moved for: <b>${addcConArr[i].name}</b> (301)</li>`);
                } else if (response.status === 403) {
                    console.log('❌ STATUS 403: Forbidden - LinkedIn blocked the request');
                    $('#addc-displayConnectStatus').empty();
                    $('#addc-displayConnectStatus').html(`<li style='color:red;'>❌ Forbidden: <b>${addcConArr[i].name}</b> (LinkedIn blocked request)</li>`);
                } else if (response.status === 422) {
                    console.log('❌ STATUS 422: Unprocessable Entity - Invalid data in request');
                    $('#addc-displayConnectStatus').empty();
                    $('#addc-displayConnectStatus').html(`<li style='color:red;'>❌ Invalid data for: <b>${addcConArr[i].name}</b> (Status: 422)</li>`);
                } else if (response.status === 429) {
                    console.log('❌ STATUS 429: Rate Limited - Too many requests');
                    $('#addc-displayConnectStatus').empty();
                    $('#addc-displayConnectStatus').html(`<li style='color:red;'>❌ Rate limited: <b>${addcConArr[i].name}</b> (Too many requests)</li>`);
                } else {
                    console.log(`⚠️ STATUS ${response.status}: Unexpected response`);
                    let errorText = await response.text();
                    let location = response.headers.get('Location');
                    console.log('Response details:', { errorText, location });
                    $('#addc-displayConnectStatus').empty();
                    $('#addc-displayConnectStatus').html(`<li style='color:red;'>❌ Failed to send invitation to: <b>${addcConArr[i].name}</b> (Status: ${response.status})</li>`);
                }
                
                // Try to parse response
                return response.json().catch(() => {
                    console.log('📄 No JSON response body (redirect or empty response)');
                    return { status: response.status, redirected: response.redirected };
                });
            })
            .then(data => {
                console.log('📧 LinkedIn API Response Data:', data);
            })
         } catch (error) {
             console.log('❌ Error sending invitation to:', addcConArr[i].name, error);
             $('#addc-displayConnectStatus').empty();
             $('#addc-displayConnectStatus').html(`<li style='color:red;'>❌ Network error for: <b>${addcConArr[i].name}</b></li>`);
         }

         // Update automation count and time remaining
         $('#addc-numbered').text(`${i + 1}/${addcConArr.length}`);
         $('#addc-remained-time').text(`${remainedTime(addcDelayFollowTime, addcConArr.length - (i + 1))}`);

         // Add delay between requests (except for the last one)
         if (i < addcConArr.length - 1) {
             console.log(`⏱️ Waiting ${addcDelayFollowTime} seconds before next invitation...`);
             await sleep(addcDelayFollowTime * 1000);
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