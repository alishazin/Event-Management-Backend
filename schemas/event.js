
const mongoose = require("mongoose")
const _ = require("lodash")
const departments = require("./extras/departments.js")
const billSchema = require("./extras/bill.js")
const participantObj = require("./extras/participant.js")
const userObj = require("./user.js")

function initialize() {

    const subEventSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        event_manager: {
            type: mongoose.Types.ObjectId,
            required: false // will be invited later
        },
        participants: [participantObj.schema],
        bills: [billSchema],
    })

    const eventSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        date_from: {
            type: Date,
            required: true,
        },
        date_to: {
            type: Date,
            required: false, // required only if event is for multiple days
        },
        student_coordinator: {
            type: mongoose.Types.ObjectId,
            required: true
        },
        department: {
            type: String,
            enum: departments,
            required: true
        },
        treasurer: {
            type: mongoose.Types.ObjectId,
            required: false
        },
        sub_events: [subEventSchema],
        volunteers: [mongoose.Types.ObjectId]
    })

    const EventModel = mongoose.model("Event", eventSchema)

    return EventModel

}

function checkIfSubEventExist(eventObj, subEventName) {
    subEventName = subEventName.trim().toLowerCase()

    let found = false
    for (let sub_event of eventObj.sub_events) {
        if (sub_event.name === subEventName) {
            found = true
            break
        }
    }

    return found

}

function subEventToObject(obj) {
    console.log(obj);
    return {
        id: obj._id,
        name: _.startCase(obj.name),
        event_manager: obj.event_manager ? obj.event_manager : null,
        participants: obj.participants,
        bills: obj.bills,
    }
}

async function toObject(obj, UserModel) {
    return {
        id: obj.id,
        name: _.startCase(obj.name),
        date_from: obj.date_from,
        date_to: obj.date_to ? obj.date_to : null,
        department: obj.department,
        student_coordinator: obj.student_coordinator ? userObj.toObject(await userObj.getById(obj.student_coordinator, UserModel)) : null,
        treasurer: obj.treasurer ? userObj.toObject(await userObj.getById(obj.treasurer, UserModel)) : null,
        volunteers: obj.volunteers ? userObj.toObject(await userObj.getById(obj.volunteers, UserModel)) : null,
        sub_events: obj.sub_events.map((sub_event) => {
            return subEventToObject(sub_event)
        }),
    }
}

async function getEventById(id, EventModel) {
    let event;
    try {
        event = await EventModel.findOne({ _id: id })
    } catch(err) {
        return null
    }
    if (!event) {
        return null
    }
    return event
}

function getSubEventById(sub_event_id, eventObj) {
    let sub_event;
    let found = false;

    for (let subEvent of eventObj.sub_events) {
        if (subEvent._id.toString() === sub_event_id) {
            sub_event = subEvent
            found = true
            break
        }
    }

    if (found)
        return sub_event
    else
        return null
}

module.exports = {
    initialize: initialize, 
    toObject: toObject, 
    checkIfSubEventExist: checkIfSubEventExist, 
    getEventById: getEventById, 
    getSubEventById: getSubEventById
}