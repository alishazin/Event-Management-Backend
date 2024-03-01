
require('dotenv').config()
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")

const eventObj = require(`${__dirname}/schemas/event.js`)
const invitationObj = require(`${__dirname}/schemas/invitation.js`)
const requestObj = require(`${__dirname}/schemas/request.js`)
const hodUserObj = require(`${__dirname}/schemas/users/hod-user.js`)
const studentCoordinatorUserObj = require(`${__dirname}/schemas/users/student-coordinator-user.js`)
const volunteerUserObj = require(`${__dirname}/schemas/users/volunteer-user.js`)

// Initializing Database
mongoose.connect(`mongodb://127.0.0.1:27017/EventManagement`)

// Initializing Express App
const app = express()
app.use(cors())
app.use(express.json())

// Initialize Collections
const EventModel = eventObj.initialize()
const InvitationModel = invitationObj.initialize()
const RequestModel = requestObj.initialize()
const HodUserModel = hodUserObj.initialize()
const StudentCoordinatorUserModel = studentCoordinatorUserObj.initialize()
const VolunteerUserModel = volunteerUserObj.initialize()

// Initialize Endpoints
// eventEndpoint.initialize(app, EventModel)

// Starting Server
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server started on port ${process.env.PORT || 3000}`)
})