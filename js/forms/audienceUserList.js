var audienceUserList = `
<div class="modal" id="audienceUserList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title user-list-name">Manager</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>First name</th>
                                <th>Last name</th>
                                <th>Job title</th>
                                <th>Location</th>
                                <th>Date created</th>
                                <th>Distance</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="audience-user-list"></tbody>
                    </table>
                </div>
                <div id="pager-user-list"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" id="close-user-list">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(audienceUserList)
$('body').on('click','#close-user-list',function(){
    $('#audienceUserList').modal('hide')
    $('#manageAudienceList').modal({backdrop:'static', keyboard:false, show:true})
})