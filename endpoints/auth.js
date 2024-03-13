
const bcrypt = require("bcrypt") 
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const utils = require("../utils/utils.js")
const { v4: uuidv4 } = require('uuid')

function initialize(app, UserModel, EventModel) {

    createUserEndpoint(app, UserModel)
    logInEndpoint(app, UserModel)
    verifySessionTokenEndpoint(app, UserModel, EventModel)
    changePasswordEndpoint(app, UserModel)

}

function createUserEndpoint(app, UserModel) {

    app.post("/api/auth/create-user", authMiddleware.restrictAccess(app, UserModel, ["admin"]))
    app.post("/api/auth/create-user", async (req, res) => {

        const {
            type, email, name, password, department
        } = req.body

        // Required field validation

        let validator = utils.validateRequired([type, email, name, password], ["type", "email", "name", "password"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // type validation

        if (!utils.checkType(type, String)) {
            return res.status(400).send({
                "err_msg": "type must be a string",
                "field": "type"
            })
        }

        if (!users.includes(type)) {
            return res.status(400).send({
                "err_msg": `type must be one of [${users}]`,
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

        let result = await UserModel.findOne({email: email.trim().toLowerCase()})
        if (result) return res.status(400).send({
            "err_msg": "An user with the same email exist",
            "field": "email"
        })

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

        // password validation

        if (!utils.checkType(password, String || password.length < 8)) {
            return res.status(400).send({
                "err_msg": "password must be a string and 8 characters long",
                "field": "password"
            })
        }

        const hash = await bcrypt.hash(password, 10);

        // department validation

        if (type === "hod") {

            if (department === null || department === undefined) {
                return res.status(400).send({
                    "err_msg": "department is a required field",
                    "field": "department"
                })
            }

            if (!utils.checkType(department, String)) {
                return res.status(400).send({
                    "err_msg": "department must be a string",
                    "field": "department"
                })
            }    

            if (!departments.includes(department)) {
                return res.status(400).send({
                    "err_msg": `department must be one of [${departments}]`,
                    "field": "department"
                })
            }

        }

        const user = UserModel({
            type: type,
            email: email,
            name: name,
            password: hash,
            department: type === "hod" ? department : undefined
        })

        await user.save()

        return res.status(200).send(userObj.toObject(user))

    })

}

function logInEndpoint(app, UserModel) {

    app.post("/api/auth/log-in", async (req, res) => {

        const { email, password } = req.body

        const validator = utils.validateRequired([email, password], ["email", "password"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // email validation 

        if (!utils.checkType(email, String)) {
            return res.status(400).send({
                "err_msg": "email must be a string",
                "field": "email"
            })
        }

        // password validation

        if (!utils.checkType(password, String)) {
            return res.status(400).send({
                "err_msg": "password must be a string",
                "field": "password"
            })
        }

        // validation

        let user = await UserModel.findOne({email: email.trim().toLowerCase()})
        if (!user) return res.status(400).send({
            "err_msg": "Invalid credentials",
            "field": "email && password"
        })

        const result = await bcrypt.compare(password, user.password);
        if (!result) {
            return res.status(400).send({
                err_msg: "Invalid credentials",
                field: "email && password"
            })
        }

        const session_token = uuidv4()
        user.session_token = {
            token: session_token,
            created_on: new Date()
        }
        await user.save()

        return res.status(200).send({
            session_token: session_token,
            expiry_after: 86400000 
        })

    })

}

function verifySessionTokenEndpoint(app, UserModel, EventModel) {

    app.post("/api/auth/verify-session", async (req, res) => {

        const { session_token } = req.body

        const validator = utils.validateRequired([session_token], ["session_token"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // session_token validation 

        if (!utils.checkType(session_token, String)) {
            return res.status(400).send({
                "err_msg": "session_token must be a string",
                "field": "session_token"
            })
        }

        const user = await UserModel.findOne({ "session_token.token": session_token })
        if (!user) {
            return res.status(400).send({
                "err_msg": "Invalid session_token",
                "field": "session_token"
            })
        }

        // checking if expired

        if (new Date().getTime() - new Date(user.session_token.created_on).getTime() > 86400000) {
            return res.status(400).send({
                "err_msg": "Session expired",
                "field": "session_token"
            })
        }

        const all_events = await EventModel.find()
        const events_as_studentcoordinator = []
        const events_as_treasurer = []
        const events_as_eventmanager = []
        const events_as_volunteer = []

        if (user.type === "studentcoordinator") {

            for (let event of all_events) {
                if (event.student_coordinator?.toString() === user._id.toString()) {
                    events_as_studentcoordinator.push(event._id.toString())
                }
            }     

        }

        if (user.type === "volunteer") {

            for (let event of all_events) {
                if (event.treasurer?.toString() === user._id.toString()) {
                    events_as_treasurer.push(event._id.toString())
                }
            }  

            for (let event of all_events) {
                for (let sub_event of event.sub_events) {
                    if (sub_event.event_manager?.toString() === user._id.toString()) {
                        events_as_eventmanager.push(event._id.toString())
                    }
                }
            }     

            for (let event of all_events) {
                for (let volunteer of event.volunteers) {
                    if (volunteer.toString() === user._id.toString()) {
                        events_as_volunteer.push(event._id.toString())
                    }
                }
            }     

        }

        return res.status(200).send({
            ...userObj.toObject(user),
            events_as_studentcoordinator : events_as_studentcoordinator,
            events_as_treasurer : events_as_treasurer,
            events_as_eventmanager : events_as_eventmanager,
            events_as_volunteer : events_as_volunteer
        })

    })

}

function changePasswordEndpoint(app, UserModel) {

    app.post("/api/auth/change-password", authMiddleware.restrictAccess(app, UserModel, ["hod", "studentcoordinator", "volunteer"]))
    app.post("/api/auth/change-password", async (req, res) => {

        const { old_password, new_password } = req.body

        const validator = utils.validateRequired([old_password, new_password], ["old_password", "new_password"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // old_password validation

        if (!utils.checkType(old_password, String)) {
            return res.status(400).send({err_msg: "Old Password must be a string"})
        }

        const result = await bcrypt.compare(old_password, res.locals.user.password);
        if (!result) {
            return res.status(400).send({err_msg: "Invalid old password"})
        }

        // new_password validation

        if (!utils.checkType(new_password, String) || new_password.length < 8) {
            return res.status(400).send({err_msg: "New Password must be a string and 8 characters long"})
        }

        const hash = await bcrypt.hash(new_password, 10);

        res.locals.user.password = hash
        await res.locals.user.save()

        res.status(200).send(userObj.toObjectres.locals.user)

    })

}

module.exports = { initialize: initialize }