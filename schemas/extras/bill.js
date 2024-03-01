
const mongoose = require("mongoose")

const billSchema = mongoose.Schema({
    uploaded_by: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    img: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    is_verified: {
        type: Boolean,
        required: true,
        default: false
    },
    message_from_treasurer: {
        type: String,
        required: true,
    }
})

module.exports = billSchema