var salesNavigatorForm = `
<div class="modal" id="salesNavigatorForm">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header modal-header-bg">
                <h5 class="modal-title">Sales Navigator Leads</h5>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="row salesNavigator" style="display: none;">
                    <div class="col-md-12">
                        <div class="card card-body" style="background: #F3F6F8;">
                            <ul id="displaySalesNavigatorStatus" style="list-style: none"></ul>
                        </div>
                    </div>
                </div>

                <div class="row mt-2">
                    <div class="col-lg-6 col-sm-6">
                        <div class="form-group">
                            <label for="sn-startPosition" 
                            style="color:black;font-weight:bold;">
                                Start position
                            </label>
                            <input type="number" 
                            class="form-control shadow-none" 
                            id="sn-startPosition" 
                            placeholder="Ex: 0">
                        </div>
                    </div>
                    <div class="col-lg-6 col-sm-6">
                        <div class="form-group">
                            <label for="sn-totalLeads" 
                            style="color:black;font-weight:bold;">
                                Total
                            </label>
                            <input type="number" 
                            class="form-control shadow-none"
                            id="sn-totalLeads" 
                            placeholder="Ex: 10">
                        </div>
                    </div>
                </div>

                <h5 class="mt-4">Save to list</h5>
                <div class="row mt-2">
                    <div class="col-md-6">
                        <button type="button" 
                            class="btn btn-outline-primary btn-lg sn-select-list">
                            Select list
                        </button>
                        <button type="button" 
                            class="btn btn-outline-primary btn-lg sn-new-list">
                            New list
                        </button>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-md-12">
                        <select
                        class="form-control shadow-none select-dropdown"
                        id="sn-list"
                        style="height: 35px;">
                            <option value="">Select list</option>
                        </select>

                        <input type="text" 
                        class="form-control shadow-none"
                        style="display: none"
                        id="sn-newList"
                        value="Default list">

                        <input type="hidden" value="existing" id="list-type" />
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-primary btn-lg shadow-none salesNavigatorAction">Start Export</button>
                <button type="button" class="btn btn-outline-secondary btn-lg shadow-none" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`

$('body').append(salesNavigatorForm)
$('body').on('click','#sales-navigator-menu-click',function(){
    implementPermission('salesNavigatorAction')
    // $('#vcp-connSecondCheck').prop('checked', true);
    // let fieldId = 'vcp-audience-select';
    // getAudienceList(fieldId)
    $('#salesNavigatorForm').modal({backdrop:'static', keyboard:false, show:true})
})

$('.sn-new-list').click(function() {
    $('#sn-list').hide()
    $('#sn-newList').show()
    $('#list-type').val('new')
})
$('.sn-select-list').click(function() {
    $('#sn-list').show()
    $('#sn-newList').hide()
    $('#list-type').val('existing')
})