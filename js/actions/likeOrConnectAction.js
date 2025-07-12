
$('body').on('click', '.likeAddConnect', function(){
    $('#loac-displayLikeAddConnectStatus').empty();
    var loacTotalInvitation = $('#loac-totalInvite'),
        loacCommentPerPost = $('#loac-commentPerPost'),
        loacTotalPost = $('#loac-totalPost'),
        loacTotalComment = $('#loac-totalComments'),
        loacStartPosition = $('#loac-startPosition'),   
        loacDelay = $('#loac-delay'),
        loacSortBy = $('#loac-sort-by').val();
    var loacFiledsArr = [loacDelay, loacStartPosition, loacTotalComment, loacTotalPost, loacCommentPerPost, loacTotalInvitation];
    
    // validation
    if(loacTotalInvitation.val() == '' || loacCommentPerPost.val() == '' || loacTotalPost.val() == '' || 
        loacTotalComment.val() == '' || loacStartPosition.val() == '' || loacDelay.val() == ''
    ){
        for(var i =0; i<loacFiledsArr.length; i++){
            if(loacFiledsArr[i].val() == ''){
                $('#loac-error-notice').html(`${loacFiledsArr[i].data('name')} cannot be empty!`)
            }
        }
    }
    else if(loacDelay.val() < 30){
        $('#loac-error-notice').html('Minimum of delay time is 30')
    }else{
        $('#loac-error-notice').html('')

        // $('#loac-likePost').prop('checked', true);
        $('.likeAddConnect').attr('disabled', true)

        loacGetPost(loacSortBy, loacTotalPost.val(), loacCommentPerPost.val(), loacStartPosition.val(), loacDelay.val()) 
        
    }
})

const loacGetPost = async (loacSortBy, loacTotalPost, loacCommentPerPost, loacStartPosition, loacDelay) => {
    var loacPostArr = [];
    var loacPostMainArr = [];
    loacTotalPost = loacTotalPost < 10 ? 10 : loacTotalPost;

    await fetch(`${voyagerApi}/feed/updates?count=${loacTotalPost}&moduleKey=home-feed%3Adesktop&numComments=${loacCommentPerPost}&numLikes=0&q=${loacSortBy}&start=${loacStartPosition}`, {
        headers: {
            'cookie': document.cookie,
            'csrf-token': jsession,
            'accept': accept,
            'content-type': contentType,
            'x-li-lang': xLiLang,
            'x-li-page-instance': 'urn:li:page:d_flagship3_feed;ZsKs0H2CQoumO3E6tColQA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': xRestliProtocolVersion
        }
    })
    .then( response => response.json() )
    .then( response => {
        if(response.elements.length > 0){
            $.each(response.elements, function(i, item){
                if(item.hasOwnProperty('tracking')){
                    loacPostArr.push({
                        urn: item.value['com.linkedin.voyager.feed.render.UpdateV2'].socialDetail.urn,
                        totalPage: response.paging.total,
                        urnId: item.value['com.linkedin.voyager.feed.render.UpdateV2'].socialDetail.threadId
                    })
                }
            })

            // like post and comment use case 
            if(($('#loac-likePost').prop('checked') == true || $('#loac-likeComments').prop('checked') == true) && $('#loac-postBasedKeyword').prop('checked') == false){
                if(loacPostArr.length > $('#loac-totalPost').val()){
                    for(let i=0; i<loacPostArr.length; i++){
                        if(i >= $('#loac-totalPost').val()){
                            break;
                        }else{
                            loacPostMainArr.push(loacPostArr[i])
                            
                        }
                    }
                    loacLikePost(loacPostMainArr, loacDelay)
                }else{
                    loacLikePost(loacPostArr, loacDelay)
                }
            }

            // connect to user who commented 
            if($('#loac-connectUserComment').prop('checked') == true){

                loacGetCommentProfiles(loacPostArr[0].urnId, $('#loac-totalInvite').val(), loacStartPosition, loacDelay)
            }

            // connect to user who liked 
            if($('#loac-connectUserLikePost').prop('checked') == true){

                loacGetLikedProfiles(loacPostArr[0].urnId, $('#loac-totalInvite').val(), loacStartPosition, loacDelay)
            }

            // search post based on keywords 
            if($('#loac-postBasedKeyword').prop('checked') == true && $('#loac-postsKeyword').val() != ''){
                var postKeywords = $('#loac-postsKeyword').val().toLowerCase().split(',');
                var postToLike = [];
                var postToLikeMain = [];

                // check that post includes user keywords
                $.each(response.elements, function(i, item){
                    var postPath = item.value['com.linkedin.voyager.feed.render.UpdateV2'];

                    if(postPath.hasOwnProperty('commentary')){
                        postPath = item.value['com.linkedin.voyager.feed.render.UpdateV2'].commentary.text.text.toLowerCase();

                        for(let i=0; i<postKeywords.length; i++){
                            if(postPath.includes(postKeywords[i])){
                                postToLike.push({
                                    urn: item.value['com.linkedin.voyager.feed.render.UpdateV2'].socialDetail.urn,
                                    totalPage: response.paging.total,
                                    urnId: item.value['com.linkedin.voyager.feed.render.UpdateV2'].socialDetail.threadId
                                })
                            }
                        }
                    }else if(postPath.hasOwnProperty('resharedUpdate')){
                        postPath = item.value['com.linkedin.voyager.feed.render.UpdateV2'].resharedUpdate.commentary.text.text.toLowerCase();

                        for(let i=0; i<postKeywords.length; i++){
                            if(postPath.includes(postKeywords[i])){
                                postToLike.push({
                                    urn: item.value['com.linkedin.voyager.feed.render.UpdateV2'].socialDetail.urn,
                                    totalPage: response.paging.total,
                                    urnId: item.value['com.linkedin.voyager.feed.render.UpdateV2'].socialDetail.threadId
                                })
                            }
                        }
                    }
                    
                })

                // check that postToLike has value 
                if(postToLike.length > 0){
                    if(postToLike.length > $('#loac-totalPost').val()){
                        for(let i=0; i<postToLike.length; i++){
                            if(i >= $('#loac-totalPost').val()){
                                break;
                            }else{
                                postToLikeMain.push(postToLike[i])
                            }
                        }
                        loacLikePost(postToLikeMain, loacDelay)
                    }else{
                        loacLikePost(postToLike, loacDelay)
                    }
                }else{
                    $('.like-add-connect').show()
                    $('#loac-displayLikeAddConnectStatus').text('No search criteria was found!')
                    $('.likeAddConnect').attr('disabled', false)
                }
            }
        }else{
            $('.like-add-connect').show()
            $('#loac-displayLikeAddConnectStatus').text('No search criteria was found!')
            $('.likeAddConnect').attr('disabled', false)
        }
        
    })
}

var timeOutLike;
const loacLikePost = async (loacPostArr, loacDelay) => {
    var i = 0, x = 0,
        loacDisplayLi = '', displayAutomationRecord = '';

    $('.like-add-connect').show() 
    // automation table data setup
    displayAutomationRecord = `
        <tr id="like-post-record">
            <td>Like Post</td>
            <td id="lip-status">Running</td>
            <td>${loacPostArr.length}</td>
            <td id="lip-numbered">0/${loacPostArr.length}</td>
            <td id="lip-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td id="lip-remained-time">${remainedTime(loacDelay,loacPostArr.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var loacLooper = () => {
        timeOutLike = setTimeout(async function(){
            await $.ajax({
                method: 'post',
                beforeSend: function(request) {
                    request.setRequestHeader('csrf-token', jsession);
                    request.setRequestHeader('accept', acceptVnd);
                    request.setRequestHeader('content-type', contentType);
                    request.setRequestHeader('x-li-lang', xLiLang);
                    request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;6UclcxmySTiFlfill36CoA==');
                    request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
                    request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
                },
                url: `${voyagerApi}/feed/reactions`,
                data: JSON.stringify({
                    'threadUrn': loacPostArr[i].urn,
                    'reactionType': 'LIKE'
                }),
                success: function(data){
                    // if(data.ok == true){
                    $('#loac-displayLikeAddConnectStatus').empty()
                    loacDisplayLi = `
                        <li>Total post liked: <b>${x +1}</b></li>
                        <li>Total result: <b>${loacPostArr[i].totalPage}</b></li>
                    `;
                    $('#loac-displayLikeAddConnectStatus').append(loacDisplayLi)

                    // update automation count done and time remained
                    $('#lip-numbered').text(`${x +1}/${loacPostArr.length}`)
                    $('#lip-remained-time').text(`${remainedTime(loacDelay, loacPostArr.length - (x +1))}`)

                    x++;
                    // }
                },
                error: function(error){
                    console.log(error)
                    if(error.hasOwnProperty('responseJSON')){
                        $('#loac-displayLikeAddConnectStatus').empty()
                        loacDisplayLi = `
                            <li>${error.responseJSON.data.message}</li>
                            <li>post link: <b>${LINKEDIN_URL}/feed/update/${loacPostArr[i].urn}</b></li>
                        `;
                        $('#loac-displayLikeAddConnectStatus').append(loacDisplayLi)
                    }
                    $('.likeAddConnect').attr('disabled', false)
                }
            })

            i++;
            if(i < loacPostArr.length)
                loacLooper()
            if(i >= loacPostArr.length){
                $('.likeAddConnect').attr('disabled', false)
                let module = 'Post liked';
                sendStats(x, module)

                if($('#loac-likeComments').prop('checked') == true){
                    let module = 'Comments liked';
                    sendStats(x, module)
                }
                // update automation status
                $('#lip-status').text('Completed')
                setTimeout(function(){
                    $('#like-post-record').remove()
                }, 5000)
            }
        }, loacDelay*1000)
    }
    loacLooper()
}

// stop automation 
$('body').on('click','#lip-bot-action',function(){
    clearTimeout(timeOutLike);
    $('#lip-status').text('Stopped')
    $('.likeAddConnect').attr('disabled', false)
    setTimeout(function(){
        $('#like-post-record').remove()
    }, 5000)
})

const loacGetCommentProfiles = async (commentPostId, loacTotalInvite, loacStartPosition, loacDelay) => {
    var loacCommentArr = [];
    var loacCommentArrMain = [];
    loacTotalInvite = loacTotalInvite < 40 ? 40 : loacTotalInvite;

    await fetch(`${voyagerApi}/feed/comments?` + (
        new URLSearchParams({
            count: loacTotalInvite,
            q: 'comments',
            sortOrder:'CHRON',
            start: loacStartPosition,
            updateId: commentPostId
        }).toString()
    ), {
        headers: {
            'cookie': document.cookie,
            'csrf-token': jsession,
            'accept': accept,
            'content-type': contentType,
            'x-li-lang': xLiLang,
            'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;mRuzzvmrTka+5eMKTXOsNA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': xRestliProtocolVersion
        }
    })
    .then( response => response.json() )
    .then( response => {
        if(response.hasOwnProperty('elements')){
            if( response.elements.length > 0){
                $.each(response.elements, function(index, item){
                    var urnPath = item.commenter['com.linkedin.voyager.feed.MemberActor'].miniProfile;
                    loacCommentArr.push({
                        name: urnPath.firstName+' '+urnPath.lastName,
                        title: urnPath.occupation,
                        connectId: item.commenterProfileId,
                        trackingId: urnPath.trackingId,
                        profileId: urnPath.publicIdentifier,
                        firstName: urnPath.firstName,
                        lastName: urnPath.lastName
                    })
                })

                // treat connect based on keyword/exclude cases
                if($('#loac-connectUserBasedKeyword').prop('checked') == true && $('#loac-keywordForConnect').val() != ''){
                    // keywords for connecting use case
                    let keywords = $('#loac-keywordForConnect').val().toLowerCase().split(',');

                    $.each(loacCommentArr, function(i, item){
                        for(let x=0; x<keywords.length; x++){
                            if(item.name.toLowerCase().includes(keywords[x]) || item.title.toLowerCase().includes(keywords[x])){
                                loacCommentArrMain.push(item)
                            }
                        }
                    })
                    if(loacCommentArrMain.length > 0){

                        let filterCommentInfo = loacCommentArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                        loacProfileActionList(filterCommentInfo, loacDelay)
                    }else{
                        ('.like-add-connect').show()
                        $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
                        $('.likeAddConnect').attr('disabled', false)
                    }
                }else if($('#loac-excludeUserBasedKeyword').prop('checked') == true && $('#loac-excludeKeyword').val() != ''){
                    // excluded keywords for connecting use case
                    let exkeywords = $('#loac-excludeKeyword').val().toLowerCase().split(',');

                    $.each(loacCommentArr, function(i, item){
                        for(let x=0; x<exkeywords.length; x++){
                            if(!item.name.toLowerCase().includes(keywords[x]) || !item.title.toLowerCase().includes(exkeywords[x])){
                                loacCommentArrMain.push(item)
                            }
                        }
                    })
                    if(loacCommentArrMain.length > 0){
                        // remove duplicates
                        let filterCommentInfo = loacCommentArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                        loacProfileActionList(filterCommentInfo, loacDelay)
                    }else{
                        ('.like-add-connect').show()
                        $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
                        $('.likeAddConnect').attr('disabled', false)
                    }
                }else{
                    loacProfileActionList(loacCommentArr, loacDelay)
                }
                
            }else{
                $('.like-add-connect').show()
                $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
                $('.likeAddConnect').attr('disabled', false)
            }
        }else{
            $('.like-add-connect').show()
            $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
            $('.likeAddConnect').attr('disabled', false)
        }
    })
}

const loacGetLikedProfiles = async (likePostId, loacTotalInvite, loacStartPosition, loacDelay) => {
    var loacLikedArr = [];
    var loacLikedArrMain = [];

    loacTotalInvite = loacTotalInvite < 40 ? 40 : loacTotalInvite;

    await fetch(`${voyagerApi}/feed/likes?` + (
        new URLSearchParams({
            count: loacTotalInvite,
            objectId: likePostId,
            q: 'likes',
            start: loacStartPosition
        }).toString()
    ), {
        headers: {
            'cookie': document.cookie,
            'csrf-token': jsession,
            'accept': accept,
            'content-type': contentType,
            'x-li-lang': xLiLang,
            'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people;mRuzzvmrTka+5eMKTXOsNA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': xRestliProtocolVersion
        }
    })
    .then( response => response.json() )
    .then( response => {
        if(response.hasOwnProperty('elements')){
            if(response.elements.length > 0){
                $.each(response.elements, function(index, item){
                    var urnPath = item.actor['com.linkedin.voyager.feed.MemberActor'].miniProfile;

                    if(urnPath.entityUrn.includes('urn:li:fs_miniProfile:')){
                        var connectId = urnPath.entityUrn.replace('urn:li:fs_miniProfile:','')
                    
                        loacLikedArr.push({
                            name: urnPath.firstName+' '+urnPath.lastName,
                            title: urnPath.occupation,
                            connectId: connectId,
                            trackingId: urnPath.trackingId,
                            profileId: urnPath.publicIdentifier,
                            firstName: urnPath.firstName,
                            lastName: urnPath.lastName
                        })
                    }
                })

                // check if keywords for connecting exists and checked
                if($('#loac-connectUserBasedKeyword').prop('checked') == true && $('#loac-keywordForConnect').val() != ''){
                    // keywords for connecting use case
                    let keywords = $('#loac-keywordForConnect').val().toLowerCase().split(',');

                    $.each(loacLikedArr, function(i, item){
                        for(let x=0; x<keywords.length; x++){
                            if(item.name.toLowerCase().includes(keywords[x]) || item.title.toLowerCase().includes(keywords[x])){
                                loacLikedArrMain.push(item)
                            }
                        }
                    })
                    if(loacLikedArrMain.length > 0){
                        let filterLikedInfo = loacCommentArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                        loacProfileActionList(filterLikedInfo, loacDelay)
                    }else{
                        ('.like-add-connect').show()
                        $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
                        $('.likeAddConnect').attr('disabled', false)
                    }
                }else if($('#loac-excludeUserBasedKeyword').prop('checked') == true && $('#loac-excludeKeyword').val() != ''){
                    // excluded keywords for connecting use case
                    let exkeywords = $('#loac-excludeKeyword').val().toLowerCase().split(',');

                    $.each(loacLikedArr, function(i, item){
                        for(let x=0; x<exkeywords.length; x++){
                            if(!item.name.toLowerCase().includes(keywords[x]) || !item.title.toLowerCase().includes(exkeywords[x])){
                                loacLikedArrMain.push(item)
                            }
                        }
                    })
                    if(loacLikedArrMain.length > 0){
                        // remove duplicates
                        let filterLikedInfo = loacCommentArrMain.filter((v,i,a)=>a.findIndex(v2=>(v2.connectId===v.connectId))===i);

                        loacProfileActionList(filterLikedInfo, loacDelay)
                    }else{
                        ('.like-add-connect').show()
                        $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
                        $('.likeAddConnect').attr('disabled', false)
                    }
                }else{
                    loacProfileActionList(loacLikedArr, loacDelay)
                }
            }else{
                $('.like-add-connect').show()
                $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
                $('.likeAddConnect').attr('disabled', false)
            }
        }else{
            $('.like-add-connect').show()
            $('#loac-displayLikeAddConnectStatus').text('No connection found for search criteria!')
            $('.likeAddConnect').attr('disabled', false)
        }
    })
}

const loacProfileActionList = async (loacCommentArr, loacDelay) => {
    var loacConnectIdList = '';

    for (var i = 0; i < loacCommentArr.length; i++) {
        if(i == (loacCommentArr.length -1)){
            loacConnectIdList += loacCommentArr[i].connectId
        }else{
            loacConnectIdList += loacCommentArr[i].connectId +','
        }
    }

    await fetch(`${voyagerApi}/identity/profileActionsV2?ids=List(${loacConnectIdList})`, {
        headers: {
            'cookie': document.cookie,
            'csrf-token': jsession,
            'content-type': contentTypeJsonOnly,
            'x-li-lang': xLiLang,
            'x-li-page-instance': 'urn:li:page:d_flagship3_search_srp_people9T3uZ/JbSD2KDpWu+fKj9g==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': xRestliProtocolVersion,
        }
    })
    .then( response => response.json() )
    .then( response => {
        loacAddConnections(response, loacCommentArr, loacDelay)
    })
}

const loacAddConnections = async (response, loacConnectArr, loacDelay) => {
    var loacDisplayLi = '', i = 0, x = 0, loacCommentArr = [], displayAutomationRecord = '';
    var totalInvites = $('#loac-totalInvite').val();

    // seive for user's total invitation
    if(loacConnectArr.length > totalInvites){
        for(let s=0; s<totalInvites; s++){
            loacCommentArr.push(loacConnectArr[s])
        }
    }else{
        loacCommentArr = loacConnectArr.slice();
    }

    $('.like-add-connect').show()

    // automation table data setup
    displayAutomationRecord = `
        <tr class="likeor-connect-record">
            <td>Like Or Connect</td>
            <td class="loac-status">Running</td>
            <td>${loacCommentArr.length}</td>
            <td class="loac-numbered">0/${loacCommentArr.length}</td>
            <td class="loac-bot-action" title="Stop automation"><i class="far fa-dot-circle fa-lg text-danger cursorr"></i></td>
            <td class="loac-remained-time">${remainedTime(loacDelay,loacCommentArr.length)}</td>
        </tr>
    `;
    $('#no-job').hide()
    $('#automation-list').append(displayAutomationRecord)

    var loacLooper = () => {
        timeOutLikeOrConnect = setTimeout(async function(){
            var data = {};
            var message = $('#loac-personalMessage').val();
            var newMessage = '';

            if(message !=''){

                newMessage = changeMessageVariableNames(message, loacCommentArr[i])

                data = {
                    trackingId: loacCommentArr[i].trackingId,
                    invitee: {
                        'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                            profileId: loacCommentArr[i].profileId,
                        },
                    },
                    message: newMessage,
                    emberEntityName: 'growth/invitation/norm-invitation',                
                };
            }else{
                data = {
                    trackingId: loacCommentArr[i].trackingId,
                    invitee: {
                        'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                            profileId: loacCommentArr[i].profileId,
                        },
                    },
                    emberEntityName: 'growth/invitation/norm-invitation',                
                };
            }

            await fetch(`${voyagerApi}/growth/normInvitations`, {
                method: 'post',
                headers: {
                    'cookie': document.cookie,
                    'csrf-token': jsession,
                    'accept': accept,
                    'content-type': contentType,
                    'x-li-lang': xLiLang,
                    'x-li-page-instance': 'urn:li:page:p_flagship3_search_srp_people;vLxWcLoORQSqbmsyBCzo/w==',
                    'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                    'x-restli-protocol-version': xRestliProtocolVersion,
                },
                body: JSON.stringify(data),
            })
            .then( response => response )
            .then( response => {
                $('#loac-displayLikeAddConnectStatus').empty()
                loacDisplayLi = `
                    <li>Invitation sent to: <b>${loacCommentArr[i].name}</b></li>
                    <li>Title: <b>${loacCommentArr[i].title}</b></li>
                    <li>Total sent: <b>${x +1}</b></li>
                `;
                $('#loac-displayLikeAddConnectStatus').append(loacDisplayLi)
                console.log( new Date())

                // update automation count done and time remained
                $('.loac-numbered').text(`${x +1}/${loacCommentArr.length}`)
                $('.loac-remained-time').text(`${remainedTime(loacDelay, loacCommentArr.length - (x +1))}`)
                x++;
            })
            i++;
            if(i < loacCommentArr.length)
                loacLooper()
            if(i >= loacCommentArr.length){
                $('.likeAddConnect').attr('disabled', false)

                let module = 'Invitation sent';
                sendStats(x, module)

                // update automation status
                $('.loac-status').text('Completed')
                setTimeout(function(){
                    $('.likeor-connect-record').remove()
                }, 5000)
            }
        }, loacDelay*1000)
    }
    loacLooper()
}

// stop automation
$('body').on('click','.loac-bot-action',function(){
    clearTimeout(timeOutLikeOrConnect);
    $('.loac-status').text('Stopped')
    $('.likeAddConnect').attr('disabled', false)
    setTimeout(function(){
        $('.likeor-connect-record').remove()
    }, 5000)
})