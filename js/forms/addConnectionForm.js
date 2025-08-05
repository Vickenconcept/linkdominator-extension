
var addConnectionForm = `
<div class="modal" id="addConnectModal">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">

            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Add New Connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>

            <div class="modal-body">
                <div class="row add-connect" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="addc-displayConnectStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                
                <!-- Selection Method Section -->
                <div class="form-group">
                    <label class="font-weight-bold c-header">Choose your connection method</label>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card method-selection-card" id="audience-method-card">
                                <div class="card-body text-center">
                                    <i class="fas fa-users fa-3x text-primary mb-3"></i>
                                    <h5 class="card-title">Use Existing Audience</h5>
                                    <p class="card-text">Select from your saved audiences</p>
                                    <button type="button" class="btn btn-outline-primary" id="select-audience-method">
                                        <i class="fas fa-check"></i> Select Audience
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card method-selection-card" id="search-method-card">
                                <div class="card-body text-center">
                                    <i class="fas fa-search fa-3x text-success mb-3"></i>
                                    <h5 class="card-title">Use Search Parameters</h5>
                                    <p class="card-text">Define custom search criteria</p>
                                    <button type="button" class="btn btn-outline-success" id="select-search-method">
                                        <i class="fas fa-check"></i> Use Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Audience Selection Section -->
                <div id="audience-section" style="display: none;">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        <strong>Audience Method Selected:</strong> You'll be connecting with people from your selected audience.
                    </div>
                    <div class="form-group">
                        <label for="audience-select" class="font-weight-bold c-header">Select an audience</label>
                        <div class="input-group">
                            <select class="form-control shadow-none select-dropdown" id="addc-audience-select" style="height: 35px;">
                                <option value="">Select an audience</option>
                            </select>
                            <div class="input-group-append">
                                <button type="button" class="btn btn-outline-secondary" id="addc-refresh-audiences" title="Refresh audiences">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                        <small class="text-muted">Having trouble? Click the refresh button or check the console for details.</small>
                    </div>
                </div>

                <!-- Search Parameters Section -->
                <div id="search-section" style="display: none;">
                    <div class="alert alert-success">
                        <i class="fas fa-search"></i>
                        <strong>Search Method Selected:</strong> You'll be connecting with people based on your search criteria.
                    </div>
                    <div class="form-group" id="search-audience-section" style="display: none;">
                        <label for="audience-select" class="font-weight-bold c-header">Select an audience</label>
                        <div class="input-group">
                            <select class="form-control shadow-none select-dropdown" id="addc-audience-select-search" style="height: 35px;">
                                <option value="">Select an audience</option>
                            </select>
                            <div class="input-group-append">
                                <button type="button" class="btn btn-outline-secondary" id="addc-refresh-audiences-search" title="Refresh audiences">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                        <small class="text-muted">Having trouble? Click the refresh button or check the console for details.</small>
                    </div>
                    <div class="form-group">
                        <label for="addc-search-term" class="font-weight-bold c-header">Search</label>
                        <input type="text" class="form-control shadow-none" id="addc-search-term" placeholder="Enter your search term">
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div id="addc-accordion">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseConnectionStage">
                                        Connections 
                                        <div class="juez-tooltip">
                                            <i class="fa fa-exclamation-circle"></i>
                                            <span class="juez-tooltiptext">It is recommended to send invitation to 2nd degree connections only.</span>
                                        </div>
                                        <span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseConnectionStage" class="collapse" data-parent="#addc-accordion">
                                        <div class="card-body addc-conn-degree d-flex">
                                            <div class="mr-4">
                                                <input type="checkbox" class="shadow-none" id="addc-connSecondCheck" name="second_check" value="S">
                                                <label class="" for="addc-connSecondCheck">2nd</label>
                                            </div>
                                            <div class="">
                                                <input type="checkbox" class="shadow-none" id="addc-connThirdCheck" name="third_check" value="O">
                                                <label class="" for="addc-connThirdCheck">3rd+</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div id="addc-accordionKeywords">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseKeywords"
                                        style="color:black">
                                        Keywords <span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseKeywords" class="collapse" data-parent="#addc-accordionKeywords">
                                        <div class="card-body">
                                            <div class="form-group">
                                                <input type="text" class="form-control shadow-none" id="addc-firstName" placeholder="First name">
                                            </div>
                                            <div class="form-group">
                                                <input type="text" class="form-control shadow-none" id="addc-lastName" placeholder="Last name">
                                            </div>
                                            <div class="form-group">
                                                <input type="text" class="form-control shadow-none" id="addc-title" placeholder="Title">
                                            </div>
                                            <div class="form-group">
                                                <input type="text" class="form-control shadow-none" id="addc-company" placeholder="Company">
                                            </div>
                                            <div class="form-group">
                                                <input type="text" class="form-control shadow-none" id="addc-school" placeholder="School">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div id="addc-accordion1">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseConnectionOf"
                                        style="color:black">
                                        Connections Of <span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseConnectionOf" class="collapse" data-parent="#addc-accordion1">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-connectionOf" placeholder="Type connection name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-searchCon" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultConnectOf"></ul>
                                                <ul class="list-group" id="addc-selectedConnectOf"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div id="addc-accordion2">
                                <div class="card">                  
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseLocation"   style="color:black">
                                        Locations<span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseLocation" class="collapse" data-parent="#addc-accordion2">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-location" placeholder="Type location name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-searchLoc" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultLocation"></ul>
                                                <ul class="list-group" id="addc-selectedLocation"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div id="addc-accordion3">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseCurrComp"  style="color:black">
                                        Current companies<span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseCurrComp" class="collapse" data-parent="#addc-accordion3">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-currComp" placeholder="Type company name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-searchCurrComp" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultCurrComp"></ul>
                                                <ul class="list-group" id="addc-selectedCurrComp"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div id="addc-accordion4">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapsePastComp" style="color:black">
                                        Past companies<span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapsePastComp" class="collapse" data-parent="#addc-accordion4">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-pastComp" placeholder="Type company name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-searchPastComp" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultPastComp"></ul>
                                                <ul class="list-group" id="addc-selectedPastComp"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div id="addc-accordion5">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseIndustry" style="color:black">
                                        Industry<span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseIndustry" class="collapse" data-parent="#addc-accordion5">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-industy" placeholder="Type industy name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-searchIndustry" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultIndustry"></ul>
                                                <ul class="list-group" id="addc-selectedIndustry"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div id="addc-accordion6">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseSchool" style="color:black">
                                        School<span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseSchool" class="collapse" data-parent="#addc-accordion6">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-school-search" placeholder="Type school name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-searchSchool" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultSchool"></ul>
                                                <ul class="list-group" id="addc-selectedSchool"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div id="addc-accordion7">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseLanguage"  style="color:black">
                                        Profile Language<span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseLanguage" class="collapse" data-parent="#addc-accordion7">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <input type="text" class="form-control shadow-none" 
                                                        id="addc-language" placeholder="Type language name and click search">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text addc-search-lang" id="addc-search-lang" style="cursor:pointer">
                                                            <i class="fa fa-search"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                                <ul id="addc-resultLanga"></ul>
                                                <ul class="list-group" id="addc-selectedLanguage"></ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div id="addc-accordion8">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseExcludeKeyword"  style="color:black">
                                        Exclude Keywords <span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseExcludeKeyword" class="collapse" data-parent="#addc-accordion8">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <textarea class="form-control shadow-none text-area-size" rows="3" id="addc-excludeKeywords" 
                                                        placeholder="Ex: Marketing, Manager, Jane Doe"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <div id="addc-accordion9">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapseKeywordforConnect"  style="color:black">
                                        Keywords for connecting <span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapseKeywordforConnect" class="collapse" data-parent="#addc-accordion9">
                                        <div class="card-body">
                                            <div class="form-group mb-0">
                                                <div class="input-group">
                                                    <textarea class="form-control shadow-none text-area-size" rows="3" id="addc-keywordsForConnect" 
                                                        placeholder="Ex: Network, Security, Consultant, Senior Engineer"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group">
                                <label class="font-weight-bold c-header">Connect with users who liked</label>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-liked-check"
                                        id="addc-liked-none" name="user_liked" value="none">
                                    <label class="custom-control-label" for="addc-liked-none">None</label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-liked-check" 
                                        id="addc-liked-post" name="user_liked" value="post">
                                    <label class="custom-control-label" for="addc-liked-post">Post</label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-liked-check" 
                                        id="addc-liked-article" name="user_liked" value="article">
                                    <label class="custom-control-label" for="addc-liked-article">Article</label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-liked-check" 
                                        id="addc-liked-video" name="user_liked" value="video">
                                    <label class="custom-control-label" for="addc-liked-video">Video</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <input type="number" class="form-control addc-user-like" id="addc-liked-postid" 
                                    placeholder="Enter post ID... Ex: 6361143641800568832">
                                <input type="number" class="form-control addc-user-like" id="addc-liked-articleid" 
                                    placeholder="Enter article ID... Ex: 8936076462107920273">
                                <input type="number" class="form-control addc-user-like" id="addc-liked-videoid" 
                                    placeholder="Enter video ID... Ex: 6362398753827098625">
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-group">
                                <label class="font-weight-bold c-header">Connect with users who commented on</label>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-commented-check" 
                                        id="addc-commented-none" name="user_commented" value="none">
                                    <label class="custom-control-label" for="addc-commented-none">None</label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-commented-check" 
                                        id="addc-commented-post" name="user_commented" value="post">
                                    <label class="custom-control-label" for="addc-commented-post">Post</label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-commented-check" 
                                        id="addc-commented-article" name="user_commented" value="article">
                                    <label class="custom-control-label" for="addc-commented-article">Article</label>
                                </div>
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input type="radio" class="custom-control-input addc-commented-check" 
                                        id="addc-commented-video" name="user_commented" value="video">
                                    <label class="custom-control-label" for="addc-commented-video">Video</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <input type="number" class="form-control addc-user-commented" id="addc-commented-postid" 
                                    placeholder="Enter post ID... Ex: 6361143641800568832">
                                <input type="number" class="form-control addc-user-commented" id="addc-commented-articleid" 
                                    placeholder="Enter article ID... Ex: 8936076462107920273">
                                <input type="number" class="form-control addc-user-commented" id="addc-commented-videoid" 
                                    placeholder="Enter video ID... Ex: 6362398753827098625">
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-6">
                            <div class="custom-control custom-checkbox custom-control-inline mb-2">
                                <input type="checkbox" class="shadow-none" id="addc-connectUser">
                                <label class="custom-control-label" for="addc-connectUser" style="color:black;font-weight:bold;">
                                    Connect to users based on keywords
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Check this if you want to connect to users based on keywords in profile title or name.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="custom-control custom-checkbox custom-control-inline mb-2">
                                <input type="checkbox" class="shadow-none" id="addc-excludeUser">
                                <label class="custom-control-label" for="addc-excludeUser" style="color:black;font-weight:bold;">
                                    Exclude users based on keywords
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Check this if you want to exclude to users based on their profile title or name.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-6">
                            <div class="custom-control custom-checkbox custom-control-inline mb-2">
                                <input type="checkbox" class="shadow-none" id="addc-viewProfile">
                                <label class="custom-control-label" for="addc-viewProfile" style="color:black;font-weight:bold;">View profile
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Check this if you want to send profile view notification.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Common Settings Section (shown for both methods) -->
                <div id="common-settings-section" style="display: none;">
                    <hr>
                    <h6 class="font-weight-bold c-header">Connection Settings</h6>
                    <div class="row">
                        <div class="col-md-12">
                            <div id="addc-accordion10">
                                <div class="card">
                                    <a class="card-link card-header c-header" data-toggle="collapse" href="#addc-collapsePersonalMessage"  style="color:black">
                                        Include a personal message <span class="float-right dropdown-toggle"></span>
                                    </a>
                                    <div id="addc-collapsePersonalMessage" class="collapse" data-parent="#addc-accordion10">
                                        <div class="card-body">
                                            <div class="form-group">
                                                <label for="addc-audience-aicontent" class="font-weight-bold c-header">Select content template</label>
                                                <select class="form-control shadow-none select-dropdown" id="addc-audience-aicontent" style="height: 35px;">
                                                    <option value="">Select content</option>
                                                </select>
                                            </div>
                                            <div class="mb-2" tyle="display: inline-block">
                                                <div class="juez-tooltip">
                                                    <button type="button" class="btn btn-outline-primary btn-lg pm-btn" data-name="@firstName">@firstName</button>
                                                    <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                                                </div>
                                                <div class="juez-tooltip">
                                                    <button type="button" class="btn btn-outline-primary btn-lg pm-btn" data-name="@lastName">@lastName</button>
                                                    <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                                                </div>
                                                <div class="juez-tooltip">
                                                    <button type="button" class="btn btn-outline-primary btn-lg pm-btn" data-name="@name">@name</button>
                                                    <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                                                </div>
                                            </div>
                                            <div class="form-group mb-0">
                                                <textarea class="form-control shadow-none text-area-size" rows="5" id="addc-personalMessage" 
                                                    placeholder="Ex: Hi @firstName, i would like to join your network"
                                                    maxlength="200"></textarea>
                                                <span id="pm-limit">0/200</span>
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
                                <label for="addc-startPosition" style="color:black;font-weight:bold;">Start position 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                    </div>
                                </label>
                                <input type="number" class="form-control shadow-none" id="addc-startPosition" placeholder="Ex: 0">
                            </div>
                        </div>
                        <div class="col-lg-4 col-sm-4">
                            <div class="form-group">
                                <label for="addc-totalFollow" style="color:black;font-weight:bold;">Total 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Total number of people you want to follow.</span>
                                    </div>
                                </label>
                                <input type="number" class="form-control shadow-none" id="addc-totalFollow" placeholder="Ex: 10">
                            </div>
                        </div>
                        <div class="col-lg-4 col-sm-4">
                            <div class="form-group">
                                <label for="addc-delayFollowTime" style="color:black;font-weight:bold;">Delay 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Delay between each follow in seconds.</span>
                                    </div>
                                </label>
                                <input type="number" class="form-control shadow-none" id="addc-delayFollowTime" placeholder="Ex: 30">
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <span id="addc-error-notice" style="color:red"></span>
                        </div>
                    </div>
                </div>

            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none addConnect">Connect</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>

        </div>
    </div>
</div>
`

$('body').append(addConnectionForm);

// Add CSS for method selection cards
$('<style>')
    .prop('type', 'text/css')
    .html(`
        .method-selection-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid #e9ecef;
        }
        .method-selection-card:hover {
            border-color: #007bff;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .method-selection-card.selected {
            border-color: #007bff;
            background-color: #f8f9fa;
        }
        .method-selection-card.selected .btn {
            background-color: #007bff;
            color: white;
        }
    `)
    .appendTo('head');

// Method selection handlers
$('#select-audience-method').click(function() {
    $('.method-selection-card').removeClass('selected');
    $('#audience-method-card').addClass('selected');
    $('#audience-section').show();
    $('#search-section').hide();
    $('#common-settings-section').show();
    
    // Clear error message when switching methods
    $('#addc-error-notice').html('');
});

$('#select-search-method').click(function() {
    $('.method-selection-card').removeClass('selected');
    $('#search-method-card').addClass('selected');
    $('#audience-section').hide();
    $('#search-section').show();
    $('#common-settings-section').show();
    
    // Hide the audience dropdown in search section
    $('#search-audience-section').hide();
    
    // Clear error message when switching methods
    $('#addc-error-notice').html('');
});

$('#add-connect-menu-click').click(function(){
    implementPermission('addConnect')
    $('#addc-connSecondCheck').prop('checked', true);
    
    console.log('🚀 Add Connection modal opening...');
    
    // Reset method selection
    $('.method-selection-card').removeClass('selected');
    $('#audience-section').hide();
    $('#search-section').hide();
    $('#common-settings-section').hide();
    
    // Check if user profile is loaded
    var linkedinId = $('#me-publicIdentifier').val();
    console.log('🔍 Current LinkedIn ID:', linkedinId);
    
    if (!linkedinId || linkedinId.trim() === '') {
        console.log('⚠️ LinkedIn ID not found, calling getUserProfile first...');
        
        // Show loading in audience dropdown
        $('#addc-audience-select').empty().append('<option value="">⏳ Loading user profile...</option>');
        
        // Call getUserProfile first, then getAudienceList
        if (typeof getUserProfile === 'function') {
            getUserProfile().then(() => {
                console.log('✅ User profile loaded, now loading audiences...');
                var fieldId = 'addc-audience-select';
                getAudienceList(fieldId);
                
                // Also load audiences for search section
                var searchFieldId = 'addc-audience-select-search';
                getAudienceList(searchFieldId);
            }).catch((error) => {
                console.error('❌ Failed to load user profile:', error);
                $('#addc-audience-select').empty().append('<option value="">❌ Failed to load profile - please refresh</option>');
                $('#addc-audience-select-search').empty().append('<option value="">❌ Failed to load profile - please refresh</option>');
            });
        } else {
            console.error('❌ getUserProfile function not available');
            $('#addc-audience-select').empty().append('<option value="">❌ Profile function not available</option>');
            $('#addc-audience-select-search').empty().append('<option value="">❌ Profile function not available</option>');
        }
    } else {
        console.log('✅ LinkedIn ID found, loading audiences directly...');
        var fieldId = 'addc-audience-select';
        getAudienceList(fieldId);
        
        // Also load audiences for search section
        var searchFieldId = 'addc-audience-select-search';
        getAudienceList(searchFieldId);
    }

    // append AI content to dropdown
    helper.setAIContentToDropdown('addc-audience-aicontent')

    $('#addConnectModal').modal({backdrop:'static', keyboard:false, show:true});
})

// Clear error message when audience is selected
$('#addc-audience-select').change(function(){
    if($(this).val() && $(this).val() !== '') {
        $('#addc-error-notice').html('');
    }
});

// Clear error message when search audience is selected
$('#addc-audience-select-search').change(function(){
    if($(this).val() && $(this).val() !== '') {
        $('#addc-error-notice').html('');
    }
});

$('#addc-audience-aicontent').change(function(){
    if($(this).val()) {
        let content = $(this).val() 
        let words = $(this).val().split(' ')

        $('#addc-personalMessage').val(content)
        $('#pm-limit').text(`${words.length}/200`)
    } 
})

$('.pm-btn').click(function(){
    var pmName = $(this).data('name')
    var pm = $('#addc-personalMessage')
    pm.val(pm.val() + pmName)
})
$('#addc-personalMessage').keyup(function(){
    var lenOfPm = $(this).val().split(' ').length
    $('#pm-limit').text(`${lenOfPm}/200`)
})

$('#addc-liked-none').prop('checked', true)
if($('#addc-liked-none').prop('checked') == true ){
    $('.addc-user-like').val('').hide()
}
$('#addc-commented-none').prop('checked', true)
if($('#addc-commented-none').prop('checked') == true ){
    $('.addc-user-commented').val('').hide()
}
$('.addc-liked-check').change(function(){
    if($('#addc-liked-none').prop('checked') == true ){
        $('.addc-user-like').val('').hide()
    }else if($('#addc-liked-post').prop('checked') == true){
        $('#addc-liked-postid').val('').show()
        $('#addc-liked-articleid').val('').hide()
        $('#addc-liked-videoid').val('').hide()
        $('.addc-commented-check').prop('checked', false)
        $('.addc-user-commented').val('').hide()
    }else if($('#addc-liked-article').prop('checked') == true){
        $('#addc-liked-postid').val('').hide()
        $('#addc-liked-articleid').val('').show()
        $('#addc-liked-videoid').val('').hide()
        $('.addc-commented-check').prop('checked', false)
        $('.addc-user-commented').val('').hide()
    }else if($('#addc-liked-video').prop('checked') == true){
        $('#addc-liked-postid').val('').hide()
        $('#addc-liked-articleid').val('').hide()
        $('#addc-liked-videoid').val('').show()
        $('.addc-commented-check').prop('checked', false)
        $('.addc-user-commented').val('').hide()
    }else{
        $('.addc-user-like').val('').hide()
    }
})
$('.addc-commented-check').change(function(){
    if($('#addc-commented-none').prop('checked') == true){
        $('.addc-user-commented').val('').hide()
    }else if($('#addc-commented-post').prop('checked') == true){
        $('#addc-commented-postid').val('').show()
        $('#addc-commented-articleid').val('').hide()
        $('#addc-commented-videoid').val('').hide()
        $('.addc-liked-check').prop('checked', false)
        $('.addc-user-like').val('').hide()
    }else if($('#addc-commented-article').prop('checked') == true){
        $('#addc-commented-postid').val('').hide()
        $('#addc-commented-articleid').val('').show()
        $('#addc-commented-videoid').val('').hide()
        $('.addc-liked-check').prop('checked', false)
        $('.addc-user-like').val('').hide()
    }else if($('#addc-commented-video').prop('checked') == true){
        $('#addc-commented-postid').val('').hide()
        $('#addc-commented-articleid').val('').hide()
        $('#addc-commented-videoid').val('').show()
        $('.addc-liked-check').prop('checked', false)
        $('.addc-user-like').val('').hide()
    }else{
        $('.addc-user-commented').val('').hide()
    }
})

// Add refresh audiences button handler
$('#addc-refresh-audiences').click(function(){
    console.log('🔄 Manual refresh of audiences requested...');
    var fieldId = 'addc-audience-select';
    
    // Show loading
    $(this).find('i').addClass('fa-spin');
    
    getAudienceList(fieldId).finally(() => {
        // Remove spinning animation
        $(this).find('i').removeClass('fa-spin');
    });
});

// Add refresh audiences button handler for search section
$('#addc-refresh-audiences-search').click(function(){
    console.log('🔄 Manual refresh of audiences requested (search section)...');
    var fieldId = 'addc-audience-select-search';
    
    // Show loading
    $(this).find('i').addClass('fa-spin');
    
    getAudienceList(fieldId).finally(() => {
        // Remove spinning animation
        $(this).find('i').removeClass('fa-spin');
    });
});

// Debug helper function
window.debugAudienceSelection = function() {
    console.log('🔧 AUDIENCE SELECTION DEBUG INFO:');
    console.log('LinkedIn ID (element):', $('#me-publicIdentifier').val());
    console.log('LinkedIn ID (global):', typeof linkedinId !== 'undefined' ? linkedinId : 'UNDEFINED');
    console.log('Filter API:', typeof filterApi !== 'undefined' ? filterApi : 'UNDEFINED');
    console.log('Platform URL:', typeof PLATFROM_URL !== 'undefined' ? PLATFROM_URL : 'UNDEFINED');
    console.log('Current audiences in dropdown:', $('#addc-audience-select option').length);
    
    // Test API call
    var publicId = $('#me-publicIdentifier').val() || linkedinId;
    if (publicId) {
        console.log('🧪 Testing audience API call...');
        fetch(`${filterApi}/audience?linkedinId=${publicId}`)
            .then(response => {
                console.log('✅ API Response Status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('✅ API Response Data:', data);
            })
            .catch(error => {
                console.error('❌ API Test Error:', error);
            });
    } else {
        console.error('❌ No LinkedIn ID available for testing');
    }
    
    console.log('💡 To manually refresh: $("#addc-refresh-audiences").click()');
    console.log('💡 To reload user profile: getUserProfile()');
};
