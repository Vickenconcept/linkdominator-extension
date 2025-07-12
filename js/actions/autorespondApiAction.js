let autoRespondMessages = {
    endorsement: {},
    followup: {},
    normal: []
}
let autoRespondMessage = {}
let autoResponseModel = {
    message_type: '',
    message_keywords: '',
    total_endorse_skills: '',
    message_body: '',
    attachement: {
        status: false, 
        image: [], 
        file: []
    }
}

const getAutoRespondMessages = () => {
    $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('lk-id', linkedinId)
        },
        url: `${filterApi}/autoresponses`,
        success: function(res) {
            autoRespondMessages = res
            setAutoRespondMessagesList()
        },
        error: function(err, textStatus) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else console.log(textStatus);
        }
    })
}

const storeAutoRespondMessages = () => {
    $('.create-ar-normal').attr('disabled', true)

    $.ajax({
        method: 'post',
        beforeSend: function(request) {
            request.setRequestHeader('Content-Type', 'application/json')
            request.setRequestHeader('lk-id', linkedinId)
        },
        url: `${filterApi}/autoresponse/store`,
        data: JSON.stringify({
            message_type: autoResponseModel.message_type,
            message_keywords: autoResponseModel.message_keywords,
            total_endorse_skills: autoResponseModel.total_endorse_skills,
            message_body: autoResponseModel.message_body,
            attachement: JSON.stringify({
                status: autoResponseModel.attachement.status,
                image: autoResponseModel.attachement.image.toString(),
                file: autoResponseModel.attachement.file.toString()
            })
        }),
        success: function(res) {
            getAutoRespondMessages();
            
            $('.create-ar-normal').attr('disabled', false)
            $('#autoRespondNormalForm').modal('hide')
            $('#autoresponseList').modal({backdrop:'static', keyboard:false, show:true})
        },
        error: function(err, textStatus) {
            $('.create-ar-normal').attr('disabled', false)

            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else console.log(textStatus);
        }
    })
}

const showAutoRespondMessages = (id) => {
    $.ajax({
        method: 'get',
        beforeSend: function(request) {
            request.setRequestHeader('lk-id', linkedinId)
        },
        url: `${filterApi}/autoresponse/show/${id}`,
        success: function(res) {
            autoRespondMessage = res
        },
        error: function(err, textStatus) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else console.log(textStatus);
        }
    })
}

const updateAutoRespondMessages = (id) => {
    $('.update-ar-normal').attr('disabled', true)

    $.ajax({
        method: 'put',
        beforeSend: function(request) {
            request.setRequestHeader('Content-Type', 'application/json')
            request.setRequestHeader('lk-id', linkedinId)
        },
        url: `${filterApi}/autoresponse/update/${id}`,
        data: JSON.stringify({
            message_type: autoResponseModel.message_type,
            message_keywords: autoResponseModel.message_keywords,
            total_endorse_skills: autoResponseModel.total_endorse_skills,
            message_body: autoResponseModel.message_body,
            attachement: JSON.stringify({
                status: autoResponseModel.attachement.status,
                image: autoResponseModel.attachement.image.toString(),
                file: autoResponseModel.attachement.file.toString()
            })
        }),
        success: function(res) {
            getAutoRespondMessages();
            
            $('.update-ar-normal').attr('disabled', false)
            $('#autoRespondNormalForm').modal('hide')
            $('#autoresponseList').modal({backdrop:'static', keyboard:false, show:true})
        },
        error: function(err, textStatus) {
            $('.update-ar-normal').attr('disabled', false)

            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else console.log(textStatus);
        }
    })
}

const deleteAutoRespondMessages = (id) => {
    $.ajax({
        method: 'delete',
        beforeSend: function(request) {
            request.setRequestHeader('lk-id', linkedinId)
        },
        url: `${filterApi}/autoresponse/delete/${id}`,
        success: function(res, textStatus, xhr) {
            getAutoRespondMessages();
        },
        error: function(err, textStatus) {
            if(err.hasOwnProperty('responseJSON'))
                console.log(err.responseJSON.message);
            else console.log(textStatus);
        }
    })
}