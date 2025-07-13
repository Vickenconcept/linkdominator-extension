importScripts('./js/universalAction.js');
importScripts('./js/actions/autorespondAction.js');
importScripts('./js/actions/campaignAction.js');
importScripts('./env.js');

var lkmApi = PLATFROM_URL+'/api';
var inURL = LINKEDIN_URL;
var voyagerApi = VOYAGER_API;
var csrfToken, linkedinId, plainId, firstName, lastName;

var d=new Date();
var dInt=new Date(d).getTime();
const delay = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

// Listen to trigger and perform action
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(request.scheduleInfo) {
            chrome.storage.local.remove("scheduleInfo")
            chrome.storage.local.set({ scheduleInfo: request.scheduleInfo }).then(() => {
                let waitTime = request.scheduleInfo.waitdays
                let delayInMinutes = waitTime <= 0 ? 0.10 : waitTime * 24 * 60;

                chrome.alarms.create(
                    'message_followup',
                    {
                        delayInMinutes: delayInMinutes 
                    }
                );
                sendResponse({scheduleInfo: 'schedule added'});
            });
            return true;
        }else if(request.campaign){
            console.log('Campaign received:', request.campaign);
            console.log('Current LinkedIn ID:', linkedinId);
            
            // Check if LinkedIn ID is available
            if (!linkedinId) {
                console.log('LinkedIn ID not available, waiting for authentication...');
                sendResponse({message: 'Waiting for LinkedIn authentication...'});
                
                // Try to get user profile first
                getUserProfile();
                
                // Wait for LinkedIn authentication to complete
                const checkLinkedInId = () => {
                    if (linkedinId) {
                        console.log('LinkedIn ID now available:', linkedinId);
                        setCampaignAlarm(request.campaign);
                    } else {
                        console.log('Still waiting for LinkedIn ID...');
                        setTimeout(checkLinkedInId, 2000); // Check every 2 seconds
                    }
                };
                checkLinkedInId();
            } else {
                sendResponse({message: 'setting up alarm...'});
                setCampaignAlarm(request.campaign);
            }
            return true;
        }else if(request.stopCampaign){
            let alarmName = request.stopCampaign.sequenceType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            chrome.alarms.clear(alarmName)
            sendResponse({message: alarmName+ ' alarm stopped'});
        }
    }
)

// Run alarm periodically
chrome.alarms.create(
    'sequence_leads_network_update',
    {
        periodInMinutes: 120 
    }
);

// Run alarm action when it's time
chrome.alarms.onAlarm.addListener((alarm) => {
    if(alarm.name == 'sequence_leads_network_update'){
        _updateCampaignLeadsNetwork()
    }else if(alarm.name == 'message_followup'){
        chrome.storage.local.get(["scheduleInfo"]).then((result) => {
            console.log('Schedule task is running...')

            let scheduleInfo = result.scheduleInfo

            try {
                getAudience(scheduleInfo.filters.audienceId, scheduleInfo.total, lkmApi, (result) => {
                    if(audienceList.length) sendFollowupMessage(scheduleInfo);
                });
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'accepted_leads'){
        chrome.storage.local.get(["campaignAccepted","nodeModelAccepted"]).then(async (result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignAccepted,
            nodeModel = result.nodeModelAccepted;

            try {
                await getLeadGenRunning(currentCampaign.id);
                if(campaignLeadgenRunning.length){
                    // sort accepted leads before runSequence
                    let leadsData = []
                    for(let lead of campaignLeadgenRunning){
                        if(lead.acceptedStatus === true){
                            leadsData.push(lead)
                        }
                    }
                    if(leadsData.length)
                    runSequence(currentCampaign, leadsData, nodeModel);
                }
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'not_accepted_leads'){
        chrome.storage.local.get(["campaignNotAccepted","nodeModelNotAccepted"]).then(async (result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignNotAccepted,
            nodeModel = result.nodeModelNotAccepted;

            try {
                await getLeadGenRunning(currentCampaign.id);
                if(campaignLeadgenRunning.length){
                    // sort not accepted leads before runSequence
                    let leadsData = []
                    for(let lead of campaignLeadgenRunning){
                        if(lead.acceptedStatus === false){
                            leadsData.push(lead)
                        }
                    }
                    if(leadsData.length)
                    runSequence(currentCampaign, leadsData, nodeModel);
                }
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_like_post'){
        chrome.storage.local.get(["campaignCustomLikePost","nodeModelCustomLikePost"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomLikePost,
            nodeModel = result.nodeModelCustomLikePost;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_profile_view'){
        chrome.storage.local.get(["campaignCustomProfileView","nodeModelCustomProfileView"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomProfileView,
            nodeModel = result.nodeModelCustomProfileView;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_follow'){
        chrome.storage.local.get(["campaignCustomFollow","nodeModelCustomFollow"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomFollow,
            nodeModel = result.nodeModelCustomFollow;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_message'){
        chrome.storage.local.get(["campaignCustomMessage","nodeModelCustomMessage"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomMessage,
            nodeModel = result.nodeModelCustomMessage;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else if(alarm.name == 'custom_endorse'){
        chrome.storage.local.get(["campaignCustomEndorse","nodeModelCustomEndorse"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaignCustomEndorse,
            nodeModel = result.nodeModelCustomEndorse;
            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }else{
        chrome.storage.local.get(["campaign","nodeModel"]).then((result) => {
            console.log(`Campaign ${alarm.name} sequence is running...`)
            let currentCampaign = result.campaign,
            nodeModel = result.nodeModel;

            try {
                getCampaignLeads(currentCampaign.id, (leadsData) => {
                    if(leadsData.length) runSequence(currentCampaign, leadsData, nodeModel);
                })
            } catch (err) {
                console.log(err)
            }
        });
    }
})

/**
 * Set new campaign schedule
 * @param {object} campaign 
 */
const setCampaignAlarm = async (campaign) => {
    var campaignModel, 
        delayInMinutes, 
        alarmName, 
        nodeModelArr, 
        nodeItem, 
        acceptedNodeItem,
        notAcceptedNodeItem,
        delayInMinuteAccepted,
        delayInMinuteNotAccepted,
        currentNodeKey, 
        statusLastId;

    console.log('Setting up campaign alarm for:', campaign.name, 'Type:', campaign.sequenceType);
    
    await getCampaignSequence(campaign.id)
    alarmName = campaign.sequenceType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    nodeModelArr = campaignSequence.nodeModel
    
    console.log('Campaign sequence loaded:', nodeModelArr ? 'Yes' : 'No');
    console.log('Alarm name:', alarmName);
    console.log('Node model array length:', nodeModelArr ? nodeModelArr.length : 0);

    if(campaign.sequenceType == 'Endorse'){
        if(nodeModelArr[0].runStatus == false){
            nodeItem = nodeModelArr[0]
            delayInMinutes = 0.10;
        }else if(nodeModelArr[2].runStatus == false){
            nodeItem = nodeModelArr[2]
            delayInMinutes = nodeModelArr[1].time == 'days' 
                ? nodeModelArr[1].value * 24 * 60
                : nodeModelArr[1].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[1])
        }else if(nodeModelArr[4].runStatus == false){
            nodeItem = nodeModelArr[4]
            delayInMinutes = nodeModelArr[3].time == 'days' 
                ? nodeModelArr[3].value * 24 * 60
                : nodeModelArr[3].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[3])
        }else if(nodeModelArr[5].runStatus == false){
            updateSequenceNodeModel(campaign, nodeModelArr[5])
            updateSequenceNodeModel(campaign, nodeModelArr[6])
            updateCampaign({
                campaignId: campaign.id,
                status: 'completed'
            })
        }
    }else if(campaign.sequenceType == 'Profile views'){
        if(nodeModelArr[0].runStatus == false){
            nodeItem = nodeModelArr[0]
            delayInMinutes = 0.10;
        }else if(nodeModelArr[2].runStatus == false){
            nodeItem = nodeModelArr[2]
            delayInMinutes = nodeModelArr[1].time == 'days' 
                ? nodeModelArr[1].value * 24 * 60
                : nodeModelArr[1].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[1])
        }else if(nodeModelArr[4].runStatus == false){
            nodeItem = nodeModelArr[4]
            delayInMinutes = nodeModelArr[3].time == 'days' 
                ? nodeModelArr[3].value * 24 * 60
                : nodeModelArr[3].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[3])
        }else if(nodeModelArr[6].runStatus == false){
            nodeItem = nodeModelArr[6]
            delayInMinutes = nodeModelArr[5].time == 'days' 
                ? nodeModelArr[5].value * 24 * 60
                : nodeModelArr[5].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[5])
        }else if(nodeModelArr[8].runStatus == false){
            nodeItem = nodeModelArr[8]
            delayInMinutes = nodeModelArr[7].time == 'days' 
                ? nodeModelArr[7].value * 24 * 60
                : nodeModelArr[7].value * 60;
            updateSequenceNodeModel(campaign, nodeModelArr[7])
        }else if(nodeModelArr[9].runStatus == false){
            updateSequenceNodeModel(campaign, nodeModelArr[9])
            updateSequenceNodeModel(campaign, nodeModelArr[10])
            updateCampaign({
                campaignId: campaign.id,
                status: 'completed'
            })
        }
    }else if(['Lead generation','Custom'].includes(campaign.sequenceType)){
        if(nodeModelArr[0].value == 'send-invites'){
            if(nodeModelArr[0].runStatus === false){
                nodeItem = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else{
                await getLeadGenRunning(campaign.id);
                if(campaignLeadgenRunning.length){
                    acceptedLeads = [];
                    notAcceptedLeads = [];

                    // Split leads into accepted and not accepted sent-invites
                    for(const [idx, lead] of campaignLeadgenRunning.entries()){
                        if(lead.acceptedStatus === false){
                            let networkInfo = await _getProfileNetworkInfo(lead);
                            lead['networkDegree'] = networkInfo.data.distance.value
                            await updateLeadNetworkDegree(lead)
                            lead.acceptedStatus = lead['networkDegree'] == 'DISTANCE_1' ? true:false
                        }
                        if(lead.acceptedStatus === true){
                            acceptedLeads.push(lead)
                        }else{
                            notAcceptedLeads.push(lead)
                        }
                        await delay(10000)
                    }
                    // Set variables for accepted leads
                    if(acceptedLeads.length){
                        // Set node and delay properties
                        statusLastId = acceptedLeads[0].statusLastId + 1;
                        for(let nodeModel of nodeModelArr){
                            if(nodeModel.hasOwnProperty('acceptedTime') && nodeModel.acceptedTime == statusLastId){
                                delayInMinuteAccepted = nodeModel.value == 'days' 
                                    ? nodeModel.value * 24 * 60
                                    : nodeModel.value * 60;
                            }
                            if(nodeModel.hasOwnProperty('acceptedAction') && nodeModel.acceptedAction == statusLastId){
                                acceptedNodeItem = nodeModel
                                currentNodeKey = nodeModel.key
                            }
                        }
                        
                        // Set alarm
                        if(acceptedNodeItem && Object.keys(acceptedNodeItem).length){
                            // Update leadgen status, current node keys
                            for(let lead of acceptedLeads){
                                await updateLeadGenRunning(campaign.id, lead.id, {
                                    acceptedStatus: lead.acceptedStatus,
                                    currentNodeKey: currentNodeKey,
                                    nextNodeKey: 0,
                                    statusLastId: statusLastId
                                })
                            }

                            alarmName = 'accepted_leads'
                            campaignModel = {
                                campaignAccepted: campaign,
                                nodeModelAccepted: acceptedNodeItem
                            }
                            chrome.storage.local.set(campaignModel).then(() => {
                                chrome.alarms.create(
                                    alarmName, {delayInMinutes: 2} // delayInMinuteAccepted}
                                );
                                console.log(alarmName +" alarm is set");
                            });
                        }
                    }
                    // Set variables for not accepted leads
                    if(notAcceptedLeads.length){
                        // Set node and delay properties
                        statusLastId = notAcceptedLeads[0].statusLastId + 1;
                        for(let nodeModel of nodeModelArr){
                            if(nodeModel.hasOwnProperty('notAcceptedTime') && nodeModel.notAcceptedTime == statusLastId){
                                delayInMinuteNotAccepted = nodeModel.value == 'days' 
                                    ? nodeModel.value * 24 * 60
                                    : nodeModel.value * 60;
                            }
                            if(nodeModel.hasOwnProperty('notAcceptedAction') && nodeModel.notAcceptedAction == statusLastId){
                                notAcceptedNodeItem = nodeModel
                                currentNodeKey = nodeModel.key
                            }
                        }
                        // Set alarm
                        if(notAcceptedNodeItem && Object.keys(notAcceptedNodeItem).length){
                            // Update leadgen status, current node keys
                            for(let lead of notAcceptedLeads){
                                await updateLeadGenRunning(campaign.id, lead.id, {
                                    acceptedStatus: lead.acceptedStatus,
                                    currentNodeKey: currentNodeKey,
                                    nextNodeKey: 0,
                                    statusLastId: statusLastId
                                })
                            }

                            alarmName = 'not_accepted_leads'
                            campaignModel = {
                                campaignNotAccepted: campaign,
                                nodeModelNotAccepted: notAcceptedNodeItem
                            }
                            chrome.storage.local.set(campaignModel).then(() => {
                                chrome.alarms.create(
                                    alarmName, {delayInMinutes: 2} // delayInMinuteNotAccepted}
                                );
                                console.log(alarmName +" alarm is set");
                            });
                        }
                    }
                }
            }
        }else if(nodeModelArr[0].value == 'like-post'){
            let nodeItemCustomLikePost;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomLikePost = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomLikePost = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];

                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomLikePost && Object.keys(nodeItemCustomLikePost).length){
                alarmName = 'custom_like_post'
                campaignModel = {
                    campaignCustomLikePost: campaign,
                    nodeModelCustomLikePost: nodeItemCustomLikePost
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'profile-view'){
            let nodeItemCustomProfileView;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomProfileView = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomProfileView = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            
            // Set alarm
            if(nodeItemCustomProfileView && Object.keys(nodeItemCustomProfileView).length){
                alarmName = 'custom_profile_view'
                campaignModel = {
                    campaignCustomProfileView: campaign,
                    nodeModelCustomProfileView: nodeItemCustomProfileView
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'follow'){
            let nodeItemCustomFollow;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomFollow = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomFollow = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomFollow && Object.keys(nodeItemCustomFollow).length){
                alarmName = 'custom_follow'
                campaignModel = {
                    campaignCustomFollow: campaign,
                    nodeModelCustomFollow: nodeItemCustomFollow
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'message'){
            let nodeItemCustomMessage;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomMessage = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomMessage = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomMessage && Object.keys(nodeItemCustomMessage).length){
                alarmName = 'custom_message'
                campaignModel = {
                    campaignCustomMessage: campaign,
                    nodeModelCustomMessage: nodeItemCustomMessage
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }else if(nodeModelArr[0].value == 'endorse'){
            let nodeItemCustomEndorse;
            if(nodeModelArr[0].runStatus === false){
                nodeItemCustomEndorse = nodeModelArr[0]
                delayInMinutes = 0.10;
            }else {
                for(const [idx, node] of nodeModelArr.entries()){
                    if(node.runStatus === false && node.type === 'action' && node.value != 'end'){
                        nodeItemCustomEndorse = node
                        delayInMinutes = nodeModelArr[idx -1].time == 'days' 
                            ? nodeModelArr[idx -1].value * 24 * 60
                            : nodeModelArr[idx -1].value * 60;
                        updateSequenceNodeModel(campaign, nodeModelArr[idx -1])
                        break;
                    }
                }
                // Update campaign status
                let endNode = nodeModelArr[nodeModelArr.length -1],
                    lastDelay = nodeModelArr[nodeModelArr.length -2],
                    lastAction = nodeModelArr[nodeModelArr.length -3];
                if(endNode && Object.keys(endNode) 
                    && endNode.type == 'end'
                    && lastDelay && Object.keys(lastDelay) 
                    && lastDelay.type == 'delay'
                    && lastAction.runStatus === true){
                    updateSequenceNodeModel(campaign, lastDelay)
                    updateSequenceNodeModel(campaign, endNode)
                    updateCampaign({
                        campaignId: campaign.id,
                        status: 'completed'
                    })
                }
            }
            // Set alarm
            if(nodeItemCustomEndorse && Object.keys(nodeItemCustomEndorse).length){
                alarmName = 'custom_endorse'
                campaignModel = {
                    campaignCustomEndorse: campaign,
                    nodeModelCustomEndorse: nodeItemCustomEndorse
                }
                chrome.storage.local.set(campaignModel).then(() => {
                    chrome.alarms.create(
                        alarmName, {delayInMinutes: 2} // delayInMinutes}
                    );
                    console.log(alarmName +" alarm is set");
                });
            }
        }
    }

    // Initialize alarm
    if(nodeItem && Object.keys(nodeItem).length){
        campaignModel = {
            campaign: campaign,
            nodeModel: nodeItem
        }
        chrome.storage.local.set(campaignModel).then(() => {
            chrome.alarms.create(
                alarmName, {
                    delayInMinutes: 2// delayInMinutes
                }
            );
            console.log(alarmName +" alarm is set");
        });
    }
}

const runSequence = async (currentCampaign, leads, nodeModel) => {
    for(const [i, lead] of leads.entries()){
        if(nodeModel.value == 'endorse'){
            _getFeaturedSkill(lead, nodeModel);
        }else if(nodeModel.value == 'profile-view'){
            _viewProfile(lead)
        }else if(nodeModel.value == 'follow'){
            _followConnection(lead)
        }else if(nodeModel.value == 'like-post'){
            _getProfilePosts(lead)
        }else if(['message','call'].includes(nodeModel.value)){
            arConnectionModel.message = nodeModel.message
            arConnectionModel.distance = lead.networkDistance
            arConnectionModel.connectionId = lead.connectionId
            arConnectionModel.name = lead.name
            arConnectionModel.firstName = lead.firstName
            arConnectionModel.lastName = lead.lastName
            arConnectionModel.conversationUrnId = ''
            lead['uploads'] = []
            messageConnection(lead)

            if(nodeModel.value == 'call'){
                // record call status
                storeCallStatus({
                    recipient: `${lead.firstName} ${lead.lastName}`,
                    profile: `${firstName} ${lastName}`,
                    sequence: currentCampaign.name,
                    callStatus: 'suggested'
                })
            }
        }else if(nodeModel.value == 'send-invites'){
            if(lead.networkDistance != 1 && !nodeModel.runStatus){
                await _sendConnectionInvite(lead, nodeModel)
            }
        }
        await delay(30000)
    }
    if(nodeModel.value == 'send-invites'){
        createLeadGenRunning(currentCampaign.id);
    }
    await updateSequenceNodeModel(currentCampaign, nodeModel);
    setCampaignAlarm(currentCampaign);
}

const sendFollowupMessage = async (scheduleInfo) => {
    for(const [i, item] of audienceList.entries()) {
        arConnectionModel.message = scheduleInfo.filters.message
        arConnectionModel.distance = audienceList[i].networkDistance
        arConnectionModel.connectionId = audienceList[i].conId
        arConnectionModel.name = audienceList[i].name
        arConnectionModel.firstName = audienceList[i].firstName
        arConnectionModel.lastName = audienceList[i].lastName
        arConnectionModel.conversationUrnId = ''

        try {
            messageConnection(scheduleInfo);
        } catch (error) {
            console.log(error)
        }
        await delay(30000)
    }    
    console.log('Schedule task is completed...')
}

/**
 * Fetch profile info for the current auth connection
 */
const getUserProfile = () => {
    // Get browser cookie
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        fetch(`${LINKEDIN_URL}/voyager/api/me`, {
            method: 'get',
            headers: {
                'csrf-token': result.csrfToken,
                'Accept': '*/*',
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Li-Lang': 'en_US',
                'X-Li-Page-Instance': 'urn:li:page:d_flagship3_feed;YGW6mrQMQ3aVUJHdZAqr5Q==',
                'X-Li-Track': JSON.stringify({"clientVersion":"1.7.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'X-Restli-Protocol-Version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(async (res) => {
            linkedinId = res.miniProfile.publicIdentifier
            plainId = res.plainId
            firstName = res.miniProfile.firstName
            lastName = res.miniProfile.lastName
            console.log('LinkedIn ID set to:', linkedinId);
            console.log('User profile loaded:', firstName, lastName);
            // console.log(await _getProfileNetworkInfo({connectionId: 'ACoAACroOZgBnyT-0ijaCpXNkyFP2CnhGyjSnsM'}))
            _updateCampaignLeadsNetwork()
        })
    })  
}

/**
 * Send message to a given LinkedIn profile
 * @param {object} scheduleInfo 
 */
const messageConnection = scheduleInfo => {
    arConnectionModel.message = changeMessageVariableNames(arConnectionModel.message, arConnectionModel)

    let url = ''
    let conversationObj = {}
    let messageEvent = {
        value: {
            'com.linkedin.voyager.messaging.create.MessageCreate' : {
                attachments: scheduleInfo.uploads.length ? scheduleInfo.uploads : [],
                body: arConnectionModel.message,
                attributedBody: {"text": arConnectionModel.message, "attributes": []},
                mediaAttachments: [],
            }
        }
    }

    if(arConnectionModel.conversationUrnId){
        url = `${voyagerApi}/messaging/conversations/${arConnectionModel.conversationUrnId}/events?action=create`
        conversationObj = {
            eventCreate: messageEvent
        }
    }else {
        url = `${voyagerApi}/messaging/conversations?action=create`
        conversationObj = {
            conversationCreate: {
                eventCreate: messageEvent,
                recipients: [arConnectionModel.connectionId],
                subtype: arConnectionModel.distance == 1 ? "MEMBER_TO_MEMBER" : "INMAIL"
            }
        }
    }

    // Get browser cookie
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        fetch(url, {
            method: 'post',
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_invitations;1ZlPK7kKRNSMi+vkXMyVMw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0',
            },
            body: JSON.stringify(conversationObj)
        })
        .then(res => res.json())
        .then(res => {})
        .catch((err) => {
            console.log(err)
        })
    })
}

/**
 * Fetch skills of a given LinkedIn profile to endorse.
 * @param {object} lead 
 * @param {object} node 
 */
const _getFeaturedSkill =  (lead, node) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        fetch(`${LINKEDIN_URL}/voyager/api/identity/profiles/${lead.connectionId}/featuredSkills?includeHiddenEndorsers=false&count=${node.totalSkills}&_=${dInt}`, {
            method: 'get',
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;OSmjmgZVQ1enfa5KB7KLQg==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('Featured skill...')
            if(res.data['*elements'].length){
                res.included.forEach(item => {
                    if(item.hasOwnProperty('name')){
                        _endorseConnection({
                            connectionId: lead.connectionId,
                            entityUrn: item.entityUrn,
                            skillName: item.name
                        }, result)
                    }
                });
            }
        })
        .catch(err => console.log(err))
    })
}

/**
 * Endorse connection of a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} result 
 */
const _endorseConnection = (data, result) => {
    fetch(`${VOYAGER_API}/identity/profiles/${data.connectionId}/normEndorsements`, {
        method: 'post',
        headers: {
            'csrf-token': result.csrfToken,
            'accept': 'text/plain, */*; q=0.01',
            'content-type': 'application/json; charset=UTF-8',
            'x-li-lang': 'en_US',
            'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;3T8zGiC6TaW88WAryS7olA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': '2.0.0'
        },
        body: JSON.stringify({
            skill: {
                entityUrn: data.entityUrn,
                name: data.skillName,
            }
        })
    })
    .then(res => res.json())
    .then(res => {
        console.log('Skill endorsed...')
    })
    .catch(err => console.log(err))
}

/**
 * View profile of a given LinkedIn profile.
 * @param {object} lead 
 */
const _viewProfile = (lead) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        let targetId = lead.memberUrn.replace('urn:li:member:','')

        fetch(`${LINKEDIN_URL}/li/track`, {
            method: 'post',
            headers: {
                'csrf-token': result.csrfToken,
                'content-type': 'application/json'
            },
            body: JSON.stringify([{
                eventBody: {
                    entityView: {
                        targetId: targetId,
                        viewType: "profile-view",
                        viewerId: plainId
                    },
                    header: {
                        clientApplicationInstance: {
                            applicationUrn: "urn:li:application:(voyager-web,voyager-web)",
                            trackingId: lead.trackingId,
                            version: "1.10.1648"
                        },
                        pageInstance: {
                            pageUrn: "urn:li:page:d_flagship3_profile_view_base",
                            trackingId: lead.trackingId
                        },
                        time: dInt
                    },
                    networkDistance: lead.networkDistance,
                    profileTrackingId: lead.trackingId,
                    requestHeader: {
                        interfaceLocale: "en_US",
                        pageKey: "d_flagship3_profile_view_base",
                        path: `${LINKEDIN_URL}/in/${lead.connectionId}`,
                        referer: LINKEDIN_URL,
                        trackingCode: "d_flagship3_feed"
                    },
                    vieweeMemberUrn: lead.memberUrn,
                    viewerPrivacySetting: "F",
                },
                eventInfo: {
                    appId: "com.linkedin.flagship3.d_web",
                    eventName: "ProfileViewEvent",
                    topicName: "ProfileViewEvent"
                }
            }])
        })
        .then(res => res.json())
        .then(res => {
            console.log('Profile view...')
        })
        .catch(err => console.log(err))
    })
}

/**
 * Follow connection of a given LinkedIn profile.
 * @param {object} lead 
 */
const _followConnection = (lead) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileActions?versionTag=3533619214&action=follow`, {
            method: 'post',
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:p_flagship3_search_srp_people;QyXMiN7pT8uwOeco13WjEg==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1848","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            },
            body: JSON.stringify({
                actions: [],
                overflowActions: []
            })
        })
        .then(res => res.json())
        .then(res => {
            console.log('Connection followed...')
        })
        .catch(err => console.log(err))
    })
}

/**
 * Fetch post for a given LinkedIn profile.
 * @param {object} lead 
 */
const _getProfilePosts = (lead) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    chrome.storage.local.get(["csrfToken"]).then((result) => {
        let params = `count=1&start=0&q=memberShareFeed&moduleKey=member-shares%3Aphone&profileUrn=urn%3Ali%3Afsd_profile%3A${lead.connectionId}`
        let url = `${VOYAGER_API}/identity/profileUpdatesV2?${params}`

        fetch(url, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'text/plain, */*; q=0.01',
                'content-type': 'application/json; charset=UTF-8',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_feed;ZsKs0H2CQoumO3E6tColQA==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('get connection post...')
            if(res.elements.length){
                for(let item of res.elements){
                    _likePost(item, result)
                }
            }
        })
        .catch(err => console.log(err))
    })
}

/**
 * Like post for a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} result 
 */
const _likePost = (post, result) => {
    fetch(`${VOYAGER_API}/feed/reactions`, {
        method: 'post',
        headers: {
            'csrf-token': result.csrfToken,
            'accept': 'application/vnd.linkedin.normalized+json+2.1',
            'content-type': 'application/json; charset=UTF-8',
            'x-li-lang': 'en_US',
            'x-li-page-instance': 'urn:li:page:d_flagship3_feed;6UclcxmySTiFlfill36CoA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1971","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': '2.0.0'
        },
        body: JSON.stringify({
            threadUrn: post.socialDetail.urn,
            reactionType: 'LIKE'
        })
    })
    .then(res => res.json())
    .then(res => {
        console.log('post liked...')
    })
    .catch(err => console.log(err))
}

/**
 * Send connection request to a given LinkedIn profile.
 * @param {object} lead 
 * @param {object} node 
 */
const _sendConnectionInvite = async (lead, node) => {
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        let newMessage, data;
        if(node.hasInviteNote){
            newMessage = changeMessageVariableNames(node.message, lead)
            data = {
                trackingId: lead.trackingId,
                invitee: {
                    'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                        profileId: lead.connectionId,
                    },
                },
                message: newMessage,
                emberEntityName: 'growth/invitation/norm-invitation',                
            };
        }else {
            data = {
                trackingId: lead.trackingId,
                invitee: {
                    'com.linkedin.voyager.growth.invitation.InviteeProfile': {
                        profileId: lead.profileId,
                    },
                },
                emberEntityName: 'growth/invitation/norm-invitation',                
            };
        }

        // Get all cookies for LinkedIn
        chrome.cookies.getAll({domain: '.linkedin.com'}, function(cookies) {
            let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
            fetch(`${VOYAGER_API}/growth/normInvitations`, {
                method: 'post',
                headers: {
                    'cookie': cookieString,
                    'csrf-token': result.csrfToken
                },
                body: JSON.stringify(data),
            })
            .then(res => res.json())
            .then(res => {
                console.log('Invitation sent...')
            })
            .catch(err => console.log(err))
        });
    })
}

/**
 * Fetch member badge data for a given LinkedIn profile.
 * @param {object} lead 
 * @returns {object} memberBadges
 */
const _getMemberBadge = async (lead) => {
    let memberBadges;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/memberBadges`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('member badge...')
            memberBadges = res
        })
        .catch(err => console.log(err))
    })
    return memberBadges;
}

/**
 * Fetch network data for a given LinkedIn profile.
 * @param {object} lead
 * @returns {object} networkInfo
 */
const _getProfileNetworkInfo = async (lead) => {
    let networkInfo;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null){
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/networkinfo`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('network info...')
            // networkDistance = parseInt(res.data.distance.value.split('_')[1])
            networkInfo = res
        })
        .catch(err => console.log(err))
    });
    return networkInfo;
}

/**
 * Fetch data for a given LinkedIn profile.
 * @param {object} lead 
 * @returns {object} profileInfo
 */
const _getProfileInfo = async (lead) => {
    let profileInfo;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data){
        if (data !== null) {
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileView`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('profile info...')
            // if(res.included.length){
            //     for(let item of res.included){
            //         if(item['$type'] == 'com.linkedin.voyager.identity.shared.MiniProfile'){
            //             trackingId = item.trackingId
            //         }
            //     }
            // }
            profileInfo = res
        })
        .catch(err => console.log(err))
    })
    return profileInfo;
}

/**
 * Fetch contact data for a given LinkedIn profile.
 * @param {object} lead 
 * @returns {object} profileContactInfo
 */
const _getProfileContactInfo = async (lead) => {
    let profileContactInfo;
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null){
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });
    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(`${VOYAGER_API}/identity/profiles/${lead.connectionId}/profileContactInfo`, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log('profile contact info...')
            profileContactInfo = res
        })
        .catch(err => console.log(err))
    })
    return profileContactInfo;
}

const _updateCampaignLeadsNetwork = async () => {
    let campaigns = [], clist = [], leads = []

    // Get campaigns
    await fetch(`${PLATFROM_URL}/api/campaigns`, {
        method: 'get',
        headers: {
            'lk-id': linkedinId
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            campaigns = res.data
        }
    })

    // Get leads
    if(campaigns.length){
        for(let campaign of campaigns){
            if(['active','running'].includes(campaign.status)){
                for(let list of campaign.campaignList){
                    clist.push(list)
                }

                try {
                    await getCampaignLeads(campaign.id, (data) => {
                        if(data.length) {
                            for(let lead of data){
                                leads.push(lead)
                            }
                        };
                    })
                } catch (err) {
                    console.log(err)
                }
            }
        }

        // Remove duplicates
        const uniqueLeads = leads.filter((o, index, arr) => 
            arr.findIndex(item => item.connectionId === o.connectionId) === index
        )

        for(let lead of uniqueLeads){
            if(lead.networkDistance != 1){
                try {
                    let networkInfo = await _getProfileNetworkInfo(lead)

                    // update network distance on crm platform
                    lead.networkDegree = networkInfo.data.distance.value
                    await updateLeadNetworkDegree(lead)
                } catch (error) {
                    console.log(`Error while trying to get profile network: ${error.message}`)
                }
            }

            await delay(30000)
        }
    }
}

const _testFunc = async () => {
    let searchUrl = `https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-160&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:${encodeURIComponent('digital marketing')},flagshipSearchIntent:SEARCH_SRP,queryParameters:(resultType:List(CONTENT)),includeFiltersInResponse:false)&start=0`

    let url
    chrome.cookies.get({
        url: inURL,
        name: 'JSESSIONID'
    }, function(data) {
        if (data !== null){
            chrome.storage.local.remove("csrfToken")
            chrome.storage.local.set({
                "csrfToken": data.value.replaceAll('"','')
            });
        }
    });

    await chrome.storage.local.get(["csrfToken"]).then(async (result) => {
        await fetch(searchUrl, {
            headers: {
                'csrf-token': result.csrfToken,
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
                'x-li-lang': 'en_US',
                'x-li-page-instance': 'urn:li:page:d_flagship3_people_connections;un8rM4cBRDuC1Xpg7yGNCw==',
                'x-li-track': JSON.stringify({"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
                'x-restli-protocol-version': '2.0.0'
            }
        })
        .then(res => res.json())
        .then(res => {
            console.log(res)
        })
        .catch(err => console.log(err))
    })
}

getUserProfile()
