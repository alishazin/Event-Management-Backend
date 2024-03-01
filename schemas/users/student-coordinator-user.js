
const mongoose = require("mongoose")
const sessionToken = require("../extras/session-token")

const studentCoordinatorSchema = mongoose.Schema({
    type: {
        type: String,
        default: "studentcoordinator",
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

    const StudentCoordinatorUser = mongoose.model("StudentCoordinator", studentCoordinatorSchema, "users")

    return StudentCoordinatorUser

}

module.exports = {initialize: initialize, schema: studentCoordinatorSchema}