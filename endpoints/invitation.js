
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const invitationObj = require("../schemas/invitation.js")
const utils = require("../utils/utils.js")
const mongoose = require("mongoose")

function initialize(app, UserModel, EventModel, InvitationModel) {

    app.post("/api/invitation/create-invitation", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/invitation/create-invitation", async (req, res) => {

        const { from_event, from_sub_event, to_user, position } = req.body

        // Required field validation
        
        const validator = utils.validateRequired([from_event, to_user, position], ["from_event", "to_user", "position"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // from_event validation

        if (!utils.checkType(from_event, String)) {
            return res.status(400).send({
                "err_msg": "from_event must be a string",
                "field": "from_event"
            })
        }

        const event = await eventObj.getEventById(from_event, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "from_event is invalid",
                "field": "from_event"
            })
        }

        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only studentcoordinator of the event can send invitation",
                "field": "from_event"
            })
        }

        // position validation

        if (!["treasurer", "eventmanager", "volunteer"].includes(position)) {
            return res.status(400).send({
                "err_msg": "position must be one of [treasurer, eventmanager, volunteer]",
                "field": "position"
            })
        }

        // from_sub_event validation
        
        let sub_event;
        if (position === "eventmanager") {

            if (from_sub_event === null || from_sub_event === undefined) {
                return res.status(400).send({
                    "err_msg": "from_sub_event is a required field (since position='eventmanager')",
                    "field": "from_sub_event"
                })
            }

            if (!utils.checkType(from_sub_event, String)) {
                return res.status(400).send({
                    "err_msg": "from_sub_event must be a string",
                    "field": "from_sub_event"
                })
            }

            sub_event = eventObj.getSubEventById(from_sub_event, event)
            if (!sub_event) {
                return res.status(400).send({
                    "err_msg": "from_sub_event is invalid",
                    "field": "from_sub_event"
                })
            }

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has an eventmanager",
                    "field": "from_sub_event"
                })
            }

        }

        // to_user validation

        const to_user_obj = await userObj.getUserById(to_user, UserModel)
        if (!to_user_obj) {
            return res.status(400).send({
                "err_msg": "invalid to_user (it must be a volunteer account)",
                "field": "to_user"
            })
        }

        // check if to_user is already a part of the event
        
        if (eventObj.checkIfUserPartOfEvent(to_user, event)) {
            return res.status(400).send({
                "err_msg": "to_user is already a part of the event",
                "field": "to_user"
            })
        }

        // check if an invitation is already made to the user, from same event_id

        const oldInvitation = await InvitationModel.findOne({invitation_to: to_user_obj._id, from_event: from_event, status: "waiting"})
        if (oldInvitation) {
            return res.status(400).send({
                "err_msg": "user has a pending invitation from the given event",
                "field": "from_event"
            })
        }

        // check if a treasurer already exist

        if (position === "treasurer") {
            if (event.treasurer) {
                return res.status(400).send({
                    "err_msg": "event already has a treasurer",
                    "field": "from_event"
                })
            }
        }

        const invitation = new InvitationModel({
            invitation_to: to_user_obj._id,
            from_event: event._id,
            position: position,
            from_sub_event: position === "eventmanager" ? sub_event._id : undefined,
        })

        await invitation.save()

        res.status(200).send(
            await invitationObj.toObject(
                invitation, UserModel, EventModel,
                to_user_obj, event, sub_event
            )
        )

    })

}

module.exports = { initialize: initialize }