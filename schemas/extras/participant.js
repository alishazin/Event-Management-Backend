
const mongoose = require("mongoose")

const participantSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contact_no: {
        type: String,
        required: true
    },
    college: {
        type: String,
        required: true
    }
})

module.exports = participantSchema