let campaignData = [], campaignLeads = [], campaignSequence = [], campaignLeadgenRunning = [];
let selectedCampaign;

/**
 * Get all campaign resource
 */
const getCampaigns = () => {
    fetch(`${PLATFROM_URL}/api/campaigns`, {
        method: 'get',
        headers: {
            'lk-id': linkedinId
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            campaignData = res.data
            setCampaigns()
        }
    })
}

/**
 * Set all camaign resource to list
 */
const setCampaigns = () => {
    let tbody = document.getElementById('campaign-tbody');

    if(campaignData.length){
        $('#campaign-tbody').empty();
        $.each(campaignData, function(i,item) {
            $('#campaign-tbody').append(`
                <tr class="campaign-${item.id}">
                    <td title="${item.name}">${item.name}</td>
                    <td title="${item.sequenceType}">${item.sequenceType}</td>
                    <td title="${helper.transformText(item.status,'capitalize')}">${helper.transformText(item.status,'capitalize')}</td>
                    <td>
                        <div class="form-check form-switch custom-control custom-checkbox custom-control-inline">
                            <input class="form-check-input shadow-none runSwitch" type="checkbox" role="switch" id="runSwitch-${item.id}" data-campaignid="${item.id}" ${item.status == 'running'? 'checked':''}>
                            <label class="form-check-label" for="runSwitch-${item.id}">Launch</label>
                        </div>
                    </td>
                </tr>
            `);
        });
    }
}

/**
 * Get leads of a specific campaign
 * @param {integer} campaignId 
 */
const getCampaignLeads = async (campaignId, callback) => {
    await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leads`, {
        method: 'get',
        headers: {
            'lk-id': linkedinId
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            campaignLeads = res.data
            callback(res.data)
        }
    })
}

/**
 * Get sequence of a specific campaign
 * @param {integer} campaignId
 */
const getCampaignSequence = async (campaignId) => {
    await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/sequence`, {
        method: 'get',
        headers: {
            'lk-id': linkedinId
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            campaignSequence = res.data
        }
    })
}

/**
 * Update campaign specific resource
 * @param {object} data 
 */
const updateCampaign = (data) => {
    for(let item of campaignData){
        if(item.id == data.campaignId){
            selectedCampaign = item
        }
    }

    let formData = new FormData();
    if(selectedCampaign && Object.keys(selectedCampaign).length){
        formData.append('campaign_name', selectedCampaign.name);
        formData.append('process_condition', JSON.stringify(selectedCampaign.notProcessConditionIf));
    }
    formData.append('status', data.status);

    fetch(`${PLATFROM_URL}/api/campaign/${data.campaignId}/update`, {
        method: 'post',
        headers: {
            'lk-id': linkedinId,
        },
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            getCampaigns()
            if(data.status == 'running'){
                chrome.runtime.sendMessage({campaign: selectedCampaign}, function(response) {
                    console.log(response)
                })
            }else if(data.status == 'stop'){
                chrome.runtime.sendMessage({stopCampaign: selectedCampaign}, function(response) {
                    console.log(response)
                })
            }
        }
    })
}

/**
 * Update run status of specific item in node model
 */
const updateSequenceNodeModel = async (campaign, nodeModel) => {
    let formData = new FormData();
    formData.append('nodeKey', nodeModel.key);
    formData.append('runStatus', true);

    await fetch(`${PLATFROM_URL}/api/campaign/${campaign.id}/update-node`, {
        method: 'post',
        headers: {
            'lk-id': linkedinId,
        },
        body: formData
    })
    .then(res => res.json())
    .then(() => {})
}

/**
 * Create the campaign lead for the specified lead gen running
 * @param {integer} campaignId 
 */
const createLeadGenRunning = campaignId => {
    fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/store`, {
        method: 'post',
        headers: {
            'lk-id': linkedinId,
        },
    })
    .then(res => res.json())
    .then(() => {})
}

/**
 * Update specified leadgen lead running for the current campaign
 * @param {integer} campaignId 
 * @param {integer} leadId 
 * @param {object} data 
 */
const updateLeadGenRunning = async (campaignId, leadId, data) => {
    let formData = new FormData();
    formData.append('acceptedStatus', data.acceptedStatus ? 1 : 0);
    formData.append('currentNodeKey', data.currentNodeKey);
    formData.append('nextNodeKey', data.nextNodeKey);
    formData.append('statusLastId', data.statusLastId);

    await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen/${leadId}/update`, {
        method: 'post',
        headers: {
            'lk-id': linkedinId,
        },
        body: formData
    })
    .then(res => res.json())
    .then(() => {})
}

/**
 * Get all leadgen campaign sequence leads running
 * @param {integer} campaignId 
 */
const getLeadGenRunning = async (campaignId) => {
    await fetch(`${PLATFROM_URL}/api/campaign/${campaignId}/leadgen`, {
        headers: {
            'lk-id': linkedinId
        }
    })
    .then(res => res.json())
    .then(res => {
        if(res.status == 200){
            campaignLeadgenRunning = res.data
        }
    })
}

const updateLeadNetworkDegree = async (leadData) => {
    let formData = new FormData();
    formData.append('networkDegree', leadData.networkDegree);
    formData.append('leadSrc', leadData.source);

    await fetch(`${PLATFROM_URL}/api/lead/${leadData.id}/update`, {
        method: 'post',
        headers: {
            'lk-id': linkedinId,
        },
        body: formData
    })
    .then(res => res.json())
    .then(() => {})
}

/**
 * Save call status
 */
const storeCallStatus = async (data) => {
    try {
        let formData = new FormData();
        formData.append('recipient', data.recipient);
        formData.append('profile', data.profile);
        formData.append('sequence', data.sequence);
        formData.append('callStatus', data.callStatus);

        await fetch(`${PLATFROM_URL}/api/book-call/store`, {
            method: 'post',
            headers: {
                'lk-id': linkedinId,
            },
            body: formData
        })
        .then(res => res.json())
        .then(() => {

        })
    } catch (error) {
        console.log(error.message)
    }
}