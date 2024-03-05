const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const utils = require("../utils/utils.js")
const { v4: uuidv4 } = require('uuid')
const { default: mongoose } = require("mongoose")

function initialize(app, UserModel, EventModel) {

    createEventEndpoint(app, UserModel, EventModel)

}

function createEventEndpoint(app, UserModel, EventModel) {

    app.post("/api/participant/add", authMiddleware.restrictAccess(app, UserModel, ["admin"]))
    app.post("/api/participant/add", async (req, res) => {

        const { event_id, sub_event_id, name, email, contact_no, college } = req.body

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, name, email, contact_no, college], ["event_id", "sub_event_id", "name", "email", "contact_no", "college"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        if (!utils.checkType(name, String)) {
            return res.status(400).send({
                "err_msg": "name must be a string",
                "field": "name"
            })
        }

        let event;
        try {
            event = await EventModel.findOne({ _id: event_id })
        } catch(err) {
            return res.status(400).send({
                "err_msg": "event_id is invalid",
                "field": "event_id"
            })
        }
        if (!event) {
            return res.status(400).send({
                "err_msg": "event_id is invalid",
                "field": "event_id"
            })
        }

        // event_id validation

        if (!utils.checkType(name, String)) {
            return res.status(400).send({
                "err_msg": "name must be a string",
                "field": "name"
            })
        }

        let sub_event;
        try {
            sub_event = await EventModel.findOne({ "_id": event_id, "sub_events._id": sub_event_id })
        } catch(err) {
            return res.status(400).send({
                "err_msg": "sub_event_id is invalid",
                "field": "sub_event_id"
            })
        }
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "sub_event_id is invalid",
                "field": "sub_event_id"
            })
        }

        // name validation

        if (!utils.checkType(name, String)) {
            return res.status(400).send({
                "err_msg": "name must be a string",
                "field": "name"
            })
        }

        validator = utils.checkTrimmedLength(name, 3, 30, "name")
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": "name"
            })
        }

        // email validation 

        if (!utils.checkType(email, String)) {
            return res.status(400).send({
                "err_msg": "email must be a string",
                "field": "email"
            })
        }

        if (!utils.validateEmail(email)) {
            return res.status(400).send({
                "err_msg": "invalid email",
                "field": "email"
            })
        }

        let result = await EventModel.findOne({"sub_events.participants.email": email.trim().toLowerCase()})
        if (result) return res.status(400).send({
            "err_msg": "An user with the same email exist",
            "field": "email"
        })

        // contact_no validation

        if (!utils.checkType(contact_no, String)) {
            return res.status(400).send({
                "err_msg": "contact_no must be a string",
                "field": "contact_no"
            })
        }

        validator = utils.checkTrimmedLength(contact_no, 10, 12, "contact_no")
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": "name"
            })
        }

        // college validation

        if (!utils.checkType(college, String)) {
            return res.status(400).send({
                "err_msg": "college must be a string",
                "field": "college"
            })
        }

        const participant_id = new mongoose.Types.ObjectId();

        for (let subEventObj of event.sub_events) {
            if (subEventObj._id.toString() === sub_event_id) {
                subEventObj.participants.push({
                    _id: participant_id,
                    name: name,
                    email: email,
                    contact_no: contact_no,
                    college: college
                })
            }
        }

        await event.save()

        res.send({
            _id: participant_id,
            name: name,
            email: email,
            contact_no: contact_no,
            college: college
        });

    })

    app.get("/api/participant/get", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator", "volunteer"]))
    app.get("/api/participant/get", async (req, res) => {

        const { event_id, sub_event_id, participant_id } = req.body;

        // Required field validation
    
        validator = utils.validateRequired([event_id, sub_event_id, participant_id], ["event_id", "sub_event_id", "participant_id"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        if (!utils.checkType(event_id, String)) {
            return res.status(400).send({
                "err_msg": "event_id must be a string",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        if (!utils.checkType(sub_event_id, String)) {
            return res.status(400).send({
                "err_msg": "sub_event_id must be a string",
                "field": "sub_event_id"
            })
        }

        // participant_id validation

        if (!utils.checkType(participant_id, String)) {
            return res.status(400).send({
                "err_msg": "participant_id must be a string",
                "field": "participant_id"
            })
        }

        let event;
        try {
            event = await EventModel.findOne({ _id: event_id, "sub_events._id": sub_event_id, "sub_events.participants._id" : participant_id })
        } catch(err) {
            return res.status(400).send({
                "err_msg": "participant_id is invalid",
                "field": "participant_id"
            })
        }
        if (!event) {
            return res.status(400).send({
                "err_msg": "participant_id is invalid",
                "field": "participant_id"
            })
        }

        let participantObj_;

        for (let subEventObj of event.sub_events) {
            if (subEventObj._id.toString() === sub_event_id) {
                for (let participantObj of subEventObj.participants) {
                    if (participantObj._id.toString() === participant_id) {
                        participantObj_ = {
                            name: participantObj.name,
                            email: participantObj.email,
                            contact_no: participantObj.contact_no,
                            college: participantObj.college,
                            event_details: {
                                event_name: event.name,
                                sub_event_name: subEventObj.name
                            }
                        }
                    }
                }
            }
        }

        res.send(participantObj_)

    })

}

module.exports = {initialize: initialize}