
const mongoose = require("mongoose")
const sessionToken = require("../extras/session-token")
const departments = require("../extras/departments.js")

const hodSchema = mongoose.Schema({
    type: {
        type: String,
        default: "hod",
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
    department: {
        type: String,
        enum: departments,
        required: true
    },
    session_token: {
        type: sessionToken,
        required: false,
    },
})

function initialize() {

    const HodModel = mongoose.model("Hod", hodSchema, "users")

    return HodModel

}

module.exports = {initialize: initialize, schema: hodSchema}