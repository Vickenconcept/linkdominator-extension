
var connectionInfoForm = `
<div class="modal" id="connectionInfoForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Get Connections Information</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row getConnectInfo" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayGetConnectInfoStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                
                <!-- Method Selection Cards -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="card method-card selected" id="gci-audience-method-card" style="cursor: pointer; border: 2px solid #007bff;">
                            <div class="card-body text-center py-3">
                                <i class="fas fa-users fa-lg mb-2" style="color: #007bff;"></i>
                                <h6 class="mb-0" style="color: #007bff;">Use Existing Audience</h6>
                                <small class="text-muted">Select from saved audiences</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card method-card" id="gci-search-method-card" style="cursor: pointer; border: 2px solid #dee2e6;">
                            <div class="card-body text-center py-3">
                                <i class="fas fa-search fa-lg mb-2" style="color: #6c757d;"></i>
                                <h6 class="mb-0" style="color: #6c757d;">Use Search Parameters</h6>
                                <small class="text-muted">Search with filters & keywords</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Audience Selection Section -->
                <div id="gci-audience-section">
                    <div class="form-group">
                        <label for="gci-audience-select" class="font-weight-bold" style="color:black;">Select an audience</label>
                        <select class="form-control shadow-none select-dropdown" id="gci-audience-select" style="height: 35px;">
                            <option value="" disabled selected hidden>Select an audience</option>
                        </select>
                    </div>
                </div>

                <!-- Search Parameters Section -->
                <div id="gci-search-section" style="display: none;">
                    <div class="form-group">
                        <label for="gci-search-term" class="font-weight-bold" style="color:black;">Search</label>
                        <input type="text" class="form-control shadow-none" id="gci-search-term" placeholder="Enter your search term">
                    </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseConnectionStage"
                                    style="color:black">
                                    Connections <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseConnectionStage" class="collapse" data-parent="#gci-accordion">
                                    <div class="card-body gci-conn-degree">
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="gci-connFirstCheck" name="first_check" value="F">
                                            <label class="custom-control-label" for="gci-connFirstCheck">1st</label>
                                        </div>
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="gci-connSecondCheck" name="second_check" value="S">
                                            <label class="custom-control-label" for="gci-connSecondCheck">2nd</label>
                                        </div>
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="gci-connThirdCheck" name="third_check" value="O">
                                            <label class="custom-control-label" for="gci-connThirdCheck">3rd+</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordionKeywords">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseKeywords"
                                    style="color:black">
                                    Keywords <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseKeywords" class="collapse" data-parent="#gci-accordionKeywords">
                                    <div class="card-body">
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="gci-firstName" placeholder="First name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="gci-lastName" placeholder="Last name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="gci-title" placeholder="Title">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="gci-company" placeholder="Company">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="gci-school" placeholder="School">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion1">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseConnectionOf"
                                    style="color:black">
                                    Connections Of <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseConnectionOf" class="collapse" data-parent="#gci-accordion1">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-connectionOf" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-searchCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultConnectOf"></ul>
                                            <ul class="list-group" id="gci-selectedConnectOf"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion2">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseLocation" style="color:black">
                                    Locations<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseLocation" class="collapse" data-parent="#gci-accordion2">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-location" placeholder="Type location name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-searchLoc" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultLocation"></ul>
                                            <ul class="list-group" id="gci-selectedLocation"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion3">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseCurrComp" style="color:black">
                                    Current companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseCurrComp" class="collapse" data-parent="#gci-accordion3">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-currComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-searchCurrComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultCurrComp"></ul>
                                            <ul class="list-group" id="gci-selectedCurrComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion4">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapsePastComp" style="color:black">
                                    Past companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapsePastComp" class="collapse" data-parent="#gci-accordion4">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-pastComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-searchPastComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultPastComp"></ul>
                                            <ul class="list-group" id="gci-selectedPastComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion5">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseIndustry" style="color:black">
                                    Industry<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseIndustry" class="collapse" data-parent="#gci-accordion5">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-industy" placeholder="Type industy name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-searchIndustry" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultIndustry"></ul>
                                            <ul class="list-group" id="gci-selectedIndustry"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion6">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseSchool" style="color:black">
                                    School<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseSchool" class="collapse" data-parent="#gci-accordion6">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-school-search" placeholder="Type school name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-searchSchool" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultSchool"></ul>
                                            <ul class="list-group" id="gci-selectedSchool"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="gci-accordion7">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#gci-collapseLanguage" style="color:black">
                                    Profile Language<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="gci-collapseLanguage" class="collapse" data-parent="#gci-accordion7">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="gci-language" placeholder="Type language name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text gci-search-lang" id="gci-search-lang" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="gci-resultLanguage"></ul>
                                            <ul class="list-group" id="gci-selectedLanguage"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div> <!-- End of gci-search-section -->
            </div> <!-- End of modal-body content -->
            
            <!-- Common Parameters (completely independent) -->
            <div id="gci-common-parameters" style="padding: 20px; border-top: 1px solid #dee2e6; background-color: #f8f9fa;">
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
                            <label for="gci-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="gci-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="gci-totalScrape" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of profiles you want to scrape.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="gci-totalScrape" data-name="Total" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="gci-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between scraping each profile in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="gci-delayTime" data-name="Delay" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="gci-error-notice" style="color:red"></span>
                    </div>
                </div>
            </div>
                <!-- div class="custom-control custom-checkbox custom-control-inline mb-2">
                    <input type="checkbox" class="custom-control-input shadow-none" id="gci-company-data">
                    <label class="custom-control-label" for="gci-company-data" style="color:black;font-weight:bold;">
                        Get user's current company contact details
                        <div class="juez-tooltip">
                            <i class="fa fa-exclamation-circle"></i>
                            <span class="juez-tooltiptext">
                            Check this if you want to user's current company contact details[email & phone number].</span>
                        </div>
                    </label>
                </div -->

            </div>
            <div class="modal-footer" style="background-color: white; border-top: 1px solid #dee2e6; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; position: relative; z-index: 1000;">
                <button type="button" class="btn btn-primary btn-lg shadow-none connectionInfoAction" onclick="console.log('🔍 Get Connections Info: Button clicked')" style="background-color: #007bff; border-color: #007bff;">Get</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal" style="background-color: white; border-color: #6c757d; color: #6c757d;">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(connectionInfoForm)

// Handle method selection for Get Connection Info
$('#gci-audience-method-card').click(function(){
    console.log('🔍 Get Connections Info: Audience method selected');
    
    // Update visual styles
    $(this).addClass('selected').css({
        'border': '2px solid #007bff'
    });
    $(this).find('i').css('color', '#007bff');
    $(this).find('h6').css('color', '#007bff');
    
    $('#gci-search-method-card').removeClass('selected').css({
        'border': '2px solid #dee2e6'
    });
    $('#gci-search-method-card').find('i').css('color', '#6c757d');
    $('#gci-search-method-card').find('h6').css('color', '#6c757d');
    
    // Show/hide sections
    $('#gci-audience-section').show();
    $('#gci-search-section').hide();
    
    // Clear error messages
    $('#gci-error-notice').html('');
});

$('#gci-search-method-card').click(function(){
    console.log('🔍 Get Connections Info: Search method selected');
    
    // Update visual styles
    $(this).addClass('selected').css({
        'border': '2px solid #007bff'
    });
    $(this).find('i').css('color', '#007bff');
    $(this).find('h6').css('color', '#007bff');
    
    $('#gci-audience-method-card').removeClass('selected').css({
        'border': '2px solid #dee2e6'
    });
    $('#gci-audience-method-card').find('i').css('color', '#6c757d');
    $('#gci-audience-method-card').find('h6').css('color', '#6c757d');
    
    // Show/hide sections
    $('#gci-audience-section').hide();
    $('#gci-search-section').show();
    
    // Clear error messages
    $('#gci-error-notice').html('');
});

// Clear error when audience is selected
$('#gci-audience-select').change(function(){
    if($(this).val() && $(this).val() !== '') {
        $('#gci-error-notice').html('');
    }
});

$('#connection-info-menu-click').click(function(){
    implementPermission('connectionInfoAction')
    let fieldId = 'gci-audience-select';
    getAudienceList(fieldId)
    $('#gci-connFirstCheck').prop('checked', true)
    
    // Reset to audience method by default
    $('#gci-audience-method-card').click();
    
    $('#connectionInfoForm').modal({backdrop:'static', keyboard:false, show:true})
})