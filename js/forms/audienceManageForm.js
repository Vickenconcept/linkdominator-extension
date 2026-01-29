var manageAudienceList = `
<div class="modal" id="manageAudienceList">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Manage Audience</h5>
                <button type="button" class="close close-manage-aud" >&times;</button>
            </div>
            <div class="modal-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Audience name</th>
                                <th>Contacts</th>
                                <th>Add</th>
                                <th>View</th>
                                <th>Export CSV</th>
                                <th id="espExportHeader" style="display: none;">Export to ESP</th>
                                <th>
                                    <div class="juez-tooltip">
                                        <i class="far fa-plus-square fa-lg cursorr openAudienceForm"></i>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody id="audience-name-list"></tbody>
                    </table>
                </div>
                <div id="pager-audience-list"></div>
            </div>
        </div>
    </div>
</div>

<!-- Custom Delete Confirmation Modal -->
<div class="modal fade" id="deleteConfirmationModal" tabindex="-1" role="dialog" aria-labelledby="deleteConfirmationModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-danger text-white border-0">
                <h5 class="modal-title" id="deleteConfirmationModalLabel">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Confirm Deletion
                </h5>
                <button type="button" class="btn-close btn-close-white" data-dismiss="modal" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body text-center py-4">
                <div class="mb-4">
                    <i class="fas fa-trash-alt text-danger" style="font-size: 3rem;"></i>
                </div>
                <h6 class="mb-3">Are you sure you want to delete this item?</h6>
                <p class="text-muted mb-0" id="deleteItemName"></p>
                <div class="alert alert-warning mt-3" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Warning:</strong> This action cannot be undone.
                </div>
            </div>
            <div class="modal-footer border-0 justify-content-center">
                <button type="button" class="btn btn-secondary px-4" data-dismiss="modal">
                    <i class="fas fa-times me-2"></i>Cancel
                </button>
                <button type="button" class="btn btn-danger px-4" id="confirmDeleteBtn">
                    <i class="fas fa-trash me-2"></i>Delete
                </button>
            </div>
        </div>
    </div>
</div>

<!-- ESP Selection Modal -->
<div class="modal fade" id="espSelectionModal" tabindex="-1" role="dialog" aria-labelledby="espSelectionModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header" style="background: linear-gradient(135deg, #0077b5 0%, #005885 100%); color: white; border-0">
                <h5 class="modal-title" id="espSelectionModalLabel">
                    <i class="fas fa-paper-plane me-2"></i>
                    Export to Email Service Provider
                </h5>
                <button type="button" class="btn-close btn-close-white" data-dismiss="modal" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body py-4">
                <p class="text-muted mb-4">Select an email service provider to export your audience:</p>
                <div id="espOptionsList" class="list-group">
                    <!-- ESP options will be populated here -->
                </div>
                <div id="noEspConfigured" class="alert alert-info mt-3" style="display: none;">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>No ESP configured.</strong> Please configure an email service provider in your <a href="/profile" target="_blank" style="text-decoration: underline;">profile settings</a> first.
                </div>
            </div>
            <div class="modal-footer border-0">
                <button type="button" class="btn btn-secondary px-4" data-dismiss="modal">
                    <i class="fas fa-times me-2"></i>Cancel
                </button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(manageAudienceList);

// Global variables to store configured ESPs (accessible across files)
window.configuredEspList = [];
window.hasEspConfig = false;

// Function to fetch ESP configuration (globally accessible)
window.fetchEspConfig = async () => {
    try {
        const linkedinId = (typeof window.getLinkedInIdForApi === 'function' 
            ? window.getLinkedInIdForApi() 
            : (typeof linkedinId !== 'undefined' ? linkedinId : $('#me-publicIdentifier').val()));
        
        const response = await $.ajax({
            method: 'GET',
            url: `${filterApi}/esp/config`,
            headers: {
                'ngrok-skip-browser-warning': 'true',
                'lk-id': linkedinId || ''
            }
        });
        
        if (response && response.status === 200 && response.data) {
            window.configuredEspList = response.data.esps || [];
            window.hasEspConfig = response.data.has_config || false;
            
            return { success: true, esps: window.configuredEspList, hasConfig: window.hasEspConfig };
        } else {
            console.warn('⚠️ [EXTENSION] Invalid ESP config response', response);
            window.configuredEspList = [];
            window.hasEspConfig = false;
            return { success: false, esps: [], hasConfig: false };
        }
    } catch (error) {
        console.error('❌ [EXTENSION] Failed to fetch ESP config', error);
        window.configuredEspList = [];
        window.hasEspConfig = false;
        return { success: false, esps: [], hasConfig: false };
    }
};

// Add custom styles for the delete confirmation modal
const customStyles = `
<style>
#deleteConfirmationModal .modal-content {
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

#deleteConfirmationModal .modal-header {
    border-radius: 15px 15px 0 0;
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
}

#deleteConfirmationModal .modal-body {
    padding: 2rem;
}

#deleteConfirmationModal .btn {
    border-radius: 8px;
    font-weight: 600;
    padding: 10px 24px;
    transition: all 0.3s ease;
}

#deleteConfirmationModal .btn-danger {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    border: none;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
}

#deleteConfirmationModal .btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
}

#deleteConfirmationModal .btn-secondary {
    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
    border: none;
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
}

#deleteConfirmationModal .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
}

#deleteConfirmationModal .alert-warning {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border: 1px solid #ffeaa7;
    border-radius: 8px;
}

.alert-danger.position-fixed {
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
`;

$('head').append(customStyles);

// Add click handlers for modal close buttons
$('body').on('click', '[data-dismiss="modal"]', function() {
    $(this).closest('.modal').modal('hide');
});

// Close modal when clicking outside or pressing ESC
$('#deleteConfirmationModal').on('click', function(e) {
    if (e.target === this) {
        $(this).modal('hide');
    }
});

$(document).on('keydown', function(e) {
    if (e.key === 'Escape' && $('#deleteConfirmationModal').hasClass('show')) {
        $('#deleteConfirmationModal').modal('hide');
    }
});

const getAudienceNameList = async () => {
    var displayList = '';
    console.log('🔍 getAudienceNameList called...');

    // Show loading state
    $('#audience-name-list').empty();
    $('#audience-name-list').html('<center><i class="fas fa-spinner fa-spin"></i> Loading audiences...</center>');

    try {
        // Use the unified audience fetching function
        const response = await fetchAudiencesFromAPI();
            
        let audienceInfo = [];
        
        // Handle the response structure consistently
        if (response && response.success && response.data && response.data.audience) {
            audienceInfo = response.data.audience;
        }
        // Handle enhanced apiRequest response format  
        else if (response && response.data && response.data.audience) {
            audienceInfo = response.data.audience;
        }
        // Fallback for old format
        else if (Array.isArray(response.audience)) {
            audienceInfo = response.audience;
        }
        

        if (audienceInfo && audienceInfo.length > 0) {
                        $('#pager-audience-list').pagination({
                            dataSource: audienceInfo,
                            className: 'paginationjs-theme-blue',
                            pageSize: 5,
                            callback: function(audienceInfo, pagination) {
                                $('#audience-name-list').empty()

                                $.each(audienceInfo, function(i,item){
                                    // Conditionally show ESP export column
                                    const espExportColumn = window.hasEspConfig ? `
                                            <td>
                                                <div class="juez-tooltip">
                                        <i class="fas fa-paper-plane export-esp cursorr" 
                                            data-audid="${item.audience_id}" 
                                            data-name="${item.audience_name}"></i>
                                        <span class="juez-tooltiptext">Export to ESP</span>
                                                </div>
                                            </td>` : '';
                                    
                                    displayList = `
                                        <tr class="audience-list${item.id}">
                                            <td>${item.audience_name}</td>
                                            <td>${item.total}</td>
                                            <td>
                                                <div class="juez-tooltip">
                                                    <i class="fas fa-user-plus add-more-users cursorr" 
                                                        data-audid ="${item.audience_id}" 
                                                        data-name="${item.audience_name}"></i>
                                                    <span class="juez-tooltiptext">Add more users</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="juez-tooltip">
                                                    <i class="fas fa-eye cursorr get-audience-list" 
                                                        data-name="${item.audience_name}"
                                                        data-audid="${item.audience_id}"></i>
                                        <span class="juez-tooltiptext">View audience</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div class="juez-tooltip">
                                        <i class="fas fa-download export-audience cursorr" 
                                            data-audid="${item.audience_id}" 
                                            data-name="${item.audience_name}"></i>
                                        <span class="juez-tooltiptext">Export CSV</span>
                                                </div>
                                            </td>
                                            ${espExportColumn}
                                            <td>
                                                <div class="juez-tooltip">
                                        <i class="fas fa-trash cursorr delete-audience" 
                                                        data-audid="${item.audience_id}"
                                            data-name="${item.audience_name}"
                                            data-rowid="${item.id}"></i>
                                        <span class="juez-tooltiptext">Delete audience</span>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                        $('#audience-name-list').append(displayList);
                    });
                            }
            });
        } else {
            const colspan = window.hasEspConfig ? 7 : 6;
            $('#audience-name-list').html(`<tr><td colspan="${colspan}" class="text-center">No audiences found. Create your first audience!</td></tr>`);
            console.log('ℹ️ No audiences found for this user');
                }
        
    } catch (error) {
        console.error('❌ Error in getAudienceNameList:', error);
        
        let errorMessage = error.message || 'Failed to load audiences. Please try again.';
        
        // Provide helpful message for ngrok errors
        if (errorMessage === 'ngrok_warning_page' || errorMessage.includes('ngrok') || errorMessage.includes('DOCTYPE html')) {
            errorMessage = 'ngrok is blocking API requests. Solutions:\n1. Add "ngrok-skip-browser-warning: true" header (already added)\n2. Upgrade ngrok plan\n3. Use ngrok with --host-header flag\n4. Use a different tunneling solution';
        }
        
        // Show error message to user
        $('#audience-name-list').html(`
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i> 
                    ${errorMessage}
                    <br><small>Check console for details</small>
                </td>
            </tr>
        `);
    }
}

$('body').on('click','.add-more-users',function(){
    $('#audience-name').val($(this).data('name'))
    $('#manageAudienceList').modal('hide')
    $('#afs-connSecondCheck').prop('checked', true);
    $('#audienceCreationForm').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.close-manage-aud',function(){
    $('#manageAudienceList').modal('hide')
    $('#audienceMenu').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.get-audience-list', function(){
    var audience_name = $(this).data('name');
    var audience_id = $(this).data('audid');
    var displayList = '';

    console.log('🔍 Viewing audience list:', {
        audience_name: audience_name,
        audience_id: audience_id,
        audience_id_type: typeof audience_id,
        api_url: `${filterApi}/audience/list?audienceId=${audience_id}`
    });

    // Use apiRequest if available (handles ngrok bypass), otherwise fallback to jQuery
    if (typeof apiRequest !== 'undefined') {
        console.log('✅ Using enhanced apiRequest for audience list');
        apiRequest(`${filterApi}/audience/list?audienceId=${audience_id}`, {
            method: 'GET'
        })
        .then(function(response) {
            const data = response.data || response;
            handleAudienceListResponse(data, audience_name);
        })
        .catch(function(error) {
            console.error('❌ Error fetching audience list:', error);
            let errorMessage = 'Failed to load audience list. ';
            if (error.message === 'ngrok_warning_page' || error.message?.includes('ngrok')) {
                errorMessage += 'ngrok is blocking the request. Please check your ngrok configuration.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }
            $('#audience-user-list').empty()
            $('#audience-user-list').html(`<tr><td colspan="7" class="text-center text-danger">${errorMessage}</td></tr>`)
        });
    } else {
        // Fallback to jQuery AJAX
        $.ajax({
            method: 'get',
            dataType: 'json',
            headers: {
                'lk-id': (typeof window.getLinkedInIdForApi === 'function' ? window.getLinkedInIdForApi() : (linkedinId || window.linkedinId || $('#me-publicIdentifier').val())),
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-Requested-With': 'XMLHttpRequest'
            },
            url: `${filterApi}/audience/list?audienceId=${audience_id}`,
            success: function(data){
                handleAudienceListResponse(data, audience_name);
            },
            error: function(xhr, status, error) {
                console.error('❌ Error fetching audience list:', {
                    status: status,
                    error: error,
                    statusCode: xhr.status,
                    responseText: xhr.responseText.substring(0, 200)
                });
                
                let errorMessage = 'Failed to load audience list. ';
                if (xhr.status === 0) {
                    errorMessage += 'Network error or ngrok connection issue.';
                } else if (xhr.status >= 500) {
                    errorMessage += 'Server error. Please try again later.';
                } else {
                    errorMessage += 'Please check your connection and try again.';
                }
                
                $('#audience-user-list').empty()
                $('#audience-user-list').html(`<tr><td colspan="7" class="text-center text-danger">${errorMessage}</td></tr>`)
            }
        });
    }

    // Helper function to handle audience list response
    function handleAudienceListResponse(data, audience_name) {
        // Check if response is HTML (error page) instead of JSON
        if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE')) {
            console.error('❌ Received HTML instead of JSON response. This might be an ngrok warning page or error page.');
            $('#audience-user-list').empty()
            $('#audience-user-list').html('<tr><td colspan="7" class="text-center text-danger">Error: Received invalid response from server. Please check your ngrok configuration or try again.</td></tr>')
            return;
        }

        console.log('✅ Audience list response:', {
            has_data: !!data,
            has_audience: !!(data && data.audience),
            audience_length: data && data.audience ? data.audience.length : 0,
            full_response: data
        });
        
        if(data && data.audience && data.audience.length > 0){
            $('.user-list-name').html(audience_name)
            var userInfo = data.audience;

            $('#pager-user-list').pagination({
                dataSource: userInfo,
                className: 'paginationjs-theme-blue',
                pageSize: 5,
                callback: function(userInfo, pagination) {
                    $('#audience-user-list').empty()
                    
                    $.each(userInfo, function(i,item){
                        let distance = item.con_distance == null ? '' : item.con_distance.split('_')[1];
                        if(distance == '1')
                            distance = '1st';
                        else if(distance == '2')
                            distance = '2nd';
                        else
                            distance = '3rd';

                        displayList = `
                            <tr class="user-list${item.id}" >
                                <td>${item.con_first_name}</td>
                                <td>${item.con_last_name}</td>
                                <td title="${item.con_job_title}">
                                    ${item.con_job_title != null ? (item.con_job_title).replace(/(.{24})..+/, "$1…") : ''}
                                </td>
                                <td title="${item.con_location}">
                                    ${item.con_location != null ? (item.con_location).replace(/(.{15})..+/, "$1…") : ''}
                                </td>
                                <td>${formatDate(item.created_at)}</td>
                                <td>${distance}</td>
                                <td>
                                    <a href="https://www.linkedin.com/in/${item.con_public_identifier}" target="_blank">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>&nbsp;
                                    <i class="far fa-trash-alt cursorr delete-user" data-rowid="${item.id}"></i>
                                </td>
                            </tr>
                        `;
                        $('#audience-user-list').append(displayList)
                    })
                }
            })
        }else{
            console.warn('⚠️ No users found in audience list', {
                audience_id: audience_id,
                response: data
            });
            $('#audience-user-list').empty()
            $('#audience-user-list').html('<tr><td colspan="7" class="text-center">No users found in this audience</td></tr>')
        }
    }

    $('#manageAudienceList').modal('hide')
    $('#audienceUserList').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.delete-user',function(){
    var rowId = $(this).data('rowid');
    var $deleteBtn = $(this);
    
    console.log('🗑️ Deleting user from audience:', { rowId });

    // Show custom confirmation modal
    $('#deleteItemName').text('this user from the audience');
    $('#deleteConfirmationModal').modal('show');

    // Handle confirmation
    $('#confirmDeleteBtn').off('click.deleteUser').on('click.deleteUser', function() {
        // Disable the delete button to prevent double-clicks
        $deleteBtn.prop('disabled', true).addClass('disabled');
        
        // Hide the modal
        $('#deleteConfirmationModal').modal('hide');

        $.ajax({
            method: 'delete',
            url: `${filterApi}/audience/list?rowId=${rowId}`,
            success: function(data){
                console.log('✅ Delete user response:', data);
                if(data.message == 'Deleted successfully'){
                    // Find and remove the row
                    var $row = $('.user-list'+rowId);
                    if ($row.length > 0) {
                        $row.find('td').fadeOut(1000, function(){ 
                            $row.remove();
                            console.log('✅ User row removed from UI');
                            
                            // Check if no more rows exist
                            if ($('#audience-user-list tr').length === 0) {
                                $('#audience-user-list').html('<tr><td colspan="7" class="text-center">No users found in this audience!</td></tr>');
                            }
                        }); 
                    } else {
                        console.warn('⚠️ User row not found in DOM');
                    }
                } else {
                    console.error('❌ Delete user failed:', data.message);
                    showErrorAlert('Failed to delete user: ' + (data.message || 'Unknown error'));
                }
            },
            error: function(error){
                console.error('❌ Delete user request failed:', error);
                showErrorAlert('Failed to delete user. Please try again.');
            },
            complete: function() {
                // Re-enable the delete button
                $deleteBtn.prop('disabled', false).removeClass('disabled');
            }
        });
    });
})

$('body').on('click','.delete-audience',function(){
    var audienceId = $(this).data('audid');
    var rowId = $(this).data('rowid');
    var audienceName = $(this).data('name');
    var $deleteBtn = $(this);
    
    console.log('🗑️ Deleting audience:', { audienceId, rowId, audienceName });

    // Show custom confirmation modal
    $('#deleteItemName').text(`"${audienceName}"`);
    $('#deleteConfirmationModal').modal('show');

    // Handle confirmation
    $('#confirmDeleteBtn').off('click.deleteAudience').on('click.deleteAudience', function() {
        // Disable the delete button to prevent double-clicks
        $deleteBtn.prop('disabled', true).addClass('disabled');
        
        // Hide the modal
        $('#deleteConfirmationModal').modal('hide');

        $.ajax({
            method: 'delete',
            url: `${filterApi}/audience?audienceId=${audienceId}`,
            success: function(data){
                console.log('✅ Delete response:', data);
                if(data.message == 'Deleted successfully'){
                    // Find and remove the row
                    var $row = $('.audience-list'+rowId);
                    if ($row.length > 0) {
                        $row.find('td').fadeOut(1000, function(){ 
                            $row.remove();
                            console.log('✅ Row removed from UI');
                            
                            // Check if no more rows exist
                            if ($('#audience-name-list tr').length === 0) {
                                const colspan = window.hasEspConfig ? 7 : 6;
            $('#audience-name-list').html(`<tr><td colspan="${colspan}" class="text-center">No audiences found. Create your first audience!</td></tr>`);
                            }
                        }); 
                    } else {
                        console.warn('⚠️ Row not found in DOM, refreshing list...');
                        getAudienceNameList(); // Refresh the list
                    }
                } else {
                    console.error('❌ Delete failed:', data.message);
                    showErrorAlert('Failed to delete audience: ' + (data.message || 'Unknown error'));
                }
            },
            error: function(error){
                console.error('❌ Delete request failed:', error);
                showErrorAlert('Failed to delete audience. Please try again.');
            },
            complete: function() {
                // Re-enable the delete button
                $deleteBtn.prop('disabled', false).removeClass('disabled');
            }
        });
    });
})

$('body').on('click','.export-audience',function(){
    var audienceId = $(this).data('audid');
    const audienceName = $(this).data('name') || 'Unknown';
    
    console.log('📤 [EXTENSION] Export button clicked', {
        audienceId: audienceId,
        audienceName: audienceName,
        timestamp: new Date().toISOString()
    });
    
    const date = new Date();
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const mtn = date.getMinutes();
    const fileName =  `contact_data_${d}${m}${y}${mtn}.csv`;
    
    const exportUrl = `${filterApi}/audience/list/export?audienceId=${audienceId}`;
    console.log('📡 [EXTENSION] Making export request', {
        url: exportUrl,
        method: 'GET',
        audienceId: audienceId
    });

    $.ajax({
        method: 'get',
        url: exportUrl,
        headers: {
            'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning page
        },
        success: function(data){
            console.log('✅ [EXTENSION] Export response received', {
                hasData: !!data,
                hasAudience: !!(data && data.audience),
                audienceLength: data && data.audience ? data.audience.length : 0,
                audienceId: audienceId
            });
            
            if(data && data.audience && data.audience.length > 0){
                console.log('📊 [EXTENSION] Processing CSV export', {
                    recordCount: data.audience.length,
                    fileName: fileName,
                    headers: Object.keys(data.audience[0])
                });
                
                const csvRows = [];
                const headers = Object.keys(data.audience[0]);
                csvRows.push(headers.join(','));

                for (const row of data.audience) {
                    const values = headers.map(header => {
                        const val = row[header]
                        return `"${val}"`;
                    });
            
                    // To add, sepearater between each value
                    csvRows.push(values.join(','));
                }
                const download = csvRows.join('\n');
            
                var blob = new Blob([download]);
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
                
                console.log('💾 [EXTENSION] CSV file download initiated', {
                    fileName: fileName,
                    blobSize: blob.size,
                    recordCount: data.audience.length
                });
            } else {
                console.warn('⚠️ [EXTENSION] Export response has no data', {
                    data: data,
                    audienceId: audienceId
                });
                alert('No data available to export for this audience.');
            }
        },
        error: function(xhr, status, error){
            console.error('❌ [EXTENSION] Export request failed', {
                status: status,
                error: error,
                statusCode: xhr.status,
                responseText: xhr.responseText,
                audienceId: audienceId,
                url: exportUrl
            });
            alert('Failed to export audience data. Please check the console for details.');
        }
    })
})

// ESP Export handler
$('body').on('click','.export-esp',async function(){
    var audienceId = $(this).data('audid');
    const audienceName = $(this).data('name') || 'Unknown';
    
    // Refresh ESP config before showing modal
    const espConfig = await window.fetchEspConfig();
    
    if (!espConfig.hasConfig || window.configuredEspList.length === 0) {
        alert('No email service providers configured. Please configure an ESP in your profile settings first.');
        return;
    }
    
    // Store current audience ID for the modal
    $('#espSelectionModal').data('audience-id', audienceId);
    $('#espSelectionModal').data('audience-name', audienceName);
    
    // Populate ESP options in modal
    const espOptionsList = $('#espOptionsList');
    espOptionsList.empty();
    
    configuredEspList.forEach((esp) => {
        const espOption = $(`
            <a href="#" class="list-group-item list-group-item-action esp-option" data-esp-type="${esp.type}">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <h6 class="mb-1">
                        <i class="fas fa-paper-plane me-2" style="color: #0077b5;"></i>
                        ${esp.name}
                    </h6>
                </div>
            </a>
        `);
        espOptionsList.append(espOption);
    });
    
    // Show modal
    $('#espSelectionModal').modal({backdrop: 'static', keyboard: false, show: true});
})

// Handle ESP selection from modal
$('body').on('click', '.esp-option', function(e) {
    e.preventDefault();
    const selectedEspType = $(this).data('esp-type');
    const audienceId = $('#espSelectionModal').data('audience-id');
    const audienceName = $('#espSelectionModal').data('audience-name');
    const selectedEspName = window.configuredEspList.find(e => e.type === selectedEspType)?.name || selectedEspType;
    
    // Close modal
    $('#espSelectionModal').modal('hide');
    
    // Show loading indicator
    const loadingMsg = $(`
        <div style="position: fixed; top: 20px; right: 20px; z-index: 99999; min-width: 300px; background: white; border-left: 4px solid #0077b5; padding: 15px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 4px;">
            <i class="fas fa-spinner fa-spin me-2" style="color: #0077b5;"></i>
            <span style="color: #333; font-weight: 500;">Exporting to ${selectedEspName}...</span>
        </div>
    `);
    $('body').append(loadingMsg);
    
    // Get LinkedIn ID for authorization
    const linkedinId = (typeof window.getLinkedInIdForApi === 'function' 
        ? window.getLinkedInIdForApi() 
        : (typeof linkedinId !== 'undefined' ? linkedinId : $('#me-publicIdentifier').val()));
    
    $.ajax({
        method: 'POST',
        url: `${filterApi}/audiences/export/${audienceId}`,
        headers: {
            'ngrok-skip-browser-warning': 'true',
            'lk-id': linkedinId || ''
        },
        data: {
            type: 'esp',
            espType: selectedEspType
        },
        success: function(response){
            loadingMsg.remove();
            
            if (response && response.status === 200) {
                const message = response.message || `Successfully exported to ${selectedEspName}`;
                const sharedCount = response.data && response.data.shared_count ? response.data.shared_count : 'N/A';
                const skippedCount = response.data && response.data.skipped_count ? response.data.skipped_count : 'N/A';
                
                const successMsg = $(`
                    <div style="position: fixed; top: 20px; right: 20px; z-index: 99999; min-width: 300px; background: white; border-left: 4px solid #28a745; padding: 15px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 4px;">
                        <i class="fas fa-check-circle me-2" style="color: #28a745;"></i>
                        <strong style="color: #333;">Success!</strong><br>
                        <span style="color: #333;">${message}</span><br>
                        <small style="color: #666;">Shared: ${sharedCount} leads | Skipped: ${skippedCount} leads</small>
                    </div>
                `);
                $('body').append(successMsg);
                setTimeout(() => successMsg.fadeOut(500, () => successMsg.remove()), 5000);
            } else {
                alert('Export completed. Check console for details.');
            }
        },
        error: function(xhr, status, error){
            loadingMsg.remove();
            
            console.error('❌ [EXTENSION] ESP Export request failed', {
                status: status,
                error: error,
                statusCode: xhr.status,
                responseText: xhr.responseText,
                audienceId: audienceId,
                espType: selectedEspType
            });
            
            let errorMessage = 'Failed to export to ESP. ';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            } else if (xhr.status === 400) {
                errorMessage = 'Please configure this ESP in your profile settings first.';
            } else if (xhr.status === 401) {
                errorMessage = 'Authentication failed. Please refresh the page.';
            } else {
                errorMessage = 'An error occurred. Please check the console for details.';
            }
            
            const errorMsg = $(`
                <div style="position: fixed; top: 20px; right: 20px; z-index: 99999; min-width: 300px; background: white; border-left: 4px solid #dc3545; padding: 15px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 4px;">
                    <i class="fas fa-exclamation-circle me-2" style="color: #dc3545;"></i>
                    <strong style="color: #333;">Error:</strong><br>
                    <span style="color: #333;">${errorMessage}</span>
                </div>
            `);
            $('body').append(errorMsg);
            setTimeout(() => errorMsg.fadeOut(500, () => errorMsg.remove()), 7000);
        }
    })
})

// Add retry button handler
$('body').on('click','.retry-audience-list',function(){
    console.log('🔄 Retrying audience list...');
    getAudienceNameList();
})

// Custom error alert function
const showErrorAlert = (message) => {
    // Create error alert HTML
    const errorAlert = `
        <div class="alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 99999; min-width: 300px; background: white; border-left: 4px solid #dc3545; padding: 15px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 4px;" 
             role="alert">
            <i class="fas fa-exclamation-circle me-2" style="color: #dc3545;"></i>
            <strong style="color: #333;">Error:</strong> <span style="color: #333;">${message}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="opacity: 0.5;"></button>
        </div>
    `;
    
    // Remove any existing error alerts
    $('.alert-danger.position-fixed').remove();
    
    // Add new error alert
    $('body').append(errorAlert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        $('.alert-danger.position-fixed').fadeOut(500, function() {
            $(this).remove();
        });
    }, 5000);
}

const formatDate = (date) => {
    let d = new Date(date);
    let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d);
    let mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d);
    let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d);
    let newDate = `${da}-${mo}-${ye}`;

    return newDate
}

