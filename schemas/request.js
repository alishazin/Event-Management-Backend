
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
        position: requestObj.position
    }

}

module.exports = {initialize: initialize, toObject: toObject}