var acceptInviteForm = `
<div class="modal" id="acceptInviteForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Accept Received Invites</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row accept-invite-notice" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayAcceptStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="ari-period" class="font-weight-bold" style="color:black;">Accept invitations older than (Days)</label>
                    <input type="number" class="form-control shadow-none" id="ari-period" data-name="Accept invitation" placeholder="Enter number of days. Ex: 10">
                </div>
                <div class="row mt-2">
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input" id="ari-activate-pm">
                        <label class="custom-control-label font-weight-bold" style="color:black;" for="ari-activate-pm">Send message after accepting</label>
                    </div>
                </div>
                <div id="ari-message-block"> 
                    <div class="row mt-2" style="display: inline-block">
                        <div class="col-md-12">
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ari-pm-btn" data-name="@firstName">@firstName</button>
                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ari-pm-btn" data-name="@lastName">@lastName</button>
                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                            </div>
                            <div class="juez-tooltip">
                                <button type="button" class="btn btn-outline-primary btn-lg ari-pm-btn" data-name="@name">@name</button>
                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                            </div>
                        </div>
                    </div> 
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group mb-0">
                                <textarea class="form-control shadow-none text-area-size" rows="5" id="ari-personalMessage" 
                                    placeholder="Ex: Hi @firstName, i would like to join your network"
                                    maxlength="200"></textarea>
                                <span id="ari-pm-limit">0/200</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="ari-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently invitation.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="ari-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="ari-totalAccept" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of people you want to accept.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" data-name="Total" id="ari-totalAccept" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="ari-delayFollowTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each acceptance in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" data-name="Delay" id="ari-delayFollowTime" placeholder="Ex: 10">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="ari-error-notice" style="color:red"></span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none permit-btn acceptInviteAction">Start</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(acceptInviteForm)
$('#ari-message-block').hide()
$('#accept-invite-menu-click').click(function(){
    implementPermission('acceptInviteAction')
    $('#acceptInviteForm').modal({backdrop:'static', keyboard:false, show:true});
})
$('#ari-activate-pm').change(function(){
    if($(this).prop('checked') == true){
        $('#ari-message-block').show()
    }else{
        $('#ari-message-block').hide()
    }
})
$('.ari-pm-btn').click(function(){
    var pmName = $(this).data('name')
    var pm = $('#ari-personalMessage')
    pm.val(pm.val() + pmName)
})
$('#ari-personalMessage').keyup(function(){
    var lenOfPm = $(this).val().length
    $('#ari-pm-limit').text(`${lenOfPm}/200`)
})

