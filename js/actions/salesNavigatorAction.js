
let tmpData = {}
let snFields = {
    startPos: 0,
    totalLeads: 10,
    listName: null,
    listType: 'existing'
}
let noticeDiv = $('.salesNavigator'),
    noticeStatus = $('#displaySalesNavigatorStatus'),
    exportActionBtn = $('.salesNavigatorAction');

let currentUrl = window.location.href;
let snSalesSearchOrigin = `${LINKEDIN_URL}/sales/search/people`;
let snSalesListsOrigin = `${LINKEDIN_URL}/sales/lists/people`;
let snLeadsApi = `${LINKEDIN_URL}/sales-api/salesApiLeadSearch`;
let snLeadsProfileApi = `${LINKEDIN_URL}/sales-api/salesApiProfiles`
let snLeadsCompanyApi = `${LINKEDIN_URL}/sales-api/salesApiCompanies`
let snSearchStatus = false, snListStatus = false;
let leads = []
let leadList = []

$('.salesNavigatorAction').click(function() {
    snFields.startPos = $('#sn-startPosition').val() || 0
    snFields.totalLeads = $('#sn-totalLeads').val()
    snFields.listType = $('#list-type').val()

    if(snFields.listType == 'existing')
        snFields.listName = $('#sn-list').val()
    else
        snFields.listName = $('#sn-newList').val()

    // validate
    validateSNInput();
})

const validateSNInput = () => {
    if(currentUrl.includes(snSalesListsOrigin)) {
        if(currentUrl.includes('sortCriteria') && currentUrl.includes('sortOrder')) {
            snListStatus = true
        }
    }else if(currentUrl.includes(snSalesSearchOrigin) && currentUrl.includes('query')) {
        snSearchStatus = true
    }else {
        let link = `
            <a href="${snSalesSearchOrigin}" 
            target="_blank"
            style="color: blue;">
                Sales navigator
            </a>
        `;
        displaySNNotice(`Navigate to ${link}`);
        return;
    }

    if(!snFields.totalLeads) {
        displaySNNotice('Total is required!');
        return;
    }
    if(snFields.listType && !snFields.listName) {
        displaySNNotice('List is required!');
        return;
    }

    getSNLeads();
}

const getSNLeads = () => {
    exportActionBtn.attr('disabled', true)

    if(snSearchStatus)
        getSNFromSearchList()
    else if(snListStatus)
        getSNFromLeadList()
}

const getSNFromSearchList = () => {
    displaySNNotice('Getting leads...');
    let urlParams = new URLSearchParams(window.location.search);
    let queryParams = urlParams.get('query');

    fetch(`${snLeadsApi}?q=searchQuery&query=${queryParams}&start=${snFields.startPos}&count=${snFields.totalLeads}&decorationId=com.linkedin.sales.deco.desktop.searchv2.LeadSearchResult-14`, {
        method: 'GET',
        headers: {
            'csrf-token': jsession,
            'accept': '*/*',
            'x-li-lang': 'en_US',
            'x-li-page-instance': 'urn:li:page:d_sales2_search_people;kUSGCzwYQJajmAuXg1zDVA==',
            'x-li-track': JSON.stringify({"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}),
            'x-restli-protocol-version': '2.0.0',
        },
    })
    .then(res => res.json())
    .then(res => {
        if(res.elements.length) {
            displaySNNotice(`
                Found: ${res.paging.total} <br>
                Collecting ${snFields.totalLeads > res.paging.total ? res.paging.total : snFields.totalLeads}...
            `)
            cleanSNSearchList(res.elements)
        }
    })
    .catch(err => {
        console.log(err)
        exportActionBtn.attr('disabled', false)
    })
}

const getSNFromLeadList = () => {
    let listId = currentUrl.replace(`${LINKEDIN_URL}/sales/lists/people/`,'').split('?')[0]
    let url = `${LINKEDIN_URL}/sales-api/salesApiPeopleSearch`

    fetch(`${url}?q=peopleSearchQuery&query=(spotlightParam:(selectedType:ALL),doFetchSpotlights:true,doFetchHits:true,doFetchFilters:false,pivotParam:(com.linkedin.sales.search.LeadListPivotRequest:(list:urn%3Ali%3Afs_salesList%3A${listId},sortCriteria:ASSOCIATED_ACCOUNT,sortOrder:ASCENDING)),list:(scope:LEAD,includeAll:false,excludeAll:false,includedValues:List((id:${listId}))))&start=${snFields.startPos}&count=${snFields.totalLeads}&decoration=%28entityUrn%2CprofilePictureDisplayImage%2CfirstName%2ClastName%2CfullName%2Cdegree%2CblockThirdPartyDataSharing%2CcrmStatus%2CgeoRegion%2ClistCount%2CdateAddedToListAt%2CpendingInvitation%2Csaved%2CleadAssociatedAccount~fs_salesCompany%28entityUrn%2Cname%29%2CoutreachActivity%2Cmemorialized%2CsavedAccount~fs_salesCompany%28entityUrn%2Cname%29%2CnotificationUrnOnLeadList%2CuniquePositionCompanyCount%2CcurrentPositions*%28title%2CcompanyName%2Ccurrent%2CcompanyUrn%29%2CmostRecentEntityNote%28body%2ClastModifiedAt%2CnoteId%2Cseat%2Centity%2CownerInfo%2Cownership%2Cvisibility%29%29`,{
        method: 'GET',
        headers: {
            'csrf-token': jsession,
            'accept': '*/*',
            'x-restli-protocol-version': '2.0.0',
        },
    })
    .then(res => res.json())
    .then(res => {
        if(res.elements.length) {
            displaySNNotice(`
                Found: ${res.paging.total} <br>
                Collecting ${snFields.totalLeads > res.paging.total ? res.paging.total : snFields.totalLeads}...
            `)
            cleanSNLeadsList(res.elements)
        }
    })
    .catch(err => {
        console.log(err)
        exportActionBtn.attr('disabled', false)
    })
}

const cleanSNLeadsList = async (elements) => {
    leads = []
    for(const [i, item] of elements.entries()) {
        tmpData = {
            firstName: elements[i].firstName,
            lastName: elements[i].lastName,
            entityUrn: elements[i].entityUrn,
            profileId: getSNLeadProfileId(elements[i].entityUrn),
            authToken: getSNLeadAuthToken(elements[i].entityUrn),
            degree: elements[i].degree,
            picture: getSNLeadPictureUrl(elements[i]?.profilePictureDisplayImage || null),
        }

        getSNLeadProfile(tmpData, (data) => {
            tmpData['headline'] = data.data.headline
            tmpData['geoLocation'] = data.data.location
            tmpData['numOfConnections'] = data.data.numOfConnections
            tmpData['numOfSharedConnections'] = data.data.numOfSharedConnections
            tmpData['objectUrn'] = data.data.objectUrn
            tmpData['summary'] = data.data.summary
            tmpData['email'] = data.data.contactInfo?.primaryEmail || null
            tmpData['companyName'] = data.data.positions[0]?.companyName || null
            tmpData['companyUrn'] = data.data.positions[0]?.companyUrn || null
            tmpData['companyId'] = getSNLeadCompanyId(data.data.positions[0]?.companyUrn || null)

            if(tmpData.companyId) {
                getSNLeadCompany(tmpData.companyId, (data) => {
                    tmpData['website'] = data.data.website
                    tmpData['yearFounded'] = data.data.yearFounded
                    tmpData['specialties'] = data.data.specialties // array
                    tmpData['headquarters'] = data.data.headquarters?.country || null
                    tmpData['description'] = data.data?.description || null
                    tmpData['companyPicture'] = getSNLeadPictureUrl(data.data.companyPictureDisplayImage)
                    tmpData['companyEntityUrn'] = data.data.entityUrn
                    tmpData['companyIndustry'] = data.data.industry
                })
            }else {
                tmpData['website'] = null
                tmpData['yearFounded'] = null
                tmpData['specialties'] = null
                tmpData['headquarters'] = null
                tmpData['description'] = null
                tmpData['companyPicture'] = null
                tmpData['companyEntityUrn'] = null
                tmpData['companyIndustry'] = null
            }
            leads.push(tmpData)
        })
        await sleep(10000)
    }

    if(snFields.listType == 'existing'){
        saveSNLeads()
    }else {
        createSNLeadList((data) => {
            snFields.listName = data.listId
            saveSNLeads()
            getSNLeadList()
        })
    }
}

const cleanSNSearchList = async (elements) => {
    leads = []
    for(const [i, item] of elements.entries()) {
        tmpData = {
            firstName: elements[i].firstName,
            lastName: elements[i].lastName,
            objectUrn: elements[i].objectUrn,
            entityUrn: elements[i].entityUrn,
            profileId: getSNLeadProfileId(elements[i].entityUrn),
            authToken: getSNLeadAuthToken(elements[i].entityUrn),
            degree: elements[i].degree,
            picture: getSNLeadPictureUrl(elements[i]?.profilePictureDisplayImage || null),
            currentPosition: elements[i].currentPositions[0]?.title || null,
            companyName: elements[i].currentPositions[0]?.companyName || null,
            companyUrn: elements[i].currentPositions[0]?.companyUrn || null,
            companyIndustry: elements[i].currentPositions[0]?.companyUrnResolutionResult?.industry || null,
            companyLocation: elements[i].currentPositions[0]?.companyUrnResolutionResult?.location || null,
            companyEntityUrn: elements[i].currentPositions[0]?.companyUrnResolutionResult?.entityUrn || null,
            companyId: getSNLeadCompanyId(elements[i].currentPositions[0]?.companyUrnResolutionResult?.entityUrn || null),
            companyPicture: getSNLeadPictureUrl(elements[i].currentPositions[0]?.companyUrnResolutionResult?.companyPictureDisplayImage || null)
        }

        getSNLeadProfile(tmpData, (data) => {
            tmpData['headline'] = data.data.headline
            tmpData['geoLocation'] = data.data.location
            tmpData['numOfConnections'] = data.data.numOfConnections
            tmpData['numOfSharedConnections'] = data.data.numOfSharedConnections
            tmpData['email'] = data.data.contactInfo?.primaryEmail || null
        })

        if(tmpData.companyId) {
            getSNLeadCompany(tmpData.companyId, (data) => {
                tmpData['website'] = data.data.website
                tmpData['yearFounded'] = data.data.yearFounded
                tmpData['specialties'] = data.data.specialties // array
                tmpData['headquarters'] = data.data.headquarters?.country || null
                tmpData['description'] = data.data.description
            })
        }else {
            tmpData['website'] = null
            tmpData['yearFounded'] = null
            tmpData['specialties'] = null
            tmpData['headquarters'] = null
            tmpData['description'] = null
        }
        leads.push(tmpData)
        await sleep(10000)
    }

    if(snFields.listType == 'existing'){
        saveSNLeads()
    }else {
        createSNLeadList((data) => {
            snFields.listName = data.listId
            saveSNLeads()
            getSNLeadList()
        })
    }
}

const getSNLeadProfile = (params, callback) => {
    fetch(`${snLeadsProfileApi}/(profileId:${params.profileId},authType:NAME_SEARCH,authToken:${params.authToken})?decoration=${getProfileDecorationStr()}`,{
        method: 'GET',
        headers: {
            'csrf-token': jsession,
            'accept': 'application/vnd.linkedin.normalized+json+2.1',
            'x-restli-protocol-version': '2.0.0',
        },
    })
    .then(res => res.json())
    .then(res => {
        callback(res)
    })
    .catch(err => {
        exportActionBtn.attr('disabled', false)
        console.log(err)
    })
}

const getSNLeadCompany = (companyId, callback) => {
    fetch(`${snLeadsCompanyApi}/${companyId}?decoration=${getCompanyDecorationStr()}`,{
        method: 'GET',
        headers: {
            'csrf-token': jsession,
            'accept': 'application/vnd.linkedin.normalized+json+2.1',
            'x-restli-protocol-version': '2.0.0',
        },
    })
    .then(res => res.json())
    .then(res => {
        callback(res)
    })
    .catch(err => {
        exportActionBtn.attr('disabled', false)
        console.log(err)
    })
}

const saveSNLeads = async () => {
    for(const [i, item] of leads.entries()) {
        fetch(`${filterApi}/snleads/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'lk-id': linkedinId
            },
            body: JSON.stringify({
                leads: leads[i],
                listId: snFields.listName,
            })
        })
        .then(res => res.json())
        .then(res => {
            displaySNNotice(`
                <li>Adding: <b>${leads[i].firstName+' '+leads[i].lastName}</b></li>
                <li>Title: <b>${leads[i].headline}</b></li>
                <li>Users added: <b>${i + 1}</b></li>
                <li>Status: <b>${res.message}</b></li>
            `)
        })
        .catch(err => {
            exportActionBtn.attr('disabled', false)
            console.log(err)
        })

        await sleep(15000)
    }
    exportActionBtn.attr('disabled', false)
}

const createSNLeadList = (callback) => {
    fetch(`${filterApi}/snleads/list/store`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'lk-id': linkedinId
        },
        body: JSON.stringify({
            listName: snFields.listName,
        })
    })
    .then(res => res.json())
    .then(res => {
        callback(res)
    })
    .catch(err => {
        console.log(err)
    })
}

const getSNLeadList = () => {
    fetch(`${filterApi}/snleads/lists`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'lk-id': linkedinId
        },
    })
    .then(res => res.json())
    .then(res => {
        leadList = res.data
        setSNLeadList()
    })
    .catch(err => {
        console.log(err)
    })
}

const setSNLeadList = () => {
    $('#sn-list').empty();
    $('<option/>', {
        value: '',
        html: 'Select list'
    }).appendTo(`#sn-list`);

    for (let v of leadList){
        $('<option/>', {
            value: v.list_hash,
            html: v.name
        }).appendTo(`#sn-list`);
    }
}

const getSNLeadProfileId = (str) => {
    return str.replace('urn:li:fs_salesProfile:(','').split(',')[0]
}

const getSNLeadCompanyId = (str) => {
    if(str)
        return str.replace('urn:li:fs_salesCompany:','')
    else
        return str
}

const getSNLeadPictureUrl = (picPath) => {
    if(picPath)
        return picPath.rootUrl + picPath.artifacts[0].fileIdentifyingUrlPathSegment;
    else
        return picPath
}

const getSNLeadAuthToken = (str) => {
    return str.replace('urn:li:fs_salesProfile:(','').split(',')[2].replace(')','')
}

const getProfileDecorationStr = () => {
    return `%28%0A%20%20entityUrn%2C%0A%20%20objectUrn%2C%0A%20%20firstName%2C%0A%20%20lastName%2C%0A%20%20fullName%2C%0A%20%20headline%2C%0A%20%20memberBadges%2C%0A%20%20pronoun%2C%0A%20%20degree%2C%0A%20%20profileUnlockInfo%2C%0A%20%20latestTouchPointActivity%2C%0A%20%20location%2C%0A%20%20listCount%2C%0A%20%20summary%2C%0A%20%20savedLead%2C%0A%20%20defaultPosition%2C%0A%20%20contactInfo%2C%0A%20%20crmStatus%2C%0A%20%20pendingInvitation%2C%0A%20%20unlocked%2C%0A%20%20flagshipProfileUrl%2C%0A%20%20fullNamePronunciationAudio%2C%0A%20%20memorialized%2C%0A%20%20numOfConnections%2C%0A%20%20numOfSharedConnections%2C%0A%20%20showTotalConnectionsPage%2C%0A%20%20profilePictureDisplayImage%2C%0A%20%20profileBackgroundPicture%2C%0A%20%20relatedColleagueCompanyId%2C%0A%20%20blockThirdPartyDataSharing%2C%0A%20%20noteCount%2C%0A%20%20positions*%28%0A%20%20%20%20companyName%2C%0A%20%20%20%20current%2C%0A%20%20%20%20new%2C%0A%20%20%20%20description%2C%0A%20%20%20%20endedOn%2C%0A%20%20%20%20posId%2C%0A%20%20%20%20startedOn%2C%0A%20%20%20%20title%2C%0A%20%20%20%20location%2C%0A%20%20%20%20richMedia*%2C%0A%20%20%20%20companyUrn~fs_salesCompany%28entityUrn%2Cname%2CcompanyPictureDisplayImage%29%0A%20%20%29%0A%29`
}

const getCompanyDecorationStr = () => {
    return `%28entityUrn%2Cname%2Caccount%28saved%2CnoteCount%2ClistCount%2CcrmStatus%2Cstarred%29%2CpictureInfo%2CcompanyPictureDisplayImage%2Cdescription%2Cindustry%2Clocation%2Cheadquarters%2Cwebsite%2CrevenueRange%2CcrmOpportunities%2CflagshipCompanyUrl%2CemployeeGrowthPercentages%2Cemployees*~fs_salesProfile%28entityUrn%2CfirstName%2ClastName%2CfullName%2CpictureInfo%2CprofilePictureDisplayImage%29%2Cspecialties%2Ctype%2CyearFounded%29`
}

const displaySNNotice = (message) => {
    noticeDiv.show();
    noticeStatus.html(message);
}