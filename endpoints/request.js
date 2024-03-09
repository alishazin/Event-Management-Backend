
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const utils = require("../utils/utils.js")
const { v4: uuidv4 } = require('uuid')

function initialize(app, UserModel, EventModel, RequestModel) {

    createRequestEndpoint(app, UserModel, EventModel, RequestModel)

}

function createRequestEndpoint(app, UserModel, EventModel, RequestModel) {

    app.post("/api/request/create-request", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.post("/api/request/create-request", async (req, res) => {

        const { to_event, to_sub_event, position } = req.body

        // Required field validation
        
        const validator = utils.validateRequired([to_event, position], ["to_event", "position"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // to_event validation

        if (!utils.checkType(to_event, String)) {
            return res.status(400).send({
                "err_msg": "to_event must be a string",
                "field": "to_event"
            })
        }

        const event = await eventObj.getEventById(to_event, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "to_event is invalid",
                "field": "to_event"
            })
        }
        
        // position validation

        if (!["treasurer", "eventmanager", "volunteer"].includes(position)) {
            return res.status(400).send({
                "err_msg": "position must be one of [treasurer, eventmanager, volunteer]",
                "field": "position"
            })
        }

        // to_sub_event validation

        if (position === "eventmanager") {

            if (to_sub_event === null || to_sub_event === undefined) {
                return res.status(400).send({
                    "err_msg": "to_sub_event is a required field (since position='eventmanager')",
                    "field": "to_sub_event"
                })
            }

            if (!utils.checkType(to_sub_event, String)) {
                return res.status(400).send({
                    "err_msg": "to_sub_event must be a string",
                    "field": "to_sub_event"
                })
            }

            const sub_event = eventObj.getSubEventById(to_sub_event, event)
            if (!sub_event) {
                return res.status(400).send({
                    "err_msg": "to_sub_event is invalid",
                    "field": "to_sub_event"
                })
            }

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has a eventmanager",
                    "field": "to_sub_event"
                })
            }

        }

        res.send("asdsad")

    })

}

module.exports = { initialize: initialize }