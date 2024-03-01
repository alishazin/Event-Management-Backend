
const mongoose = require("mongoose")
const sessionToken = require("../extras/session-token")

const volunteerSchema = mongoose.Schema({
    type: {
        type: String,
        default: "volunteer",
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    session_token: {
        type: sessionToken,
        required: false,
    }
})

function initialize() {

    const VolunteerUser = mongoose.model("Volunteer", volunteerSchema, "users")

    return VolunteerUser

}

module.exports = {initialize: initialize, schema: volunteerSchema}