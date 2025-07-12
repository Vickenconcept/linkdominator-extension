const getCookie = (cname) => {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split('; ');
  let token = ''

  for(let item of ca) {
    if(item.includes(name)) {
        token = item.replace(name,'');
        token = token.replaceAll('"','');
    }
  }
  return token;
}

var d=new Date();
var dInt=new Date(d).getTime();
var filterApi=PLATFROM_URL+'/api';
var voyagerApi=LINKEDIN_URL+'/voyager/api';
var linkedinBlock=LINKEDIN_URL+'/psettings/member-blocking';
var voyagerSingleSearchUrl=`${voyagerApi}/voyagerSearchDashReusableTypeahead?decorationId=com.linkedin.voyager.dash.deco.search.typeahead.ReusableTypeaheadCollection-26`;
var voyagerBlockSearchUrl=`${voyagerApi}/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-160&origin=GLOBAL_SEARCH_HEADER&q=all`;
var voyagerGroupMemberSearchUrl=`${voyagerApi}/groups/groups`;
var linkedinId='';
var profileUrn=''


var jsession = getCookie('JSESSIONID');
// header params
var accept = 'text/plain, */*; q=0.01';
var acceptVnd = 'application/vnd.linkedin.normalized+json+2.1';
var contentType = 'application/json; charset=UTF-8';
var contentTypeJsonOnly = 'application/json';
var xLiLang = 'en_US';
var xLiPageInstance = 'urn:li:page:d_flagship3_people_invitations;1ZlPK7kKRNSMi+vkXMyVMw==';
var xLiPageInstanceFIlter = 'urn:li:page:d_flagship3_search_srp_top;YHGJbIUbSOGd0tf1Bw0dqA==';
var xLiTrack = {"clientVersion":"1.10.1208","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xLiTrack2 = {"clientVersion":"1.10.1335","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xLiTrack3 = {"clientVersion":"1.10.1697","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xLiTrackFilter = {"clientVersion":"1.8.4154","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"};
var xRestliProtocolVersion = '2.0.0';


const getUserProfile = async () => {
  await $.ajax({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('Accept', '*/*');
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      request.setRequestHeader('X-Li-Lang', 'en_US');
      request.setRequestHeader('X-Li-Page-Instance', 'urn:li:page:d_flagship3_feed;YGW6mrQMQ3aVUJHdZAqr5Q==');
      request.setRequestHeader('X-Li-Track', JSON.stringify({"clientVersion":"1.7.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('X-Restli-Protocol-Version', '2.0.0');
    },
    url: `${voyagerApi}/me`,
    success: function(data){
        var loggedInUser = data;
        var rootPath = loggedInUser.miniProfile;
        var userName = rootPath.firstName;
        var lastName = rootPath.lastName;
        var profilePixRootUrl = rootPath.hasOwnProperty('picture') ? rootPath.picture['com.linkedin.common.VectorImage'].rootUrl : null;
        var profilePix = rootPath.hasOwnProperty('picture') ?  profilePixRootUrl+rootPath.picture['com.linkedin.common.VectorImage'].artifacts[0].fileIdentifyingUrlPathSegment : null;
        var plainId = null;
        var publicIdentifier = rootPath.publicIdentifier;

        if(data.hasOwnProperty('plainId')){
          plainId = loggedInUser.plainId;
        }

        if(!profilePix) {
          profilePix = `<i class="fas fa-user-circle fa-lg img-thumbnail rounded-circle" style="color:#9999FF;margin-top:15px"></i>`
        }else {
          profilePix = `<img src="${profilePix}" class="img-thumbnail rounded-circle" width="40" height="40" style="float:left;"></img>`
        }
        
        userData = `
          <div style="display:inline-block;">
            ${profilePix}&nbsp;&nbsp;
            <h6 class="selected-drop-list" 
              style="float:right;position:relative;color:#000000;padding: 12px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;">
              <b>${userName}</b>
            </h6>
          </div>
          <input type="hidden" value="${plainId}" id="me-plainId">
          <input type="hidden" value="${publicIdentifier}" id="me-publicIdentifier">
        `;
        $('#profileSpot').append(userData);
        linkedinId = $('#me-publicIdentifier').val()
        profileUrn = rootPath.entityUrn.replace('urn:li:fs_miniProfile:','')
        connectionStat();
        userPermissions();
    
    },
    error: function(err,statusText,responseText){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(responseText);
    }
  })
}

// calculate time for automation
const remainedTime = (delayTime, totalConnect) => {
  var time = delayTime * totalConnect
  // Hours, minutes and seconds
  var hrs = ~~(time / 3600);
  var mins = ~~((time % 3600) / 60);
  var secs = ~~time % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = "";
  if (hrs > 0) {
      ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }
  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

// based on module action
const sendStats = async (totalFollow, module) => {
  await $.ajax({
      method: 'post',
      url: `${filterApi}/activites?module=${module}&stat=${totalFollow}&identifier=${$('#me-publicIdentifier').val()}`,
      success: function(data){},
      error: function(err, textStatus){
        if(err.hasOwnProperty('responseJSON'))
          console.log(err.responseJSON.data.message);
        else console.log(textStatus);
      }
  })
}

const connectionStat = async () => {
  await $.ajax({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/relationships/connectionsSummary`,
    success: function(data){
      let totalConnection = data.numConnections
      if(data.entityUrn.includes('urn:li:fs_relConnectionsSummary:')){}
        let publicId = data.entityUrn.replace('urn:li:fs_relConnectionsSummary:','')

      pendingInviteStat(totalConnection, publicId)
    },
    error: function(err, textStatus){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(textStatus);
    }
  })
}

const pendingInviteStat = async (totalConnection, publicId) => {
  await $.ajax({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/relationships/invitationsSummaryV2?types=List(SENT_INVITATION_COUNT,PENDING_INVITATION_COUNT)`,
    success: function(data){
      let numTotalSentInvitations = data.numTotalSentInvitations;
      
      profileViewStat(totalConnection, numTotalSentInvitations, publicId)
    },
    error: function(err, textStatus){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(textStatus);
    }
  })
}

const profileViewStat = async (totalConnection, numTotalSentInvitations, publicId) => {
  await $.ajax({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/identity/panels`,
    success: function(data){
      let profileView = 0;

      if(data.elements.length) {
        let realPath = data.elements[0].value['com.linkedin.voyager.identity.me.ProfileViewsByTimePanel'].chartData;
        let realPoint = realPath.length - 1
        let changePercentage = realPath[realPoint].changePercentage
        

        if (parseInt(changePercentage) < 0)
          profileView = changePercentage
        else
          profileView = '+'+ changePercentage
        // searchAppearanceStat(totalConnection, numTotalSentInvitations, profileView, publicId)
      }
      searchAppearanceStat(totalConnection, numTotalSentInvitations, profileView, publicId)
    },
    error: function(err, textStatus){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(textStatus);
    }
  })
}

const searchAppearanceStat = async (totalConnection, numTotalSentInvitations, profileView, publicId) => {
  await $.ajax({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('csrf-token', jsession);
      request.setRequestHeader('content-type', contentType);
      request.setRequestHeader('x-li-lang', xLiLang);
      request.setRequestHeader('x-li-page-instance', 'urn:li:page:d_flagship3_feed;mzVS2p1xTZCOWo+RnDKNag==');
      request.setRequestHeader('x-li-track', JSON.stringify({"clientVersion":"1.10.2031.2","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}));
      request.setRequestHeader('x-restli-protocol-version', xRestliProtocolVersion);
    },
    url: `${voyagerApi}/identity/profiles/${publicId}/dashboard`,
    success: function(data){
      let searchAppearance = data.numSearchAppearances
      sendMiniStats(totalConnection, numTotalSentInvitations, profileView, searchAppearance)
    },
    error: function(err, textStatus){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(textStatus);
    }
  })
}

const sendMiniStats = async (totalConnection, numTotalSentInvitations, profileView, searchAppearance) => {
  await $.ajax({
    method: 'post',
    url: `${filterApi}/conf?connection=${totalConnection}&sentInvite=${numTotalSentInvitations}&profileView=${profileView}&searchAppear=${searchAppearance}&profileId=${$('#me-publicIdentifier').val()}`,
    success: function(data){},
    error: function(err, textStatus){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(textStatus);
    }
  })
}

const userPermissions = async () => {
  await $.ajax({
    method: 'get',
    beforeSend: function(request) {
      request.setRequestHeader('Content-Type', 'application/json')
      request.setRequestHeader('lk-id', linkedinId)
  },
    url: `${filterApi}/accessCheck`,
    success: function(data){
      if (data.status == 401){
        $('body').append(`<input type="hidden" id="accessCheck" value="${data.status}">`)
      }else {
        onMounted()
        getAutoRespondMessages()
        getAIContents()
        getSNLeadList()
        getCampaigns()
      }
    },
    error: function(err, textStatus){
      if(err.hasOwnProperty('responseJSON'))
        console.log(err.responseJSON.data.message);
      else console.log(textStatus);
    }
  })
}

const onMounted = () => {
  if (localStorage.getItem("lkm-mtu") === null) {
    localStorage.setItem("lkm-mtu", JSON.stringify({
      uploads: [],
      position: 0,
      total: 10,
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-mac") === null) {
    localStorage.setItem("lkm-mac", JSON.stringify({
      uploads: [],
      position: 0,
      total: 10,
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-bdw") === null) {
    localStorage.setItem("lkm-bdw", JSON.stringify({
      uploads: [],
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-ang") === null) {
    localStorage.setItem("lkm-ang", JSON.stringify({
      uploads: [],
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-njc") === null) {
    localStorage.setItem("lkm-njc", JSON.stringify({
      uploads: [],
      delay: 30,
      filters: {}
    }))
  }
  if (localStorage.getItem("lkm-mfu") === null) {
    localStorage.setItem("lkm-mfu", JSON.stringify({
      uploads: [],
      delay: 30,
      total: 10,
      waitdays: 2,
      filters: {}
    }))
  }
  if(localStorage.getItem("lkm-arm") === null) {
    localStorage.setItem("lkm-arm", JSON.stringify({
      uploads: [],
    }))
  }
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))