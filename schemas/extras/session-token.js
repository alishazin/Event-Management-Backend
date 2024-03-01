
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
})

module.exports = sessionToken