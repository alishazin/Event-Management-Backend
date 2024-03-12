
const mongoose = require("mongoose")
const userObj = require("./user.js")
const eventObj = require("./event.js")
const _ = require("lodash")

const invitationSchema = mongoose.Schema({
    invitation_to: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    from_event: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    from_sub_event: {
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
    invitation_made_date: {
        type: Date,
        required: true,
        default: new Date()
    },
    invitation_response_date: {
        type: Date,
        required: false
    }
})

function initialize() {

    const InvitationModel = mongoose.model("Invitation", invitationSchema)

    return InvitationModel

}


async function toObject(
    invitationObj, UserModel, EventModel, 
    invitation_to_obj = null, from_event_obj = null, from_sub_event_obj = null
) {

    if (invitation_to_obj === null) {
        invitation_to_obj = await userObj.getById(invitationObj.invitation_to, UserModel)
    }
    if (from_event_obj === null) {
        from_event_obj = await eventObj.getEventById(invitationObj.from_event, EventModel)
    }

    if (invitationObj.from_sub_event && from_sub_event_obj === null) {
        from_sub_event_obj = eventObj.getSubEventById(invitationObj.from_sub_event.toString(), from_event_obj)
    }

    return {
        _id: invitationObj._id.toString(),
        invitation_to: userObj.toObject(invitation_to_obj),
        from_event: {
            _id: from_event_obj._id.toString(), 
            name: _.startCase(from_event_obj.name)
        },
        from_sub_event: from_sub_event_obj ? {
            _id: from_sub_event_obj._id.toString(), 
            name: _.startCase(from_sub_event_obj.name)
        } : null,
        position: invitationObj.position,
        status: invitationObj.status,
        invitation_made_date: invitationObj.invitation_made_date,
        invitation_response_date: invitationObj.status !== "waiting" ? invitationObj.invitation_response_date : null
    }

}

async function getInvitationById(id, InvitationModel, status = null) {
    let invitationObj;
    try {
        if (status) {
            invitationObj = await InvitationModel.findOne({ _id: id, status: status })
        } else {
            invitationObj = await InvitationModel.findOne({ _id: id })
        }
    } catch(err) {
        return null
    }
    if (!invitationObj) {
        return null
    }
    return invitationObj
}

module.exports = {
    initialize: initialize,
    toObject: toObject,
    getInvitationById: getInvitationById
}