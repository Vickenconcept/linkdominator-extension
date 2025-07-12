var userData;

var mainMenu = `
<div id="mySidepanel" class="sidepanel" style="width:285px;display:none;">
    <div class="inline-block">
        <!--h5 class="nav-header"><b>LinkoMatic</b></h5-->
        <a href="#" target="_blank">
            <img src="https://tubetargeterapp.com/img/linkdominator-brand.png" 
            height="30" 
            style="margin-left:35px;width:16rem;">
        </a>
        <span class="closebtn" id="close-nav"><i class="fas fa-minus closer"></i></span>
    </div>
    <div class="menu-divider" style="margin-bottom:8px;"></div>
    <a href="${LINKEDIN_URL}/in/me" id="profileSpot" style="padding: 0px 8px 0px 32px;"></a>
    <div class="menu-divider-menu"></div>
    <div id="menus" class="menus">
        <span id="stop-bot">
            <i class="fas fa-toggle-on fa-lg sm-icon"></i>&nbsp;Stop Bot
        </span>
        <div class="menu-divider-menu"></div>
        <span id="audience-creation-menu-click">
            <i class="fas fa-bullhorn fa-lg sm-icon"></i>&nbsp;&nbsp;Audience Creation
        </span>
        <div class="menu-divider-menu"></div>
        <span id="sales-navigator-menu-click">
            <i class="fas fa-compass fa-lg sm-icon"></i>&nbsp;&nbsp;Sales Navigator
        </span>
        <div class="menu-divider-menu"></div>
        <span id="campaign-menu-click">
            <i class="fas fa-flag fa-lg sm-icon"></i>&nbsp;&nbsp;Campaign
        </span>
        <div class="menu-divider-menu"></div>
        <span id="add-connect-menu-click">
            <i class="fas fa-user-plus fa-lg sm-icon"></i>&nbsp;Add Connections
        </span>
        <div class="menu-divider-menu"></div>
        <span id="message-connect-menu-click">
            <i class="fas fa-paper-plane fa-lg sm-icon"></i>&nbsp;&nbsp;Message All Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="message-target-menu-click">
            <i class="fas fa-bullseye fa-lg sm-icon"></i>&nbsp;&nbsp;Message Targeted Users 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="message-followup-menu-click">
            <i class="fas fa-comments fa-lg sm-icon"></i>&nbsp;Message Follow Up
        </span>
        <div class="menu-divider-menu"></div>
        <span id="auto-respond-menu-click">
            <i class="fas fa-reply fa-lg sm-icon"></i>&nbsp;&nbsp;Auto Respond Messages 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="connection-info-menu-click">
            <i class="fas fa-cloud-download-alt fa-lg sm-icon"></i>&nbsp;Get Connection Info 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="view-connection-menu-click">
            <i class="fas fa-eye fa-lg sm-icon"></i>&nbsp;&nbsp;View Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="endorse-connection-menu-click">
            <i class="fas fa-handshake fa-lg sm-icon"></i>&nbsp;Endorse Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="like-connect-menu-click">
            <i class="fas fa-thumbs-up fa-lg sm-icon"></i>&nbsp;&nbsp;Like Or Connect 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="follow-connect-menu-click">
            <i class="fas fa-user-circle fa-lg sm-icon"></i>&nbsp;&nbsp;Follow Connections 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="birthday-wish-menu-click">
            <i class="fas fa-gifts fa-lg sm-icon"></i>&nbsp;Wish Happy Birthday 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="anniversary-menu-click">
            <i class="fas fa-gift fa-lg sm-icon"></i>&nbsp;&nbsp;Congrats On Anniversary
        </span>
        <div class="menu-divider-menu"></div>
        <span id="new-job-menu-click">
            <i class="fas fa-suitcase fa-lg sm-icon"></i>&nbsp;&nbsp;Congrats On New Job
        </span>
        <div class="menu-divider-menu"></div>
        <!--span id="remove-connect-menu-click">
            <i class="fas fa-trash fa-lg sm-icon"></i>&nbsp;&nbsp;&nbsp;Remove Connections 
        </span-->
        <div class="menu-divider-menu"></div>
        <span id="withdraw-invite-menu-click">
            <i class="fas fa-ban fa-lg sm-icon"></i>&nbsp;&nbsp;Withdraw Sent Invites 
        </span>
        <div class="menu-divider-menu"></div>
        <span id="accept-invite-menu-click">
            <i class="fas fa-check-double fa-lg sm-icon"></i>&nbsp;&nbsp;&nbsp;Accept Received Invites 
        </span>
        <div class="menu-divider" style="margin-top: 20px"></div>
        <span>
            &copy; LinkDominator 
        </span>
    </div>
</div>

<span class="float-btn" id="open-nav">
    <!--i class="fas fa-plus my-float"></i-->
    <img src="https://tubetargeterapp.com/img/linkdominator-48.png" height="40"  class="my-float">
</span>
`;

$('body').append(mainMenu)
getUserProfile();

$('#open-nav').click(function(){
    let sidePanel = $('#mySidepanel')

    if(sidePanel.is(':hidden')) {
        sidePanel.show().fadeIn('slow')
    }else {
        sidePanel.hide().fadeOut('slow')
    }
})

$('#close-nav').click(function() {
    $('#mySidepanel').hide().fadeOut('slow')
})

const getAudienceList = async (fieldId) => {
    var publicId = $('#me-publicIdentifier').val();

    $.ajax({
        method: 'get',
        url: `${filterApi}/audience?linkedinId=${publicId}`,
        success: function(data){
            if(data.length > 0){
                if(data[0].audience.length > 0){
                    $(`#${fieldId}`).empty();

                    $('<option/>', {
                        value: '',
                        html: 'Select an audience'
                    }).appendTo(`#${fieldId}`);

                    for (let i=0; i<data[0].audience.length; i++){
                        $('<option/>', {
                            value: data[0].audience[i].audience_id,
                            html: data[0].audience[i].audience_name
                        }).appendTo(`#${fieldId}`);
                    }
                }
            }
        },
        error:function(error){
            console.log(error)
        }
    })
}

const implementPermission = (actionId) => {
    if ($('#accessCheck').val() == 401){
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
        $(`.${actionId}`).hide()
    }
}
