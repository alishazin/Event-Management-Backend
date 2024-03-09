
const mongoose = require("mongoose")
const _ = require("lodash")

const participantSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    contact_no: {
        type: String,
        required: true,
        trim: true
    },
    college: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    is_verified: {
        type: Boolean,
        required: true,
        default: false
    }
})

function toObject(participantObj, force_is_verifed = false) {
    return {
        name: _.startCase(participantObj.name),
        email: participantObj.email,
        contact_no: participantObj.contact_no,
        college: _.startCase(participantObj.college),
        is_verified: force_is_verifed ? true : participantObj.is_verified,
    }
}

function getParticipantWithEmail(email, sub_event) {
    let participant;
    let found = false;

    for (let participantObj of sub_event.participants) {
        if (participantObj.email === email.trim().toLowerCase()) {
            participant = participantObj
            found = true
            break
        }
    }

    if (found)
        return participant
    else
        return null
}

function getParticipantById(id, sub_event) {
    let participant;
    let found = false;

    for (let participantObj of sub_event.participants) {
        if (participantObj._id.toString() === id) {
            participant = participantObj
            found = true
            break
        }
    }

    if (found)
        return participant
    else
        return null
}

module.exports = {
    schema: participantSchema, 
    toObject: toObject, 
    getParticipantWithEmail: getParticipantWithEmail,
    getParticipantById: getParticipantById
}