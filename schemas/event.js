
const mongoose = require("mongoose")
const _ = require("lodash")
const departments = require("./extras/departments.js")
const billObj = require("./extras/bill.js")
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
        description: {
            type: String,
            // required: false, // should be changed
            required: true, 
            trim: true
        },
        img: {
            type: String,
            // required: false // should be changed
            required: true 
        },
        event_manager: {
            type: mongoose.Types.ObjectId,
            required: false
        },
        participants: [participantObj.schema],
        bills: [billObj.schema],
    })

    const volunteerWrapperSchema = mongoose.Schema({
        _id: {
            required: true,
            type: mongoose.Types.ObjectId
        },
        sub_event_id: {
            required: true,
            type: mongoose.Types.ObjectId
        },
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
        img: {
            type: String,
            // required: false // should be changed
            required: true
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
        volunteers: [volunteerWrapperSchema]
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

async function subEventToObject(obj, UserModel, user_id, {
    include_event_manager = true,
    include_participants = true,
    include_bills = true,
    include_your_bills = true
}) {

    const your_bills = []

    for (let bill of obj.bills) {
        if (bill.uploaded_by.toString() === user_id) {
            your_bills.push(await billObj.toObject(bill, UserModel))
        }
    }

    return {
        _id: obj._id,
        name: _.startCase(obj.name),
        description: obj.description,
        img: obj.img,
        participants_count: obj.participants.length,
        event_manager: include_event_manager ? 
            (obj.event_manager ? userObj.toObject(await userObj.getById(obj.event_manager, UserModel)) : undefined)
            : undefined,
        participants: include_participants ? obj.participants : undefined,
        bills: include_bills ? await Promise.all(obj.bills.map(async (bill) => {
            return billObj.toObject(bill, UserModel)
        })) : undefined,
        your_bills: include_your_bills ? your_bills : undefined,
    }
}

async function toObject(
    obj, UserModel, user_id, {
        include_student_coordinator = true,
        include_treasurer = true,
        include_volunteers = true,
        include_sub_events = true,
        include_sub_event_event_manager = true,
        include_sub_event_participants = true,
        include_sub_event_bills = true,
        include_sub_event_your_bills = true,
    } = {}
) {
    return {
        _id: obj.id,
        name: _.startCase(obj.name),
        date_from: obj.date_from,
        date_to: obj.date_to ? obj.date_to : null,
        department: obj.department,
        img: obj.img,
        student_coordinator: include_student_coordinator ? 
            (obj.student_coordinator ? userObj.toObject(await userObj.getById(obj.student_coordinator, UserModel)) : null)
            : undefined,
        treasurer: include_treasurer ?
            (obj.treasurer ? userObj.toObject(await userObj.getById(obj.treasurer, UserModel)) : null)
            : undefined,
        volunteers: include_volunteers ? await Promise.all(obj.volunteers.map(async (volunteer) => {
            return {
                ...userObj.toObject(await userObj.getById(volunteer._id, UserModel), false),
                sub_event_id: volunteer.sub_event_id
            }
        })) : undefined,
        sub_events: include_sub_events ? await Promise.all(obj.sub_events.map(async (sub_event) => {
            return await subEventToObject(sub_event, UserModel, user_id, {
                include_event_manager: include_sub_event_event_manager,
                include_participants: include_sub_event_participants,
                include_bills: include_sub_event_bills,
                include_your_bills: include_sub_event_your_bills
            })
        })) : undefined,
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

function checkIfVolunteerExistById(volunteer_id, eventObj) {
    let found = false;

    for (let volunteerId of eventObj.volunteers) {
        if (volunteerId.toString() === volunteer_id) {
            found = true
            break
        }
    }

    return found
}

function checkIfEventManagerExistById(event_manager_id, eventObj) {
    let found = false;

    for (let subEvent of eventObj.sub_events) {
        if (subEvent.event_manager && subEvent.event_manager.toString() === event_manager_id) {
            found = true
            break
        }
    }

    return found
}

function checkIfUserPartOfEvent(user_id, eventObj, {
    check_studentcoordinator = false
} = {}) {
    return (
        checkIfEventManagerExistById(user_id, eventObj) ||
        checkIfVolunteerExistById(user_id, eventObj) ||
        (eventObj.treasurer ? eventObj.treasurer.toString() === user_id : 0) ||
        (check_studentcoordinator ? eventObj.student_coordinator.toString() === user_id : 0)
    )
}

module.exports = {
    initialize: initialize, 
    toObject: toObject, 
    checkIfSubEventExist: checkIfSubEventExist, 
    getEventById: getEventById, 
    getSubEventById: getSubEventById,
    checkIfVolunteerExistById: checkIfVolunteerExistById,
    checkIfEventManagerExistById: checkIfEventManagerExistById,
    checkIfUserPartOfEvent: checkIfUserPartOfEvent,
    subEventToObject: subEventToObject
}