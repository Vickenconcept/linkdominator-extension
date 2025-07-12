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
                                <th>Export</th>
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
`;

$('body').append(manageAudienceList);

const getAudienceNameList = async () => {
    var displayList = '';
    var publicId = $('#me-publicIdentifier').val();
    
    console.log('🔍 Fetching audiences for LinkedIn ID:', publicId);
    console.log('🌐 API URL:', `${filterApi}/audience?linkedinId=${publicId}`);

    // Show loading state
    $('#audience-name-list').empty();
    $('#audience-name-list').html('<center><i class="fas fa-spinner fa-spin"></i> Loading audiences...</center>');

    await $.ajax({
        method: 'get',
        url: `${filterApi}/audience?linkedinId=${publicId}`,
        timeout: 10000, // 10 second timeout
        success: function(data){
            console.log('✅ API Response:', data);
            console.log('📋 Data type:', typeof data);
            console.log('📋 Data keys:', Object.keys(data));
            console.log('📋 Has audience property:', data.hasOwnProperty('audience'));
            console.log('📋 Audience length:', data.audience ? data.audience.length : 'undefined');
            
            if(data && data.audience && data.audience.length > 0){
                var audienceInfo = data.audience;
                console.log('📊 Audience data:', audienceInfo);

                $('#pager-audience-list').pagination({
                    dataSource: audienceInfo,
                    className: 'paginationjs-theme-blue',
                    pageSize: 5,
                    callback: function(audienceInfo, pagination) {
                        $('#audience-name-list').empty()

                        $.each(audienceInfo, function(i,item){
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
                                            <span class="juez-tooltiptext">View users</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="juez-tooltip">
                                            <i class="fas fa-download cursorr export-audience"
                                            data-audid="${item.audience_id}"></i>
                                            <span class="juez-tooltiptext">Export</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="juez-tooltip">
                                            <i class="far fa-trash-alt cursorr delete-audience"
                                                data-audid="${item.audience_id}"
                                                data-rowid="${item.id}"></i>
                                            <span class="juez-tooltiptext">Delete</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                            $('#audience-name-list').append(displayList)
                        })
                    }
                })
            }else{
                $('#audience-name-list').empty()
                displayList = `
                    <center> 
                        <div style="color: #666; margin: 20px 0;">
                            <i class="fas fa-info-circle"></i> No audience available
                        </div>
                        <div style="font-size: 12px; color: #999;">
                            Create your first audience to get started
                        </div>
                    </center>
                `
                $('#audience-name-list').append(displayList)
            }
        },
        error: function(xhr, status, error){
            console.error('❌ API Error:', {
                status: status,
                error: error,
                response: xhr.responseText,
                statusCode: xhr.status
            });
            
            $('#audience-name-list').empty();
            
            let errorMessage = 'Failed to load audiences';
            if (xhr.status === 0) {
                errorMessage = 'Network error - Check your internet connection';
            } else if (xhr.status === 404) {
                errorMessage = 'API endpoint not found';
            } else if (xhr.status === 500) {
                errorMessage = 'Server error - Backend issue (Contact support)';
            } else if (xhr.status === 401) {
                errorMessage = 'Unauthorized - Check authentication';
            } else if (xhr.status === 403) {
                errorMessage = 'Forbidden - Access denied';
            } else if (xhr.status >= 500) {
                errorMessage = 'Server error - Backend is down';
            }
            
            displayList = `
                <center> 
                    <div style="color: #dc3545; margin: 20px 0;">
                        <i class="fas fa-exclamation-triangle"></i> ${errorMessage}
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        Status: ${xhr.status} | Error: ${error}
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2 retry-audience-list">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </center>
            `;
            $('#audience-name-list').append(displayList);
        }
    })
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

    $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list?audienceId=${audience_id}`,
        success: function(data){
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
                $('#audience-user-list').empty()
                $('#audience-user-list').html('No data available!')
            }
        },
        error: function(error){
            console.log(error)
        }
    })

    $('#manageAudienceList').modal('hide')
    $('#audienceUserList').modal({backdrop:'static', keyboard:false, show:true})
})

$('body').on('click','.delete-user',function(){
    var rowId = $(this).data('rowid');

    $.ajax({
        method: 'delete',
        url: `${filterApi}/audience/list?rowId=${rowId}`,
        success: function(data){
            if(data.message == 'Deleted successfully'){
                $('.user-list'+rowId).find('td').fadeOut(1000,function(){ 
                    $('.user-list'+rowId).remove();                    
                }); 
            }
        },
        error: function(error){
            console.log(error)
        }
    })
})

$('body').on('click','.delete-audience',function(){
    var audienceId = $(this).data('audid');
    var rowId = $(this).data('rowid');

    $.ajax({
        method: 'delete',
        url: `${filterApi}/audience?audienceId=${audienceId}`,
        success: function(data){
            if(data.message == 'Deleted successfully'){
                $('.audience-list'+rowId).find('td').fadeOut(1000,function(){ 
                    $('.audience-list'+rowId).remove();                    
                }); 
            }
        },
        error: function(error){
            console.log(error)
        }
    })
})

$('body').on('click','.export-audience',function(){
    var audienceId = $(this).data('audid');
    const date = new Date();
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const mtn = date.getMinutes();
    const fileName =  `contact_data_${d}${m}${y}${mtn}.csv`;

    $.ajax({
        method: 'get',
        url: `${filterApi}/audience/list/export?audienceId=${audienceId}`,
        success: function(data){
            if(data && data.audience && data.audience.length > 0){
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
            }
        },
        error: function(error){
            console.log(error)
        }
    })
})

// Add retry button handler
$('body').on('click','.retry-audience-list',function(){
    console.log('🔄 Retrying audience list...');
    getAudienceNameList();
})

const formatDate = (date) => {
    let d = new Date(date);
    let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d);
    let mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d);
    let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d);
    let newDate = `${da}-${mo}-${ye}`;

    return newDate
}

