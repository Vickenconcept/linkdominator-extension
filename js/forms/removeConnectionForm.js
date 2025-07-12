
var removeConnectForm = `
<div class="modal" id="removeConnectForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Remove Connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row remove-connect" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayRemoveStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <!--div class="form-group">
                    <label for="rmc-audience-select" class="font-weight-bold" style="color:black;">Select an audience</label>
                    <select class="form-control shadow-none select-dropdown" id="rmc-audience-select" style="height: 35px;">
                        <option value="" >Select an audience</option>
                    </select>
                </div-->
                <div class="form-group">
                    <label for="rmc-search-term" class="font-weight-bold" style="color:black;">Search</label>
                    <input type="text" class="form-control shadow-none" id="rmc-search-term" placeholder="Enter your search term">
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordionKeywords">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseKeywords"
                                    style="color:black">
                                    Keywords <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseKeywords" class="collapse" data-parent="#rmc-accordionKeywords">
                                    <div class="card-body">
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="rmc-firstName" placeholder="First name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="rmc-lastName" placeholder="Last name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="rmc-title" placeholder="Title">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="rmc-company" placeholder="Company">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="rmc-school" placeholder="School">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion1">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseConnectionOf"
                                    style="color:black">
                                    Connections Of <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseConnectionOf" class="collapse" data-parent="#rmc-accordion1">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-connectionOf" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-searchCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultConnectOf"></ul>
                                            <ul class="list-group" id="rmc-selectedConnectOf"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion2">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseLocation" style="color:black">
                                    Locations<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseLocation" class="collapse" data-parent="#rmc-accordion2">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-location" placeholder="Type location name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-searchLoc" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultLocation"></ul>
                                            <ul class="list-group" id="rmc-selectedLocation"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion3">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseCurrComp" style="color:black">
                                    Current companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseCurrComp" class="collapse" data-parent="#rmc-accordion3">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-currComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-searchCurrComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultCurrComp"></ul>
                                            <ul class="list-group" id="rmc-selectedCurrComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion4">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapsePastComp" style="color:black">
                                    Past companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapsePastComp" class="collapse" data-parent="#rmc-accordion4">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-pastComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-searchPastComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultPastComp"></ul>
                                            <ul class="list-group" id="rmc-selectedPastComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion5">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseIndustry" style="color:black">
                                    Industry<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseIndustry" class="collapse" data-parent="#rmc-accordion5">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-industy" placeholder="Type industy name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-searchIndustry" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultIndustry"></ul>
                                            <ul class="list-group" id="rmc-selectedIndustry"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion6">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseSchool" style="color:black">
                                    School<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseSchool" class="collapse" data-parent="#rmc-accordion6">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-school-search" placeholder="Type school name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-searchSchool" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultSchool"></ul>
                                            <ul class="list-group" id="rmc-selectedSchool"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="rmc-accordion7">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#rmc-collapseLanguage" style="color:black">
                                    Profile Language<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="rmc-collapseLanguage" class="collapse" data-parent="#rmc-accordion7">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="rmc-language" placeholder="Type language name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text rmc-search-lang" id="rmc-search-lang" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="rmc-resultLanguage"></ul>
                                            <ul class="list-group" id="rmc-selectedLanguage"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="rmc-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="rmc-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="rmc-totalFollow" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of people you want to follow.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="rmc-totalFollow" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="rmc-delayFollowTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each follow in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="rmc-delayFollowTime" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="rmc-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline mb-2">
                            <input type="checkbox" class="custom-control-input shadow-none" id="rmc-blockConnect">
                            <label class="custom-control-label" for="rmc-blockConnect" 
                                style="color:black;font-weight:bold;"
                            >Block connection after removing
                            </label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline mb-2">
                            <input type="checkbox" class="custom-control-input shadow-none" id="rmc-agreeRemove">
                            <label class="custom-control-label" for="rmc-agreeRemove" 
                                style="color:black;font-weight:bold;"
                            >I agree to remove my connections
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none removeConnectAction">Disconnect</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`;

$('body').append(removeConnectForm);
$('#remove-connect-menu-click').click(function(){
    implementPermission('removeConnectAction')
    let fieldId = 'rmc-audience-select';
    getAudienceList(fieldId);
    $('#removeConnectForm').modal({backdrop:'static', keyboard:false, show:true});
})