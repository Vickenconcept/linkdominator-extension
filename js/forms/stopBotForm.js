var stopBotList = `
<div class="modal" id="stopBotList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Stop Bot</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h6 class="mb-0" style="color: #333; font-weight: 600;">
                        <i class="fas fa-robot me-2" style="color: #ef4444;"></i>
                        Active Automations
                    </h6>
                </div>
                <div class="table-responsive" style="border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.08);">
                    <table class="table table-hover mb-0" id="modern-automation-table">
                        <thead style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                            <tr>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2);">
                                    <i class="fas fa-cog me-2"></i>Automation
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-info-circle me-2"></i>Status
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-list-ol me-2"></i>Total
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-tasks me-2"></i>Progress
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-clock me-2"></i>Time Remaining
                                </th>
                                <th style="padding: 16px; font-weight: 600; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.2); text-align: center;">
                                    <i class="fas fa-stop-circle me-2"></i>Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody id="automation-list" style="background: #fff;"></tbody>
                    </table>
                </div>
                <div id="no-job" class="mt-4" style="display: none; text-align: center; padding: 60px 20px;">
                        <div style="text-align: center;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">
                                <i class="fas fa-robot" style="font-size: 32px; color: #ef4444;"></i>
                            </div>
                        <h6 style="color: #333; font-weight: 600; margin-bottom: 8px;">No automation found</h6>
                        <p style="color: #6c757d; margin-bottom: 20px; font-size: 14px;">Start an automation to see it here</p>
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

$('body').append(stopBotList);

// Add custom styles for modern automation table
const automationTableStyles = `
<style>
/* Modern Automation Table Styles */
#modern-automation-table tbody tr {
    transition: all 0.3s ease;
}

#modern-automation-table tbody tr:hover {
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 119, 181, 0.08);
}

#modern-automation-table .cursorr {
    transition: all 0.3s ease;
    cursor: pointer;
}

#modern-automation-table .cursorr:hover {
    transform: scale(1.2);
    opacity: 0.8;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    #modern-automation-table tbody td {
        padding: 12px 8px !important;
        font-size: 12px;
    }
}
</style>
`;

if (!$('#automation-table-styles').length) {
    $('head').append(automationTableStyles.replace('<style>', '<style id="automation-table-styles">'));
}

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
