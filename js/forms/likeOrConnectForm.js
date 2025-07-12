
var likeOrConnectForm = `
<div class="modal" id="likeOrConnectForm">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Like or Add new connections</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row like-add-connect" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="loac-displayLikeAddConnectStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="loac-sort-by" class="font-weight-bold c-header">Sort post by</label>
                    <select class="form-control shadow-none select-dropdown" style="height: 35px;" id="loac-sort-by">
                        <option value="feed">Top</option>
                        <option value="chronFeed">Recent</option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="loac-accordion">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#loac-collapseConnectionStage">
                                    Connections 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Send invitation to 2nd or 3rd degree connections. It is recommended to send invitation to 2nd 
                                        degree connections only.</span>
                                    </div>
                                    <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="loac-collapseConnectionStage" class="collapse" data-parent="#loac-accordion">
                                    <div class="card-body loac-conn-degree">
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="loac-connSecondCheck" name="second_check" value="S">
                                            <label class="custom-control-label" for="loac-connSecondCheck">2nd</label>
                                        </div>
                                        <div class="custom-control custom-checkbox custom-control-inline">
                                            <input type="checkbox" class="shadow-none" id="loac-connThirdCheck" name="third_check" value="O">
                                            <label class="custom-control-label" for="loac-connThirdCheck">3rd+</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="loac-postKeyword-accordion">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#loac-collapsePostKeyword">
                                    Posts Keywords 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Enter comma separated keywords to search in post description. keywords are not case sensitive.
                                        Make sure to check "Search post based on keyword" optiion.</span>
                                    </div>
                                    <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="loac-collapsePostKeyword" class="collapse" rows="3" data-parent="#loac-postKeyword-accordion">
                                    <textarea class="form-control shadow-none text-area-size" rows="3" id="loac-postsKeyword" placeholder="Ex: engineer,cisco,google,ceo,required"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="loac-excludeKeyword-accordion">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#loac-collapseExcludeKeyword">
                                    Exclude Keywords 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Enter comma separated keywords to search in user profile title or name to exclude user from connection 
                                        invitation. keywords are not case sensitive. Make sure to check "Exclude user based on keyword" optiion.</span>
                                    </div>
                                    <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="loac-collapseExcludeKeyword" class="collapse" rows="3" data-parent="#loac-excludeKeyword-accordion">
                                    <textarea class="form-control shadow-none text-area-size" rows="3" id="loac-excludeKeyword" placeholder="Ex: Marketing,Manager"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="loac-keywordForConnect-accordion">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#loac-collapsekeywordForConnect">
                                    Keywords for connecting 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Enter comma separated keywords to search in user profile title or name before sending connection 
                                        invitation. keywords are not case sensitive. Make sure to check "Connect to user based on keywords" optiion.</span>
                                    </div>
                                    <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="loac-collapsekeywordForConnect" class="collapse" rows="3" data-parent="#loac-keywordForConnect-accordion">
                                    <textarea class="form-control shadow-none text-area-size" rows="3" id="loac-keywordForConnect" placeholder="Ex: Network,Security,Consultant"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div id="loac-accordion10">
                            <div class="card">
                                <a class="card-link card-header c-header" data-toggle="collapse" href="#loac-collapsePersonalMessage"  style="color:black">
                                    Include a personal message 
                                    <div class="juez-tooltip">
                                        <i class="fa fa-exclamation-circle"></i>
                                        <span class="juez-tooltiptext">Use @name, @firstName, @lastName in the text area below, to act as a placeholder for the entire name, first name
                                         or last name of the user</span>
                                    </div>
                                    <span class="float-right dropdown-toggle"></span>
                                </a>
                                <div id="loac-collapsePersonalMessage" class="collapse" data-parent="#loac-accordion10">
                                    <div class="card-body">
                                        <div class="row mt-2">
                                            <div class="col-md-12">
                                                <label for="loac-aicontent" class="font-weight-bold c-header">Select content template</label>
                                                <select class="form-control shadow-none select-dropdown" id="loac-aicontent" style="height: 35px;">
                                                    <option value="">Select content</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="mb-2" tyle="display: inline-block">
                                            <div class="juez-tooltip">
                                                <button type="button" class="btn btn-outline-primary btn-lg loac-pm-btn" data-name="@firstName">@firstName</button>
                                                <span class="juez-tooltiptext">Short-code for first name of the user.</span>
                                            </div>
                                            <div class="juez-tooltip">
                                                <button type="button" class="btn btn-outline-primary btn-lg loac-pm-btn" data-name="@lastName">@lastName</button>
                                                <span class="juez-tooltiptext">Short-code for last name of the user.</span>
                                            </div>
                                            <div class="juez-tooltip">
                                                <button type="button" class="btn btn-outline-primary btn-lg loac-pm-btn" data-name="@name">@name</button>
                                                <span class="juez-tooltiptext">Short-code for full name of the user.</span>
                                            </div>
                                        </div>
                                        <div class="form-group mb-0">
                                            <textarea class="form-control shadow-none text-area-size" rows="5" id="loac-personalMessage" 
                                                placeholder="Ex: Hi @firstName, i would like to join your network"
                                                maxlength="200"></textarea>
                                            <span id="loac-pm-limit">0/200</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="loac-totalInvite" class="font-weight-bold c-header">Total Invitation 
                            <div class="juez-tooltip">
                                <i class="fa fa-exclamation-circle"></i>
                                <span class="juez-tooltiptext">Total number invitation you want to send.</span>
                            </div>
                            </label>
                            <input type="number" class="form-control" id="loac-totalInvite" data-name="Total Invitation" placeholder="Ex: 30">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="loac-commentPerPost" class="font-weight-bold c-header">Comment per post 
                            <div class="juez-tooltip">
                                <i class="fa fa-exclamation-circle"></i>
                                <span class="juez-tooltiptext">Total number of comment you want to load per post.</span>
                            </div>
                            </label>
                            <input type="number" class="form-control" id="loac-commentPerPost" data-name="Comment per post" placeholder="Ex: 5">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="loac-totalPost" class="font-weight-bold c-header">Total post 
                            <div class="juez-tooltip">
                                <i class="fa fa-exclamation-circle"></i>
                                <span class="juez-tooltiptext">Total number of post you want to like.</span>
                            </div>
                            </label>
                            <input type="number" class="form-control" id="loac-totalPost" data-name="Total post" placeholder="Ex: 15">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="loac-totalComments" class="font-weight-bold c-header">Total comments 
                            <div class="juez-tooltip">
                                <i class="fa fa-exclamation-circle"></i>
                                <span class="juez-tooltiptext">Total number of comment you want to like.</span>
                            </div>
                            </label>
                            <input type="number" class="form-control" id="loac-totalComments" data-name="Total comments" placeholder="Ex: 20">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="loac-startPosition" class="font-weight-bold c-header">Start position 
                            <div class="juez-tooltip">
                                <i class="fa fa-exclamation-circle"></i>
                                <span class="juez-tooltiptext">Start position 0 is the first post in your feeds.</span>
                            </div>
                            </label>
                            <input type="number" class="form-control" id="loac-startPosition" data-name="Start position" placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="loac-delay" class="font-weight-bold c-header">Delay 
                            <div class="juez-tooltip">
                                <i class="fa fa-exclamation-circle"></i>
                                <span class="juez-tooltiptext">Delay in seconds between each liking or connecting in seconds.</span>
                            </div>
                            </label>
                            <input type="number" class="form-control" id="loac-delay" data-name="Delay" placeholder="Ex: 10">
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <span id="loac-error-notice" style="color:red"></span>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-likePost" value="">
                            <label class="custom-control-label" for="loac-likePost" style="color:black;font-weight:bold;">Like post
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Like post</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-likeComments">
                            <label class="custom-control-label" for="loac-likeComments" style="color:black;font-weight:bold;">Like comments
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Like comments</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-postBasedKeyword">
                            <label class="custom-control-label" for="loac-postBasedKeyword" style="color:black;font-weight:bold;">Search post based on keyword
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Check this if you want to search for keywords in post description.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    <!-- div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-dSkipSponsorPost">
                            <label class="custom-control-label" for="loac-dSkipSponsorPost" style="color:black;font-weight:bold;">Don't skip sponsored posts
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Check this to like or connect from sponsored post.</span>
                                </div>
                            </label>
                        </div>
                    </div -->
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-connectUserComment">
                            <label class="custom-control-label" for="loac-connectUserComment" style="color:black;font-weight:bold;">Connect to users who commented
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Send invitation to users who commented.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-excludeUserBasedKeyword">
                            <label class="custom-control-label" for="loac-excludeUserBasedKeyword" style="color:black;font-weight:bold;">Exclude users based on keywords
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Check this if you want to exclude user based on their profile title or name.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-connectUserLikePost">
                            <label class="custom-control-label" for="loac-connectUserLikePost" style="color:black;font-weight:bold;">Connect to users who liked post
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Send invitation to users who liked post.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="row">
                    
                    <div class="col-md-6">
                        <div class="custom-control custom-checkbox custom-control-inline">
                            <input type="checkbox" class="shadow-none" id="loac-connectUserBasedKeyword">
                            <label class="custom-control-label" for="loac-connectUserBasedKeyword" style="color:black;font-weight:bold;">Connect to users based on keywords
                                <div class="juez-tooltip">
                                    <i class="fa fa-exclamation-circle"></i>
                                    <span class="juez-tooltiptext">Check this if you want to connect to users based on keywords in profile title or name.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none likeAddConnect" id="likenConnect">Start</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

`;

$('body').append(likeOrConnectForm);
$('#like-connect-menu-click').click(function(){
    implementPermission('likeAddConnect')
    $('#loac-connSecondCheck').prop('checked', true);
    $('#loac-likePost').prop('checked', true);

    // append AI content to dropdown
    helper.setAIContentToDropdown('loac-aicontent')
    $('#likeOrConnectForm').modal({backdrop:'static', keyboard:false, show:true});
})

$('.loac-pm-btn').click(function(){
    let pmName = $(this).data('name')
    let pm = $('#loac-personalMessage')
    pm.val(pm.val() + pmName)
})
$('#loac-personalMessage').keyup(function(){
    var lenOfPm = $(this).val().length
    $('#loac-pm-limit').text(`${lenOfPm}/200`)
})

$('#loac-aicontent').change(function(){
    if($(this).val()) {
        let content = $(this).val() 
        let words = $(this).val().split(' ')

        $('#loac-personalMessage').val(content)
        $('#loac-pm-limit').text(`${words.length}/200`)
    } 
})