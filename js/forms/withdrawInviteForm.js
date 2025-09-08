
var withdrawInviteForm = `
<div class="modal" id="withdrawInviteForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Withdraw Sent Invite</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row withdraw-invite" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayWithdrawStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="wsi-period" class="font-weight-bold" style="color:black;">Withdraw invitation older than (Days)</label>
                    <input type="number" class="form-control shadow-none" id="wsi-period" data-name="Withdraw invitation" placeholder="Enter number of days. Ex: 10">
                </div>
                <div class="row mt-2">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="wsi-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="wsi-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="wsi-totalFollow" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of people you want to follow.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" data-name="Total" id="wsi-totalFollow" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="wsi-delayFollowTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each follow in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" data-name="Delay" id="wsi-delayFollowTime" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="wsi-error-notice" style="color:red"></span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none withdrawInviteAction">Start</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(withdrawInviteForm);
$('#withdraw-invite-menu-click').click(function(){
    implementPermission('withdrawInviteAction')
    $('#withdrawInviteForm').modal({backdrop:'static', keyboard:false, show:true});
})