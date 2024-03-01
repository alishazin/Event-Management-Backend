
const mongoose = require("mongoose")

const invitationSchema = mongoose.Schema({
    to: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    from_event: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    position: {
        type: String,
        enum: ['treasurer', 'eventmanager', 'volunteer']
    },
    sub_event: { 
        type: mongoose.Types.ObjectId,
        required: false // only if position is eventmanager
    }
})

function initialize() {

    const InvitationModel = mongoose.model("Invitation", invitationSchema)

    return InvitationModel

}

module.exports = {initialize: initialize}