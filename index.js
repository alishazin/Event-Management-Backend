
require('dotenv').config()
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")

const eventObj = require(`${__dirname}/schemas/event.js`)
const invitationObj = require(`${__dirname}/schemas/invitation.js`)
const requestObj = require(`${__dirname}/schemas/request.js`)
const userObj = require(`${__dirname}/schemas/user.js`)

const authEndpoint = require(`${__dirname}/endpoints/auth.js`)
const eventEndpoint = require(`${__dirname}/endpoints/event.js`)
const pariticipantEndpoint = require(`${__dirname}/endpoints/participant.js`)

// Initializing Database
// mongoose.connect(`mongodb://127.0.0.1:27017/EventManagement`)
mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.dhwbvao.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`)

// Initializing Express App
const app = express()
app.use(cors())
app.use(express.json())

// Initialize Collections
const EventModel = eventObj.initialize()
const InvitationModel = invitationObj.initialize()
const RequestModel = requestObj.initialize()
const UserModel = userObj.initialize()

// Initialize Endpoints
authEndpoint.initialize(app, UserModel)
eventEndpoint.initialize(app, UserModel, EventModel)
pariticipantEndpoint.initialize(app, UserModel, EventModel)

// Starting Server
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server started on port ${process.env.PORT || 3000}`)
})