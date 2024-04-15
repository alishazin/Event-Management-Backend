
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
        if (position === "eventmanager" || position === "volunteer") {

            if (from_sub_event === null || from_sub_event === undefined) {
                return res.status(400).send({
                    "err_msg": "from_sub_event is a required field (since position='eventmanager' || position='volunteer')",
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
            from_sub_event: (position === "eventmanager" || position === "volunteer") ? sub_event._id : undefined,
        })

        await invitation.save()

        res.status(200).send(
            await invitationObj.toObject(
                invitation, UserModel, EventModel,
                to_user_obj, event, sub_event
            )
        )

    })

    app.get("/api/invitation/get-all", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.get("/api/invitation/get-all", async (req, res) => {

        const { event_id } = req.query

        // event_id validation

        if (event_id === null || event_id === undefined) {
            return res.status(400).send({
                "err_msg": "event_id is a required query parameter",
                "field": "event_id"
            })
        }

        if (!utils.checkType(event_id, String)) {
            return res.status(400).send({
                "err_msg": "event_id must be a string",
                "field": "event_id"
            })
        }
        
        const event = await eventObj.getEventById(event_id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "invalid event_id",
                "field": "event_id"
            })
        }
        
        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only studentcoordinator of the vent can view the invitations",
                "field": "event_id"
            })
        }

        const returnData = []

        const result = await InvitationModel.find({from_event: event._id})
        
        for (let invitation of result) {
            returnData.push(await invitationObj.toObject(invitation, UserModel, EventModel, null, event, null))
        }

        return res.status(200).send(returnData)

    })

    app.delete("/api/invitation/delete-invitation", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.delete("/api/invitation/delete-invitation", async (req, res) => {

        const { invitation_id } = req.body

        if (!mongoose.isValidObjectId(invitation_id)) {
            return res.status(400).send({
                "err_msg": "invalid invitation_id",
                "field": "invitation_id"
            })
        }

        const invitationObj = await InvitationModel.findOne({ _id: invitation_id, status: "waiting" })
        if (!invitationObj) {
            return res.status(400).send({
                "err_msg": "A pending invitation with invitation_id does not exist",
                "field": "invitation_id"
            })
        }

        const event = await eventObj.getEventById(invitationObj.from_event, EventModel)
        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only studentcoordinator of the event can delete invitations",
                "field": "invitation_id"
            })
        }

        await InvitationModel.findByIdAndDelete(invitation_id)

        res.status(200).send("Deleted Successfully")
    })

    app.get("/api/invitation/get-all-user", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.get("/api/invitation/get-all-user", async (req, res) => {

        const returnData = []

        const result = await InvitationModel.find({invitation_to: res.locals.user._id})
        
        for (let invitation of result) {
            returnData.push(await invitationObj.toObject(invitation, UserModel, EventModel, res.locals.user))
        }

        res.status(200).send(returnData)
    })

    app.post("/api/invitation/accept-invitation", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.post("/api/invitation/accept-invitation", async (req, res) => {

        const { invitation_id } = req.body

        if (invitation_id === null || invitation_id === undefined) {
            return res.status(400).send({
                "err_msg": "invitation_id is required",
                "field": "invitation_id"
            })
        }

        const invitation = await invitationObj.getInvitationById(invitation_id, InvitationModel)
        if (!invitation || invitation.invitation_to.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "invalid invitation_id",
                "field": "invitation_id"
            })
        }

        if (invitation.status !== "waiting") {
            return res.status(400).send({
                "err_msg": "invitation status must be waiting",
                "field": "invitation_id"
            })
        }

        const event = await eventObj.getEventById(invitation.from_event.toString(), EventModel)

        // check if user is not a part of event any way

        const invitation_to_user = await UserModel.findOne({ _id: invitation.invitation_to })
        
        if (eventObj.checkIfUserPartOfEvent(invitation_to_user._id.toString(), event)) {
            return res.status(400).send({
                "err_msg": "user is already a part of the event",
                "field": ""
            })
        }

        // Accepting request
        
        let sub_event;

        if (invitation.position === "eventmanager") {
            
            sub_event = eventObj.getSubEventById(invitation.from_sub_event.toString(), event)

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has a eventmanager",
                    "field": ""
                })
            }

            sub_event.event_manager = invitation_to_user._id

        } else if (invitation.position === "treasurer") {

            if (event.treasurer) {
                return res.status(400).send({
                    "err_msg": "event already has a treasurer",
                    "field": ""
                })
            }

            event.treasurer = invitation_to_user._id

        } else if (invitation.position === "volunteer") {

            sub_event = eventObj.getSubEventById(invitation.from_sub_event.toString(), event)

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has a eventmanager",
                    "field": ""
                })
            }

            event.volunteers.push({
                _id: invitation_to_user._id,
                sub_event_id: sub_event._id
            })

        }

        await event.save()
        
        invitation.status = "accepted"
        invitation.invitation_response_date = new Date()
        await invitation.save()

        res.status(200).send(await invitationObj.toObject(invitation, UserModel, EventModel, invitation_to_user, event, sub_event))
    })

    app.post("/api/invitation/reject-invitation", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.post("/api/invitation/reject-invitation", async (req, res) => {

        const { invitation_id } = req.body

        const invitation = await invitationObj.getInvitationById(invitation_id, InvitationModel)
        if (!invitation) {
            return res.status(400).send({
                "err_msg": "invalid invitation_id",
                "field": "invitation_id"
            })
        }

        if (invitation.status !== "waiting") {
            return res.status(400).send({
                "err_msg": "invitation status must be waiting",
                "field": "invitation_id"
            })
        }

        const user = await userObj.getUserById(invitation.invitation_to.toString(), UserModel)
        
        if (user._id.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "invitation with the given id must be for you.",
                "field": "invitation_id"
            })
        }

        // Rejecting request
                
        invitation.status = "rejected"
        invitation.invitation_response_date = new Date()
        await invitation.save()

        res.status(200).send(await invitationObj.toObject(invitation, UserModel, EventModel, user))
    })

}

module.exports = { initialize: initialize }