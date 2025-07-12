var endorseConnectionsForm = `
<div class="modal" id="endorseConnectionsForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Endorse Connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row endorseConnect" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displayEndorseConnectionStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="edc-audience-select" class="font-weight-bold" style="color:black;">Select an audience</label>
                    <select class="form-control shadow-none select-dropdown" id="edc-audience-select" style="height: 35px;">
                        <option value="" disabled selected hidden>Select an audience</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edc-search-term" class="font-weight-bold" style="color:black;">Search</label>
                    <input type="text" class="form-control shadow-none" id="edc-search-term" placeholder="Enter your search term">
                </div>
                
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordionKeywords">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseKeywords"
                                    style="color:black">
                                    Keywords <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseKeywords" class="collapse" data-parent="#edc-accordionKeywords">
                                    <div class="card-body">
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="edc-firstName" placeholder="First name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="edc-lastName" placeholder="Last name">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="edc-title" placeholder="Title">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="edc-company" placeholder="Company">
                                        </div>
                                        <div class="form-group">
                                            <input type="text" class="form-control shadow-none" id="edc-school" placeholder="School">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion1">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseConnectionOf"
                                    style="color:black">
                                    Connections Of <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseConnectionOf" class="collapse" data-parent="#edc-accordion1">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-connectionOf" placeholder="Type connection name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-searchCon" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultConnectOf"></ul>
                                            <ul class="list-group" id="edc-selectedConnectOf"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion2">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseLocation" style="color:black">
                                    Locations<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseLocation" class="collapse" data-parent="#edc-accordion2">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-location" placeholder="Type location name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-searchLoc" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultLocation"></ul>
                                            <ul class="list-group" id="edc-selectedLocation"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion3">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseCurrComp" style="color:black">
                                    Current companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseCurrComp" class="collapse" data-parent="#edc-accordion3">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-currComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-searchCurrComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultCurrComp"></ul>
                                            <ul class="list-group" id="edc-selectedCurrComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion4">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapsePastComp" style="color:black">
                                    Past companies<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapsePastComp" class="collapse" data-parent="#edc-accordion4">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-pastComp" placeholder="Type company name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-searchPastComp" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultPastComp"></ul>
                                            <ul class="list-group" id="edc-selectedPastComp"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion5">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseIndustry" style="color:black">
                                    Industry<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseIndustry" class="collapse" data-parent="#edc-accordion5">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-industy" placeholder="Type industy name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-searchIndustry" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultIndustry"></ul>
                                            <ul class="list-group" id="edc-selectedIndustry"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion6">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseSchool" style="color:black">
                                    School<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseSchool" class="collapse" data-parent="#edc-accordion6">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-school-search" placeholder="Type school name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-searchSchool" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultSchool"></ul>
                                            <ul class="list-group" id="edc-selectedSchool"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="edc-accordion7">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#edc-collapseLanguage" style="color:black">
                                    Profile Language<span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="edc-collapseLanguage" class="collapse" data-parent="#edc-accordion7">
                                    <div class="card-body">
                                        <div class="form-group mb-0">
                                            <div class="input-group">
                                                <input type="text" class="form-control shadow-none" 
                                                    id="edc-language" placeholder="Type language name and click search">
                                                <div class="input-group-append">
                                                    <span class="input-group-text edc-search-lang" id="edc-search-lang" style="cursor:pointer">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <ul id="edc-resultLanguage"></ul>
                                            <ul class="list-group" id="edc-selectedLanguage"></ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-6 col-sm-6">
                        <div class="form-group">
                            <label for="edc-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="edc-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-md-6 col-sm-6">
                        <div class="form-group">
                            <label for="edc-total" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of connections you want to endorse.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="edc-total" data-name="Total" placeholder="Ex: 10">
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-6 col-sm-6">
                        <div class="form-group">
                            <label for="edc-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each connection endorsement in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="edc-delayTime" data-name="Delay" placeholder="Ex: 30">
                        </div>
                    </div>
                    <div class="col-md-6 col-sm-6">
                        <div class="form-group">
                            <label for="edc-totalSkills" style="color:black;font-weight:bold;">Total Skills 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of skill of each connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="edc-totalSkills" data-name="Total Skills" placeholder="Ex: 5">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="edc-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class="row mt-2">
                    <!--div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline mb-2">
                            <input type="checkbox" class="custom-control-input shadow-none" id="edc-endorseAll">
                            <label class="custom-control-label" for="edc-endorseAll" style="color:black;font-weight:bold;">
                                Endorse all connection
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">
                                        Check this if you want to endorse all your connection one by one, 
                                        all search filters will be ignored.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div-->
                    <div class="col-md-6">
                        <div class="mb-2">
                            <input type="checkbox" class="custom-control-input shadow-none" id="edc-viewProfile">
                            <label class="custom-control-label" for="edc-viewProfile" style="color:black;font-weight:bold;">View profile
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Check this if you want to send profile view notification.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none endorseConnectionAction">Endorse</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(endorseConnectionsForm)
$('body').on('click','#endorse-connection-menu-click',function(){
    implementPermission('endorseConnectionAction')
    let fieldId = 'edc-audience-select';
    getAudienceList(fieldId)
    $('#endorseConnectionsForm').modal({backdrop:'static', keyboard:false, show:true})
})