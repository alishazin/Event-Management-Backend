
const mongoose = require("mongoose")
const _ = require("lodash")
const sessionToken = require("./extras/session-token.js")
const departments = require("./extras/departments.js")
const users = require("./extras/users.js")

const userSchema = mongoose.Schema({
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
    profile: {
        type: String,
        required: false
    },
    contact_no: {
        type: String,
        required: false,
        trim: true
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

    const UserModel = mongoose.model("User", userSchema)

    return UserModel

}

function toObject(obj, include_session_token) {
    return {
        _id: obj._id,
        type: obj.type,
        email: obj.email,
        name: _.startCase(obj.name),
        profile: obj.profile ? obj.profile : null,
        contact_no: obj.type === "participant" ? (obj.contact_no ? obj.contact_no : null) : undefined,
        department: obj.department,
        session_token: include_session_token ? obj.session_token.token : undefined 
    }
}

async function getById(idObj, UserModel) {
    return await UserModel.findOne({_id: idObj})
}

async function getUserById(id, UserModel) {
    let userObj;
    try {
        userObj = await UserModel.findOne({ _id: id })
    } catch(err) {
        return null
    }
    if (!userObj) {
        return null
    }
    return userObj
}

module.exports = {
    initialize: initialize, 
    schema: userSchema, 
    toObject: toObject, 
    getById: getById,
    getUserById: getUserById
}