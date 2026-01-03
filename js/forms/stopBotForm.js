var stopBotList = `
<div class="modal" id="stopBotList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Stop Bot</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Automation</th>
                                <th>Status</th>
                                <th>Total</th>
                                <th>Current action</th>
                                <th>Manage</th>
                                <th>Time remaning</th>
                            </tr>
                        </thead>
                        <tbody id="automation-list"></tbody>
                    </table>
                    <span class="mb-3" id="no-job"><center>No automation found!</center></span>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(stopBotList);

// Global function to close all open modals
if (typeof window.closeAllModals === 'undefined') {
    window.closeAllModals = function() {
        $('.modal.show').modal('hide');
        $('.modal.in').modal('hide');
        // Also handle Bootstrap 4+ style
        $('.modal').each(function() {
            if ($(this).hasClass('show')) {
                $(this).modal('hide');
            }
        });
    };
}

$('body').on('click','#stop-bot',function(){
    if (typeof window.closeAllModals === 'function') {
        window.closeAllModals();
    }
    // Small delay to ensure previous modal closes before opening new one
    setTimeout(function() {
    $('#stopBotList').modal({backdrop:'static', keyboard:false, show:true});
    }, 300);
})
