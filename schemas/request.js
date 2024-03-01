
const mongoose = require("mongoose")

const requestSchema = mongoose.Schema({
    to_event: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    to_sub_event: {
        type: mongoose.Types.ObjectId,
        required: false // only if position is eventmanager
    },
    position: {
        type: String,
        enum: ['treasurer', 'eventmanager', 'volunteer']
    }
})

function initialize() {

    const RequestModel = mongoose.model("Request", requestSchema)

    return RequestModel

}

module.exports = {initialize: initialize}