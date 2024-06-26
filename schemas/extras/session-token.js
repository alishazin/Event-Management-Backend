
const mongoose = require("mongoose")

const sessionToken = mongoose.Schema({
    token: {
        type: String,
        required: true,
    },
    created_on: {
        type: Date,
        required: true,
    }
}, { _id: false })

module.exports = sessionToken