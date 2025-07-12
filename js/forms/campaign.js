var campaignList = `
<div class="modal" id="campaignList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Campaigns</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row campaign-notice-elem" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="campaign-notice" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="row"> 
                    <div class="col-12">
                        <div class="table-responsive tbl-fixed">
                            <table class="table campaign-table">
                                <thead>
                                    <tr>
                                        <th scope="col" class="th-fixed">Name</th>
                                        <th scope="col" class="th-fixed">Sequence Type</th>
                                        <th scope="col" class="th-fixed">Status</th>
                                        <th scope="col" class="th-fixed"></th>
                                    </tr>
                                </thead>
                                <tbody id="campaign-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`
$('body').append(campaignList)
$('body').on('click', '#campaign-menu-click', function(){
    if ($('#accessCheck').val() == 401) {
        $('.modal-body').html('<h5><center><strong> UNAUTHORISED </strong></center></h5>')
    }
    $('#campaignList').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('change','.runSwitch',function(ev){
    let campaignId = $(this).data('campaignid')
    let status;
    if(ev.target.checked){
        status = 'running'
    }else{
        status = 'stop'
    }
    updateCampaign({
        campaignId: campaignId,
        status: status
    })
})