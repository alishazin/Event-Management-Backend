
const mongoose = require("mongoose")
const _ = require("lodash")
const sessionToken = require("./extras/session-token.js")
const departments = require("./extras/departments.js")
const users = require("./extras/users.js")

const hodSchema = mongoose.Schema({
    type: {
        type: String,
        enum: users,
        required: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    department: { 
        type: String,
        enum: departments,
        required: false // only for hod
    },
    session_token: {
        type: sessionToken,
        required: false,
    },
})

function initialize() {

    const UserModel = mongoose.model("User", hodSchema)

    return UserModel

}

function toObject(obj, include_session_token) {
    return {
        id: obj.id,
        type: obj.type,
        email: obj.email,
        name: _.startCase(obj.name),
        department: obj.department,
        session_token: include_session_token ? obj.session_token.token : undefined 
    }
}

async function getById(idObj, UserModel) {
    return await UserModel.findOne({_id: idObj})
}

module.exports = {initialize: initialize, schema: hodSchema, toObject: toObject, getById: getById}