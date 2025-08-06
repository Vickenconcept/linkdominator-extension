var viewConnectionsForm = `
<div class="modal" id="viewConnectionsForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">View Connections Profile</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row viewConnect" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayViewConnectionStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                
                <!-- Method Selection Cards -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="card method-card selected" id="vcp-audience-method-card" style="cursor: pointer; border: 2px solid #007bff;">
                            <div class="card-body text-center py-3">
                                <i class="fas fa-users fa-lg mb-2" style="color: #007bff;"></i>
                                <h6 class="mb-0" style="color: #007bff;">Use Existing Audience</h6>
                                <small class="text-muted">Select from saved audiences</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card method-card" id="vcp-search-method-card" style="cursor: pointer; border: 2px solid #dee2e6;">
                            <div class="card-body text-center py-3">
                                <i class="fas fa-search fa-lg mb-2" style="color: #6c757d;"></i>
                                <h6 class="mb-0" style="color: #6c757d;">Use Search Parameters</h6>
                                <small class="text-muted">Search with filters & keywords</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Audience Selection Section -->
                <div id="vcp-audience-section">
                    <div class="form-group">
                        <label for="vcp-audience-select" class="font-weight-bold" style="color:black;">Select an audience</label>
                        <select class="form-control shadow-none select-dropdown" id="vcp-audience-select" style="height: 35px;">
                            <option value="">Select an audience</option>
                        </select>
                    </div>
                </div>

                <!-- Search Parameters Section -->
                <div id="vcp-search-section" style="display: none;">
                    <div class="form-group">
                        <label for="vcp-search-term" class="font-weight-bold" style="color:black;">Search</label>
                        <input type="text" class="form-control shadow-none" id="vcp-search-term" placeholder="Enter your search term">
                    </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseConnectionStage"
                                    style="color:black">
                                    Connections <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseConnectionStage" class="collapse" data-parent="#vcp-accordion">
                                    <div class="card-body vcp-conn-degree">
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="vcp-connFirstCheck" name="first_check" value="F">
                                            <label class="custom-control-label" for="vcp-connFirstCheck">1st</label>
                                        </div>
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="vcp-connSecondCheck" name="second_check" value="S">
                                            <label class="custom-control-label" for="vcp-connSecondCheck">2nd</label>
                                        </div>
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="vcp-connThirdCheck" name="third_check" value="O">
                                            <label class="custom-control-label" for="vcp-connThirdCheck">3rd+</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordionKeywords">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseKeywords"
                                    style="color:black">
                                    Keywords <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseKeywords" class="collapse" data-parent="#vcp-accordionKeywords">
                                    <div class="card-body">
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="vcp-firstName" placeholder="First name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="vcp-lastName" placeholder="Last name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="vcp-title" placeholder="Title">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="vcp-company" placeholder="Company">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="vcp-school" placeholder="School">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion1">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseConnectionOf"
                                    style="color:black">
                                    Connections Of <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseConnectionOf" class="collapse" data-parent="#vcp-accordion1">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-connectionOf" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-searchCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultConnectOf"></ul>
                                            <ul class="list-group" id="vcp-selectedConnectOf"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion2">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseLocation" style="color:black">
                                    Locations<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseLocation" class="collapse" data-parent="#vcp-accordion2">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-location" placeholder="Type location name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-searchLoc" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultLocation"></ul>
                                            <ul class="list-group" id="vcp-selectedLocation"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion3">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseCurrComp" style="color:black">
                                    Current companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseCurrComp" class="collapse" data-parent="#vcp-accordion3">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-currComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-searchCurrComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultCurrComp"></ul>
                                            <ul class="list-group" id="vcp-selectedCurrComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion4">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapsePastComp" style="color:black">
                                    Past companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapsePastComp" class="collapse" data-parent="#vcp-accordion4">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-pastComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-searchPastComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultPastComp"></ul>
                                            <ul class="list-group" id="vcp-selectedPastComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion5">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseIndustry" style="color:black">
                                    Industry<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseIndustry" class="collapse" data-parent="#vcp-accordion5">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-industy" placeholder="Type industy name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-searchIndustry" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultIndustry"></ul>
                                            <ul class="list-group" id="vcp-selectedIndustry"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion6">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseSchool" style="color:black">
                                    School<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseSchool" class="collapse" data-parent="#vcp-accordion6">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-school-search" placeholder="Type school name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-searchSchool" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultSchool"></ul>
                                            <ul class="list-group" id="vcp-selectedSchool"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="vcp-accordion7">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#vcp-collapseLanguage" style="color:black">
                                    Profile Language<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="vcp-collapseLanguage" class="collapse" data-parent="#vcp-accordion7">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="vcp-language" placeholder="Type language name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text vcp-search-lang" id="vcp-search-lang" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="vcp-resultLanguage"></ul>
                                            <ul class="list-group" id="vcp-selectedLanguage"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> <!-- End of vcp-search-section -->
            </div> <!-- End of modal-body content -->
            
            <!-- Common Parameters (completely independent) -->
            <div id="vcp-common-parameters" style="padding: 20px; border-top: 1px solid #dee2e6; background-color: #f8f9fa;">
                <div class="row">
                    <div class="col-md-12">
                        <h6 class="font-weight-bold" style="color:black; border-bottom: 1px solid #dee2e6; padding-bottom: 8px;">
                            <i class="fas fa-cog mr-2"></i>View Settings
                        </h6>
                    </div>
                </div>
                
                <div class="row mt-2">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="vcp-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="vcp-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="vcp-total" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of people you want to view their profile.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="vcp-total" data-name="Total" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="vcp-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each profile view in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="vcp-delayTime" data-name="Delay" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="vcp-error-notice" style="color:red"></span>
                    </div>
                </div>
            </div>
                
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none viewConnetionsAction">View</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(viewConnectionsForm)

// Handle method selection for View Connections Profile
$('#vcp-audience-method-card').click(function(){
    console.log('👁️ View Connections: Audience method selected');
    
    // Update visual styles
    $(this).addClass('selected').css({
        'border': '2px solid #007bff'
    });
    $(this).find('i').css('color', '#007bff');
    $(this).find('h6').css('color', '#007bff');
    
    $('#vcp-search-method-card').removeClass('selected').css({
        'border': '2px solid #dee2e6'
    });
    $('#vcp-search-method-card').find('i').css('color', '#6c757d');
    $('#vcp-search-method-card').find('h6').css('color', '#6c757d');
    
    // Show/hide sections
    $('#vcp-audience-section').show();
    $('#vcp-search-section').hide();
    
    // Clear error messages
    $('#vcp-error-notice').html('');
});

$('#vcp-search-method-card').click(function(){
    console.log('👁️ View Connections: Search method selected');
    
    // Update visual styles
    $(this).addClass('selected').css({
        'border': '2px solid #007bff'
    });
    $(this).find('i').css('color', '#007bff');
    $(this).find('h6').css('color', '#007bff');
    
    $('#vcp-audience-method-card').removeClass('selected').css({
        'border': '2px solid #dee2e6'
    });
    $('#vcp-audience-method-card').find('i').css('color', '#6c757d');
    $('#vcp-audience-method-card').find('h6').css('color', '#6c757d');
    
    // Show/hide sections
    $('#vcp-audience-section').hide();
    $('#vcp-search-section').show();
    
    // Clear error messages
    $('#vcp-error-notice').html('');
});

// Clear error when audience is selected
$('#vcp-audience-select').change(function(){
    if($(this).val() && $(this).val() !== '') {
        $('#vcp-error-notice').html('');
    }
});

$('body').on('click','#view-connection-menu-click',function(){
    implementPermission('viewConnetionsAction')
    $('#vcp-connSecondCheck').prop('checked', true);
    let fieldId = 'vcp-audience-select';
    getAudienceList(fieldId)
    
    // Reset to audience method by default
    $('#vcp-audience-method-card').click();
    
    $('#viewConnectionsForm').modal({backdrop:'static', keyboard:false, show:true})
})