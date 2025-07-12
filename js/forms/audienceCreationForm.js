
var audienceCreationForm = `
<div class="modal" id="audienceCreationForm">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Create Audience</h5>
                <button type="button" class="close closeAudienceForm" >&times;</button>
            </div>
            <div class="modal-body">
                <div class="row newAudience-notice" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="afc-displayNewAudienceStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="audience-name" class="font-weight-bold c-header">Audience name</label>
                    <input type="text" class="form-control shadow-none" id="audience-name" data-name="Audience name" placeholder="Enter audience name">
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <ul class="nav nav-pills" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" id="nav-link-fsearch" data-toggle="pill" href="#fsearch">
                                    <div class="juez-tooltip">
                                        <i class="fa fa-search"></i> From search
                                        <span class="juez-tooltiptext">
                                            Collect users from Linkedin search.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="nav-link-network" data-toggle="pill" href="#fnetwork">
                                    
                                    <div class="juez-tooltip">
                                        <i class="fas fa-user-friends fa-lg"></i> My network
                                        <span class="juez-tooltiptext">
                                            Collect from your connection list.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="nav-link-fpost" data-toggle="pill" href="#fpost">
                                    
                                    <div class="juez-tooltip">
                                        <i class="far fa-file-alt fa-lg"></i> From post
                                        <span class="juez-tooltiptext">
                                            Collect users from post feeds.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="nav-link-fevent" data-toggle="pill" href="#fevent">
                                    
                                    <div class="juez-tooltip">
                                        <i class="fas fa-calendar fa-lg"></i> From event
                                        <span class="juez-tooltiptext">
                                            Collect event attendees.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" id="nav-link-fgroup" data-toggle="pill" href="#fgroup">
                                    
                                    <div class="juez-tooltip">
                                        <i class="fas fa-users fa-lg"></i> From group
                                        <span class="juez-tooltiptext">
                                            Collect group members.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            
                        </ul>

                        <div class="tab-content">
                            <div id="fsearch" class="container tab-pane active">
                                <div class="form-group">
                                    <label for="afs-search-term" class="font-weight-bold c-header">Search</label>
                                    <input type="text" class="form-control shadow-none" id="afs-search-term" placeholder="Enter your search term">
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div id="afs-accordion7">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseLanguage"  style="color:black">
                                                    Profile Language<span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseLanguage" class="collapse" data-parent="#afs-accordion7">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-language" placeholder="Type language name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-search-lang" id="afs-search-lang" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultLanguage"></ul>
                                                            <ul class="list-group" id="afs-selectedLanguage"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div id="afs-accordionKeywords">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseKeywords"
                                                    style="color:black">
                                                    Keywords <span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseKeywords" class="collapse" data-parent="#afs-accordionKeywords">
                                                    <div class="card-body">
                                                        <div class="form-group">
                                                            <input type="text" class="form-control shadow-none" id="afs-firstName" placeholder="First name">
                                                        </div>
                                                        <div class="form-group">
                                                            <input type="text" class="form-control shadow-none" id="afs-lastName" placeholder="Last name">
                                                        </div>
                                                        <div class="form-group">
                                                            <input type="text" class="form-control shadow-none" id="afs-title" placeholder="Title">
                                                        </div>
                                                        <div class="form-group">
                                                            <input type="text" class="form-control shadow-none" id="afs-company" placeholder="Company">
                                                        </div>
                                                        <div class="form-group">
                                                            <input type="text" class="form-control shadow-none" id="afs-school" placeholder="School">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div id="afs-accordion1">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseConnectionOf"
                                                    style="color:black">
                                                    Connections Of <span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseConnectionOf" class="collapse" data-parent="#afs-accordion1">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-connectionOf" placeholder="Type connection name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-searchCon" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultConnectOf"></ul>
                                                            <ul class="list-group" id="afs-selectedConnectOf"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div id="afs-accordion2">
                                            <div class="card">                  
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseLocation"   style="color:black">
                                                    Locations<span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseLocation" class="collapse" data-parent="#afs-accordion2">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-location" placeholder="Type location name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-searchLoc" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultLocation"></ul>
                                                            <ul class="list-group" id="afs-selectedLocation"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div id="afs-accordion3">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseCurrComp"  style="color:black">
                                                    Current companies<span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseCurrComp" class="collapse" data-parent="#afs-accordion3">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-currComp" placeholder="Type company name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-searchCurrComp" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultCurrComp"></ul>
                                                            <ul class="list-group" id="afs-selectedCurrComp"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div id="afs-accordion4">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapsePastComp" style="color:black">
                                                    Past companies<span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapsePastComp" class="collapse" data-parent="#afs-accordion4">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-pastComp" placeholder="Type company name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-searchPastComp" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultPastComp"></ul>
                                                            <ul class="list-group" id="afs-selectedPastComp"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div id="afs-accordion5">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseIndustry" style="color:black">
                                                    Industry<span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseIndustry" class="collapse" data-parent="#afs-accordion5">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-industy" placeholder="Type industy name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-searchIndustry" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultIndustry"></ul>
                                                            <ul class="list-group" id="afs-selectedIndustry"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div id="afs-accordion6">
                                            <div class="card">
                                                <a class="card-link card-header c-header" data-toggle="collapse" href="#afs-collapseSchool" style="color:black">
                                                    School<span class="float-right dropdown-toggle"></span>
                                                </a>
                                                <div id="afs-collapseSchool" class="collapse" data-parent="#afs-accordion6">
                                                    <div class="card-body">
                                                        <div class="form-group mb-0">
                                                            <div class="input-group">
                                                                <input type="text" class="form-control shadow-none" 
                                                                    id="afs-school-search" placeholder="Type school name and click search">
                                                                <div class="input-group-append">
                                                                    <span class="input-group-text afs-searchSchool" style="cursor:pointer">
                                                                        <i class="fa fa-search"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ul id="afs-resultSchool"></ul>
                                                            <ul class="list-group" id="afs-selectedSchool"></ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                            </div>
                            <div id="fpost" class="container tab-pane">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label class="font-weight-bold c-header">Add users who liked</label>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check"
                                                    id="afs-liked-none" name="user_liked" value="none">
                                                <label class="custom-control-label" for="afs-liked-none">None</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check" 
                                                    id="afs-liked-post" name="user_liked" value="post">
                                                <label class="custom-control-label" for="afs-liked-post">Post</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check" 
                                                    id="afs-liked-article" name="user_liked" value="article">
                                                <label class="custom-control-label" for="afs-liked-article">Article</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check" 
                                                    id="afs-liked-video" name="user_liked" value="video">
                                                <label class="custom-control-label" for="afs-liked-video">Video</label>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <input type="number" class="form-control afs-user-like afs-post-validate" id="afs-liked-postid" 
                                                placeholder="Enter post ID... Ex: 6361143641800568832">
                                            <input type="number" class="form-control afs-user-like afs-post-validate" id="afs-liked-articleid" 
                                                placeholder="Enter article ID... Ex: 8936076462107920273">
                                            <input type="number" class="form-control afs-user-like afs-post-validate" id="afs-liked-videoid" 
                                                placeholder="Enter video ID... Ex: 6362398753827098625">
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label class="font-weight-bold c-header">Add users who commented on</label>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-none" name="user_commented" value="none">
                                                <label class="custom-control-label" for="afs-commented-none">None</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-post" name="user_commented" value="post">
                                                <label class="custom-control-label" for="afs-commented-post">Post</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-article" name="user_commented" value="article">
                                                <label class="custom-control-label" for="afs-commented-article">Article</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-video" name="user_commented" value="video">
                                                <label class="custom-control-label" for="afs-commented-video">Video</label>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <input type="number" class="form-control afs-user-commented afs-post-validate" id="afs-commented-postid" 
                                                placeholder="Enter post ID... Ex: 6361143641800568832">
                                            <input type="number" class="form-control afs-user-commented afs-post-validate" id="afs-commented-articleid" 
                                                placeholder="Enter article ID... Ex: 8936076462107920273">
                                            <input type="number" class="form-control afs-user-commented afs-post-validate" id="afs-commented-videoid" 
                                                placeholder="Enter video ID... Ex: 6362398753827098625">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="fevent" class="container tab-pane">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label for="afs-eventId" style="color:black;font-weight:bold;">Event ID</label>
                                            <input type="number" class="form-control shadow-none" id="afs-eventId" placeholder="Enter event ID">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="fgroup" class="container tab-pane">
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label for="afs-groupId" style="color:black;font-weight:bold;">Group ID</label>
                                            <input type="number" class="form-control shadow-none" id="afs-groupId" placeholder="Enter group ID">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="fnetwork" class="container tab-pane">
                                <p class="mb-2">Use this feature to collect your 1st degree connections. Sort order is <b>Recently added</b>, 
                                    which means start position 0 is the most recently added connection.
                                </p>
                                <p>Please note that linkedIn monitors user activities and has limit of certain activities a user can perform 
                                    based on account type (Free and Premium). Kindly normalize using a maximum of 50 and below daily in total 
                                    number of users to be added to your audience list.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="afs-connectionDegree" class="font-weight-bold c-header">Connections</label>
                            <div class="card-body afs-conn-degree">
                                <div class="custom-control custom-checkbox custom-control-inline">
                                    <input type="checkbox" class="shadow-none" id="afs-connFirstCheck" name="first_check" value="F">
                                    <label class="" for="afs-connFirstCheck">1st</label>
                                </div>
                                <div class="custom-control custom-checkbox custom-control-inline nfn">
                                    <input type="checkbox" class="shadow-none" id="afs-connSecondCheck" name="second_check" value="S">
                                    <label class="" for="afs-connSecondCheck">2nd</label>
                                </div>
                                <div class="custom-control custom-checkbox custom-control-inline nfn">
                                    <input type="checkbox" class="shadow-none" id="afs-connThirdCheck" name="third_check" value="O">
                                    <label class="" for="afs-connThirdCheck">3rd+</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="afs-positiveKeywords" class="font-weight-bold c-header">Positive keyword
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">
                                        Enter comma separated keywords to search in user profile title or name to include users into audience.
                                        Keywords are not case-sensitive
                                    </span>
                                </div>
                            </label>
                            <textarea class="form-control shadow-none text-area-size" rows="3" id="afs-positiveKeywords" 
                                placeholder="Ex: Ecommerce, Shopify, Affiliate Marketing"></textarea>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="afs-negativeKeywords" class="font-weight-bold c-header">Negative keyword
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">
                                        Enter comma separated keywords to search in user profile title or name to exclude users from 
                                        adding into audience. Keywords are not case-sensitive
                                    </span>
                                </div>
                            </label>
                            <textarea class="form-control shadow-none text-area-size" rows="3" id="afs-negativeKeywords" 
                                placeholder="Ex: Marketing, Manager, John"></textarea>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="afs-startPosition" style="color:black;font-weight:bold;">Start position 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="afs-startPosition" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="afs-total" style="color:black;font-weight:bold;">Total 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Total number of people you want to add to audience.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="afs-total" data-name="Total" placeholder="Ex: 10">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4">
                        <div class="form-group">
                            <label for="afs-delayTime" style="color:black;font-weight:bold;">Delay 
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Delay between each search request in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none" id="afs-delayTime" data-name="Delay" placeholder="Ex: 30">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="afc-error-notice" style="color:red"></span>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none newAudienceAction">Add</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none closeAudienceForm">Close</button>
            </div>

        </div>
    </div>
</div>
`;

$('body').append(audienceCreationForm)
$('body').on('click','.closeAudienceForm',function(){
    $('#audienceCreationForm').modal('hide')
    // Refresh audience list when returning to menu
    if(typeof getAudienceNameList === 'function') {
        getAudienceNameList();
    }
    $('#audienceMenu').modal({backdrop:'static', keyboard:false, show:true})
})