var audienceMenu = `
<div class="modal" id="audienceMenu">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Audience</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row"> 
                    <div class="col-md-6"> 
                        <button class="btn btn-block audience-menu-btn openAudienceForm" id="openAudienceForm">
                            <i class="fas fa-plus"></i> Create a new audience
                        </button>
                    </div>
                    <div class="col-md-6"> 
                        <button class="btn btn-block audience-menu-btn" id="manageAudienceForm">
                            <i class="fas fa-cog"></i> Manage audience
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(audienceMenu)
$('body').on('click', '#audience-creation-menu-click', function(){
    if ($('#accessCheck').val() == 401){
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
    }
    $('.newAudience-notice').hide()
    $('#displayNewAudienceStatus').empty()
    $('#audienceMenu').modal({backdrop:'static', keyboard:false, show:true})
})
$('body').on('click','.openAudienceForm',function(){
    $('#afs-connSecondCheck').prop('checked', true);
    $('#audienceMenu').modal('hide')
    $('#manageAudienceList').modal('hide')
    $('#audience-name').val('')
    $('#audienceCreationForm').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','#manageAudienceForm',function(){
    $('#audienceMenu').modal('hide');
    // Always refresh the audience list when opening manage form
    getAudienceNameList();
    $('#manageAudienceList').modal({backdrop:'static', keyboard:false, show:true});
})