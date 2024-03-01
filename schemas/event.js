
const mongoose = require("mongoose")
const departments = require("./extras/departments.js")
const billSchema = require("./extras/bill.js")
const participantSchema = require("./extras/participant.js")

function initialize() {

    const subEventSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true,
        },
        event_manager: {
            type: mongoose.Types.ObjectId,
            required: true
        },
        volunteers: [mongoose.Types.ObjectId],
        participants: [participantSchema],
        bills: [billSchema],
    })

    const eventSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true,
        },
        date_from: {
            type: Date,
            required: true,
        },
        date_to: {
            type: Date,
            required: true,
        },
        student_coordinator: {
            type: mongoose.Types.ObjectId,
            required: true
        },
        treasurer: {
            type: mongoose.Types.ObjectId,
            required: true
        },
        department: {
            type: String,
            enum: departments,
            required: true
        },
        sub_events: [subEventSchema],
    })

    const EventModel = mongoose.model("Event", eventSchema)

    return EventModel

}

module.exports = {initialize: initialize}