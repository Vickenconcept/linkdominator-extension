
var audienceCreationForm = `
<div class="modal" id="audienceCreationForm">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Create Audience</h5>
                <button type="button" class="close closeAudienceForm" >&times;</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <div class="row newAudience-notice" style="display: none; margin-bottom: 20px;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 12px;">
                            <ul id="afc-displayNewAudienceStatus" style="list-style: none; margin: 0;"></ul>
                        </div>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 24px;">
                    <label for="audience-name" class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-size: 14px;">
                        <i class="fas fa-tag me-2" style="color: #a855f7;"></i>Audience name
                    </label>
                    <input type="text" class="form-control shadow-none modern-input" id="audience-name" data-name="Audience name" placeholder="Enter audience name" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
                </div>
                <div class="row" style="margin-bottom: 24px;">
                    <div class="col-md-12">
                        <ul class="nav nav-pills modern-tabs" role="tablist" style="background: #f8f9fa; border-radius: 12px; padding: 4px; display: flex; gap: 8px;">
                            <li class="nav-item" style="flex: 1;">
                                <a class="nav-link active modern-tab-link" id="nav-link-fsearch" data-toggle="pill" href="#fsearch" style="border-radius: 8px; text-align: center; padding: 12px 16px; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <div class="juez-tooltip" style="display: flex; align-items: center; gap: 8px;">
                                        <i class="fa fa-search"></i> <span>From search</span>
                                        <span class="juez-tooltiptext">
                                            Collect users from Linkedin search.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            <!-- My Network tab commented out
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
                            -->
                            <li class="nav-item" style="flex: 1;">
                                <a class="nav-link modern-tab-link" id="nav-link-fpost" data-toggle="pill" href="#fpost" style="border-radius: 8px; text-align: center; padding: 12px 16px; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <div class="juez-tooltip" style="display: flex; align-items: center; gap: 8px;">
                                        <i class="far fa-file-alt"></i> <span>From post</span>
                                        <span class="juez-tooltiptext">
                                            Collect users from post feeds.
                                        </span>
                                    </div>
                                </a>
                            </li>
                            <!-- Event tab commented out
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
                            -->
                            <!-- Group tab commented out    
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
                                -->        
                        </ul>

                        <div class="tab-content" style="margin-top: 20px;">
                            <div id="fsearch" class="container tab-pane active">
                                <div class="form-group" style="margin-bottom: 24px;">
                                    <label for="afs-search-term" class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-size: 14px;">
                                        <i class="fas fa-search me-2" style="color: #a855f7;"></i>Search
                                    </label>
                                    <input type="text" class="form-control shadow-none modern-input" id="afs-search-term" placeholder="Enter your search term" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div id="afs-accordion7">
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseLanguage" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-language" style="color: #a855f7;"></i> Profile Language</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseKeywords" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-key" style="color: #a855f7;"></i> Keywords</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseConnectionOf" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-user-friends" style="color: #a855f7;"></i> Connections Of</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseLocation" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-map-marker-alt" style="color: #a855f7;"></i> Locations</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseCurrComp" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-building" style="color: #a855f7;"></i> Current companies</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapsePastComp" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-briefcase" style="color: #a855f7;"></i> Past companies</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseIndustry" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-industry" style="color: #a855f7;"></i> Industry</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                            <div class="card modern-filter-card" style="border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 12px; overflow: hidden; transition: all 0.3s ease;">
                                                <a class="card-link card-header c-header modern-filter-header" data-toggle="collapse" href="#afs-collapseSchool" style="color: #333; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%); border: none;">
                                                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-graduation-cap" style="color: #a855f7;"></i> School</span>
                                                    <span class="dropdown-toggle" style="transition: transform 0.3s ease;"></span>
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
                                <div class="row" style="margin-bottom: 24px;">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 12px; color: #333; font-size: 14px;">
                                                <i class="fas fa-heart me-2" style="color: #dc3545;"></i>Add users who liked
                                            </label>
                                            <!-- <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check"
                                                    id="afs-liked-none" name="user_liked" value="none">
                                                <label class="custom-control-label" for="afs-liked-none">None</label>
                                            </div> -->
                                            <div class="custom-control custom-radio custom-control-inline" style="margin-right: 16px;">
                                                <input type="radio" class="custom-control-input afs-liked-check" 
                                                    id="afs-liked-post" name="user_liked" value="post" checked style="width: 18px; height: 18px; cursor: pointer; margin-right: 6px;">
                                                <label class="custom-control-label" for="afs-liked-post" style="cursor: pointer; font-weight: 500; color: #333;">Post</label>
                                            </div>
                                            <!-- Commented out - Article and Video options not currently used in payload -->
                                            <!-- <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check" 
                                                    id="afs-liked-article" name="user_liked" value="article">
                                                <label class="custom-control-label" for="afs-liked-article">Article</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-liked-check" 
                                                    id="afs-liked-video" name="user_liked" value="video">
                                                <label class="custom-control-label" for="afs-liked-video">Video</label>
                                            </div> -->
                                        </div>
                                        <div class="form-group" style="margin-top: 12px;">
                                            <input type="text" class="form-control afs-user-like afs-post-validate modern-input" id="afs-liked-postid" 
                                                placeholder="Enter post URL or ID... Ex: https://www.linkedin.com/feed/update/urn:li:activity:7414954869389848576/ or 7414954869389848576" style="display: block; border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
                                            <!-- Commented out - Article and Video inputs not currently used -->
                                            <!-- <input type="number" class="form-control afs-user-like afs-post-validate" id="afs-liked-articleid" 
                                                placeholder="Enter article ID... Ex: 8936076462107920273">
                                            <input type="number" class="form-control afs-user-like afs-post-validate" id="afs-liked-videoid" 
                                                placeholder="Enter video ID... Ex: 6362398753827098625"> -->
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group">
                                            <label class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 12px; color: #333; font-size: 14px;">
                                                <i class="fas fa-comment me-2" style="color: #007bff;"></i>Add users who commented on
                                            </label>
                                            <!-- Commented out - None, Article, and Video options not currently used -->
                                            <!-- <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-none" name="user_commented" value="none">
                                                <label class="custom-control-label" for="afs-commented-none">None</label>
                                            </div> -->
                                            <div class="custom-control custom-radio custom-control-inline" style="margin-right: 16px;">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-post" name="user_commented" value="post" checked style="width: 18px; height: 18px; cursor: pointer; margin-right: 6px;">
                                                <label class="custom-control-label" for="afs-commented-post" style="cursor: pointer; font-weight: 500; color: #333;">Post</label>
                                            </div>
                                            <!-- Commented out - Article and Video options not currently used -->
                                            <!-- <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-article" name="user_commented" value="article">
                                                <label class="custom-control-label" for="afs-commented-article">Article</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" class="custom-control-input afs-commented-check" 
                                                    id="afs-commented-video" name="user_commented" value="video">
                                                <label class="custom-control-label" for="afs-commented-video">Video</label>
                                            </div> -->
                                        </div>
                                        <div class="form-group" style="margin-top: 12px;">
                                            <input type="text" class="form-control afs-user-commented afs-post-validate modern-input" id="afs-commented-postid" 
                                                placeholder="Enter post URL or ID... Ex: https://www.linkedin.com/feed/update/urn:li:activity:7414954869389848576/ or 7414954869389848576" style="display: block; border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
                                            <!-- Commented out - Article and Video inputs not currently used -->
                                            <!-- <input type="number" class="form-control afs-user-commented afs-post-validate" id="afs-commented-articleid" 
                                                placeholder="Enter article ID... Ex: 8936076462107920273">
                                            <input type="number" class="form-control afs-user-commented afs-post-validate" id="afs-commented-videoid" 
                                                placeholder="Enter video ID... Ex: 6362398753827098625"> -->
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
                            <!-- My Network tab content commented out
                            <div id="fnetwork" class="container tab-pane">
                                <p class="mb-2">Use this feature to collect your 1st degree connections. Sort order is <b>Recently added</b>, 
                                    which means start position 0 is the most recently added connection.
                                </p>
                                <p>Please note that linkedIn monitors user activities and has limit of certain activities a user can perform 
                                    based on account type (Free and Premium). Kindly normalize using a maximum of 50 and below daily in total 
                                    number of users to be added to your audience list.
                                </p>
                            </div>
                            -->
                        </div>
                    </div>
                </div>

                <div class="row" style="margin-bottom: 24px;">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="afs-connectionDegree" class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 12px; color: #333; font-size: 14px;">
                                <i class="fas fa-network-wired me-2" style="color: #a855f7;"></i>Connections
                            </label>
                            <div class="card-body afs-conn-degree" style="background: #f8f9fa; border-radius: 12px; padding: 16px; border: 1px solid #e0e0e0;">
                                <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                                    <div class="custom-control custom-checkbox" style="display: flex; align-items: center;">
                                        <input type="checkbox" class="shadow-none modern-checkbox" id="afs-connFirstCheck" name="first_check" value="F" style="width: 20px; height: 20px; cursor: pointer; margin-right: 8px;">
                                        <label class="" for="afs-connFirstCheck" style="margin: 0; cursor: pointer; font-weight: 500; color: #333;">1st</label>
                                    </div>
                                    <div class="custom-control custom-checkbox nfn" style="display: flex; align-items: center;">
                                        <input type="checkbox" class="shadow-none modern-checkbox" id="afs-connSecondCheck" name="second_check" value="S" style="width: 20px; height: 20px; cursor: pointer; margin-right: 8px;">
                                        <label class="" for="afs-connSecondCheck" style="margin: 0; cursor: pointer; font-weight: 500; color: #333;">2nd</label>
                                    </div>
                                    <div class="custom-control custom-checkbox nfn" style="display: flex; align-items: center;">
                                        <input type="checkbox" class="shadow-none modern-checkbox" id="afs-connThirdCheck" name="third_check" value="O" style="width: 20px; height: 20px; cursor: pointer; margin-right: 8px;">
                                        <label class="" for="afs-connThirdCheck" style="margin: 0; cursor: pointer; font-weight: 500; color: #333;">3rd+</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row" style="margin-bottom: 24px;">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="afs-positiveKeywords" class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-size: 14px;">
                                <i class="fas fa-check-circle me-2" style="color: #28a745;"></i>Positive keyword
                                <div class="juez-tooltip" style="margin-left: 6px;">
                                    <i class="fa fa-exclamation-circle" style="color: #6c757d; font-size: 12px;"></i>
                                    <span class="juez-tooltiptext">
                                        Enter comma separated keywords to search in user profile title or name to include users into audience.
                                        Keywords are not case-sensitive
                                    </span>
                                </div>
                            </label>
                            <textarea class="form-control shadow-none text-area-size modern-input" rows="3" id="afs-positiveKeywords" 
                                data-name="Positive keyword" placeholder="Ex: Ecommerce, Shopify, Affiliate Marketing" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease; resize: vertical;"></textarea>
                        </div>
                    </div>
                </div>
                <div class="row" style="margin-bottom: 24px;">
                    <div class="col-md-12">
                        <div class="form-group">
                            <label for="afs-negativeKeywords" class="font-weight-bold c-header" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-size: 14px;">
                                <i class="fas fa-times-circle me-2" style="color: #dc3545;"></i>Negative keyword
                                <div class="juez-tooltip" style="margin-left: 6px;">
                                    <i class="fa fa-exclamation-circle" style="color: #6c757d; font-size: 12px;"></i>
                                    <span class="juez-tooltiptext">
                                        Enter comma separated keywords to search in user profile title or name to exclude users from 
                                        adding into audience. Keywords are not case-sensitive
                                    </span>
                                </div>
                            </label>
                            <textarea class="form-control shadow-none text-area-size modern-input" rows="3" id="afs-negativeKeywords" 
                                placeholder="Ex: Marketing, Manager, John" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease; resize: vertical;"></textarea>
                        </div>
                    </div>
                </div>
                <div class="row" style="margin-bottom: 24px;">
                    <div class="col-lg-4 col-sm-4" style="margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="afs-startPosition" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-weight: 600; font-size: 14px;">
                                <i class="fas fa-play me-2" style="color: #a855f7;"></i>Start position
                                <div class="juez-tooltip" style="margin-left: 6px;">
                                    <i class="fa fa-exclamation-circle" style="color: #6c757d; font-size: 12px;"></i>
                                    <span class="juez-tooltiptext">Start position 0 is the most recently added connection.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none modern-input" id="afs-startPosition" placeholder="Ex: 0" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4" style="margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="afs-total" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-weight: 600; font-size: 14px;">
                                <i class="fas fa-users me-2" style="color: #a855f7;"></i>Total
                                <div class="juez-tooltip" style="margin-left: 6px;">
                                    <i class="fa fa-exclamation-circle" style="color: #6c757d; font-size: 12px;"></i>
                                    <span class="juez-tooltiptext">Total number of people you want to add to audience.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none modern-input" id="afs-total" data-name="Total" placeholder="Ex: 10" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
                        </div>
                    </div>
                    <div class="col-lg-4 col-sm-4" style="margin-bottom: 16px;">
                        <div class="form-group">
                            <label for="afs-delayTime" style="display: flex; align-items: center; margin-bottom: 8px; color: #333; font-weight: 600; font-size: 14px;">
                                <i class="fas fa-clock me-2" style="color: #a855f7;"></i>Delay
                                <div class="juez-tooltip" style="margin-left: 6px;">
                                    <i class="fa fa-exclamation-circle" style="color: #6c757d; font-size: 12px;"></i>
                                    <span class="juez-tooltiptext">Delay between each search request in seconds.</span>
                                </div>
                            </label>
                            <input type="number" class="form-control shadow-none modern-input" id="afs-delayTime" data-name="Delay" placeholder="Ex: 30" style="border-radius: 8px; border: 1px solid #e0e0e0; padding: 12px 16px; transition: all 0.3s ease;">
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
    // Reset form to clean slate - clear all inputs and messages
    $('#audience-name').val('')
    $('#afs-liked-postid').val('')
    $('#afs-commented-postid').val('')
    $('#afc-error-notice').html('')
    $('.newAudience-notice').hide()
    $('#afc-displayNewAudienceStatus').empty()
    if (typeof restoreAudienceCreationButton === 'function') {
        restoreAudienceCreationButton();
    } else {
        $('.newAudienceAction').attr('disabled', false);
    }
    
    $('#audienceCreationForm').modal('hide')
    // Refresh audience list when returning to menu
    if(typeof getAudienceNameList === 'function') {
        getAudienceNameList();
    }
    $('#audienceMenu').modal({backdrop:'static', keyboard:false, show:true})
})