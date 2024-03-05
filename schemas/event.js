
const mongoose = require("mongoose")
const departments = require("./extras/departments.js")
const billSchema = require("./extras/bill.js")
const participantSchema = require("./extras/participant.js")
const userObj = require("./user.js")

function initialize() {

    const subEventSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true,
        },
        event_manager: {
            type: mongoose.Types.ObjectId,
            required: false // will be invited later
        },
        participants: [participantSchema],
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

async function toObject(obj, UserModel) {
    return {
        id: obj.id,
        name: obj.name,
        date_from: obj.date_from,
        date_to: obj.date_to ? obj.date_to : null,
        department: obj.department,
        student_coordinator: obj.student_coordinator ? userObj.toObject(await userObj.getById(obj.student_coordinator, UserModel)) : null,
        treasurer: obj.treasurer ? userObj.toObject(await userObj.getById(obj.treasurer, UserModel)) : null,
        sub_events: obj.sub_events,
    }
}

module.exports = {initialize: initialize, toObject: toObject}