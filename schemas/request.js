
const mongoose = require("mongoose")
const userObj = require("./user.js")
const eventObj = require("./event.js")
const _ = require("lodash")

const requestSchema = mongoose.Schema({
    request_by: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    to_event: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    to_sub_event: {
        type: mongoose.Types.ObjectId,
        required: false // only if position is eventmanager
    },
    position: {
        type: String,
        enum: ['treasurer', 'eventmanager', 'volunteer']
    },
    status: {
        type: String,
        enum: ['accepted', 'rejected', 'waiting'],
        default: 'waiting'
    },
    request_made_date: {
        type: Date,
        required: true,
        default: new Date()
    },
    request_response_date: {
        type: Date,
        required: false
    }
})

function initialize() {

    const RequestModel = mongoose.model("Request", requestSchema)

    return RequestModel

}

async function toObject(
    requestObj, UserModel, EventModel, 
    request_by_obj = null, to_event_obj = null, to_sub_event_obj = null
) {

    if (request_by_obj === null) {
        request_by_obj = await userObj.getById(requestObj.request_by, UserModel)
    }
    if (to_event_obj === null) {
        to_event_obj = await eventObj.getEventById(requestObj.to_event, EventModel)
    }

    if (requestObj.to_sub_event && to_sub_event_obj === null) {
        to_sub_event_obj = eventObj.getSubEventById(requestObj.to_sub_event.toString(), to_event_obj)
    }

    return {
        _id: requestObj._id.toString(),
        request_by: userObj.toObject(request_by_obj),
        to_event: {
            _id: to_event_obj._id.toString(), 
            name: _.startCase(to_event_obj.name)
        },
        to_sub_event: to_sub_event_obj ? {
            _id: to_sub_event_obj._id.toString(), 
            name: _.startCase(to_sub_event_obj.name)
        } : null,
        position: requestObj.position,
        status: requestObj.status,
        request_made_date: requestObj.request_made_date,
        request_response_date: requestObj.status !== "waiting" ? requestObj.request_response_date : null
    }

}

async function getRequestById(id, RequestModel, status = null) {
    let event;
    try {
        if (status) {
            event = await RequestModel.findOne({ _id: id, status: status })
        } else {
            event = await RequestModel.findOne({ _id: id })
        }
    } catch(err) {
        return null
    }
    if (!event) {
        return null
    }
    return event
}

module.exports = {
    initialize: initialize, 
    toObject: toObject,
    getRequestById: getRequestById
}