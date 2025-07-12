let arActionCall = []
let messageConversations = []
let normalChecked = []
let arConnectionModel = {
    message: '',
    distance: null,
    connectionId: '',
    name: '',
    firstName: '',
    lastName: '',
    conversationUrnId: null,
    totalEndorseSkills: 0
}
const defaultNormalSendTime = 15000

/**
 * Get user conversations.
 * 
 * @returns a list of conversations.
 */
const getMessageConversations = async () => {
    messageConversations = []

    await $.ajax({
        method: 'get',
        beforeSend: function(req) {
            req.setRequestHeader('csrf-token', jsession);
            req.setRequestHeader('accept', accept);
            req.setRequestHeader('content-type', contentType);
            req.setRequestHeader('x-li-lang', xLiLang);
            req.setRequestHeader('x-li-page-instance', xLiPageInstance);
            req.setRequestHeader('x-li-track', JSON.stringify(xLiTrack));
            req.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/messaging/conversations?keyVersion=LEGACY_INBOX`,
        success: function(res) {
            let response = {'data': res}

            for(let item of response['data'].elements) {
                if(item.events[0].subtype == 'MEMBER_TO_MEMBER') {
                    messageConversations.push(item)
                }
            }

            if(!messageConversations.length) {
                $('#autoresponse-notice-elem').show()
                $('#autoresponse-notice').html('No conversation found!')
                $('.start-ar-automation').attr('disabled', false)
                return;
            }else {
                if(arActionCall.includes('FOLLOWUP')) 
                    arFollowup();

                if(arActionCall.includes('ENDORSEMENT')) 
                    startEndorsement();

                if(arActionCall.includes('NORMAL'))
                    sendNormalMessage();
            }            
        },
        error: function(err, textStatus, responseText) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else $('#autoresponse-notice').append(responseText);

            $('.start-ar-automation').attr('disabled', false)
        }
    })
}

/**
 * Select required field data
 */
const setRequiredFields = () => {
    let conversations = []
    let profile = {}

    for(let item of messageConversations) {
        profile = item.participants[0]['com.linkedin.voyager.messaging.MessagingMember'].miniProfile

        conversations.push({
            distance: 1,
            connectionId: profile.entityUrn.replace('urn:li:fs_miniProfile:',''),
            name: profile.firstName+' '+profile.lastName,
            firstName: profile.firstName,
            lastName: profile.lastName,
            occupation: profile.occupation,
            conversationUrnId: item.entityUrn.replace('urn:li:fs_conversation:','')
        })
    }
    return conversations;
}

/**
 * Check message contains keywords.
 * Used for normal and endorsement response.
 * @param {string} Keywords
 */
const checkConversationForKeywords = (keywords) => {
    let conversations = []
    let events = {}
    let publicIdentifier = '', lastMessage = ''

    // check if last message is not from auth user
    // check if conversation includes keyword
    for(let conversation of messageConversations) {
        events = conversation.events[0];
        publicIdentifier = events.from['com.linkedin.voyager.messaging.MessagingMember'].miniProfile.publicIdentifier
        lastMessage = events.eventContent["com.linkedin.voyager.messaging.event.MessageEvent"].attributedBody.text

        if(publicIdentifier !== linkedinId) {
            for(let keyword of keywords.split(',')) {
                if(lastMessage.toLowerCase().includes(keyword.toLowerCase()) == true) {
                    conversations.push(conversation)
                }
            }
        }
    }

    if(!conversations.length) {
        let message = `No messages sent.
            <br/>Reason: Keywords not found in conversations.
        `;
        $('#autoresponse-notice').html(message)
        $('.start-ar-automation').attr('disabled', false)
        return;
    }

    // remove duplicates
    const uniqueConversations = conversations.filter((obj, index) => {
        return index === conversations.findIndex(o => obj.connectionId === o.connectionId);
    });
    messageConversations = uniqueConversations

    return setRequiredFields()
}

/**
 * Send message for normal
 */
const sendNormalMessage = async () => {
    let i = 0, y = 0
    let displaySent = ''
    let conversations = []

    // Run for each normal message
    for(let item of normalChecked) {
        conversations = checkConversationForKeywords(item.message_keywords);

        // Run for each connections
        for(const [x, itemx] of conversations.entries()) {
            arConnectionModel.message = item.message_body
            arConnectionModel.distance = conversations[x].distance
            arConnectionModel.connectionId = conversations[x].connectionId
            arConnectionModel.name = conversations[x].name
            arConnectionModel.firstName = conversations[x].firstName
            arConnectionModel.lastName = conversations[x].lastName
            arConnectionModel.conversationUrnId = conversations[x].conversationUrnId

            try {
                sendMessage();
            } catch (error) {
                $('#autoresponse-notice').html(error)
                $('.autoresponse-notice-elem').show()
                $('.start-ar-automation').attr('disabled', false)
            }
            
            displaySent = `
                <li>Message sent to: <b>${arConnectionModel.name}</b></li>
                <li>Total message sent: <b>${y +1}</b></li>
            `;
            $('#autoresponse-notice').html(displaySent);

            y++;
            await sleep(defaultNormalSendTime)
        }
        await sleep(defaultNormalSendTime * conversations.length + 20000)
    }
    $('.start-ar-automation').attr('disabled', false)
}

/**
 * Start endorsement process
 */
const startEndorsement = async () => {
    let displaySent = ''
    let conversations = checkConversationForKeywords(autoRespondMessages.endorsement.message_keywords)

    if(conversations && conversations.length) {
        for(const [i, item] of conversations.entries()) {
            arConnectionModel.message = autoRespondMessages.endorsement.message_body
            arConnectionModel.distance = conversations[i].distance
            arConnectionModel.connectionId = conversations[i].connectionId
            arConnectionModel.name = conversations[i].name
            arConnectionModel.firstName = conversations[i].firstName
            arConnectionModel.lastName = conversations[i].lastName
            arConnectionModel.conversationUrnId = conversations[i].conversationUrnId
            arConnectionModel.totalEndorseSkills = autoRespondMessages.endorsement.total_endorse_skills

            getFeaturedSkills();

            try {
                sendMessage();
            } catch (error) {
                $('#autoresponse-notice').html(error)
                $('.autoresponse-notice-elem').show()
                $('.start-ar-automation').attr('disabled', false)
            }

            displaySent = `
                <li>Message sent to: <b>${arConnectionModel.name}</b></li>
                <li>Total message sent: <b>${i +1}</b></li>
            `;
            $('#autoresponse-notice').html(displaySent)

            await sleep(20000)
        }
        $('.start-ar-automation').attr('disabled', false);
    }
}

/**
 * Get connection skills to endorse
 */
const getFeaturedSkills = async () => {
    await $.ajax({
        method: 'get',
        beforeSend: function(req) {
            req.setRequestHeader('csrf-token', jsession);
            req.setRequestHeader('accept', 'application/vnd.linkedin.normalized+json+2.1');
            req.setRequestHeader('content-type', contentType);
            req.setRequestHeader('x-li-lang', xLiLang);
            req.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_profile_view_base;OSmjmgZVQ1enfa5KB7KLQg==');
            req.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
            req.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
        },
        url: `${voyagerApi}/identity/profiles/${arConnectionModel.connectionId}/featuredSkills?includeHiddenEndorsers=false&count=${arConnectionModel.totalEndorseSkills}&_=${dInt}`,
        success: function(res) {
            let response = {'data': res};
            let currentEndorseCount = 0

            if(response['data'].data['*elements'].length) {
                let endorseIncludeData = response['data'].included;

                $.each(endorseIncludeData, function(index,item) {
                    if(item.hasOwnProperty('name')) {
                        endorseConnection(item.name, item.entityUrn, currentEndorseCount+1);
                        currentEndorseCount++;
                    }
                })
            }else {
                $('#autoresponse-notice').append(`No skills found to endorse for ${arConnectionModel.name}.`)
            }
        },
        error: function(err, textStatus, responseText) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else $('#autoresponse-notice').append(responseText);
        }
    })
}

/**
 * Endorse connection skill.
 */
const endorseConnection = async (skillName, entityUrn, totalEndorsed) => {
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
        url: `${voyagerApi}/identity/profiles/${arConnectionModel.connectionId}/normEndorsements`,
        data: JSON.stringify({
            skill: {
                entityUrn: entityUrn,
                name: skillName,
            }
        }),
        success: function(data) {
            $('#autoresponse-notice').empty()
            let displayEndorse = `
                <li>Skills: <b>${skillName}</b></li>
                <li>Total endorsed: <b>${totalEndorsed}</b></li>
            `;
            $('#autoresponse-notice').append(displayEndorse)
        },
        error: function(err, textStatus, responseText) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else $('#autoresponse-notice').append(responseText);
        }
    })
}

/**
 * Start auto response followup messages
 */
const arFollowup = async () => {
    let displaySent = ''
    let conversations = setRequiredFields();

    for(const [i, item] of conversations.entries()) {
        arConnectionModel.message = autoRespondMessages.followup.message_body
        arConnectionModel.distance = conversations[i].distance
        arConnectionModel.connectionId = conversations[i].connectionId
        arConnectionModel.name = conversations[i].name
        arConnectionModel.firstName = conversations[i].firstName
        arConnectionModel.lastName = conversations[i].lastName
        arConnectionModel.conversationUrnId = conversations[i].conversationUrnId

        try {
            sendMessage();
        } catch (error) {
            $('#autoresponse-notice').html(error)
            $('.autoresponse-notice-elem').show()
            $('.start-ar-automation').attr('disabled', false)
        }

        displaySent = `
            <li>Message sent to: <b>${arConnectionModel.name}</b></li>
            <li>Total message sent: <b>${i +1}</b></li>
        `;
        $('#autoresponse-notice').html(displaySent)

        await sleep(defaultNormalSendTime)
    }
    $('.start-ar-automation').attr('disabled', true);
}

/**
 * Mark message conversation as seen. 
 * 
 * @returns true
 */
const markMessageConversationAsSeen = () => {

}
