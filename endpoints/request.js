
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const requestObj = require("../schemas/request.js")
const utils = require("../utils/utils.js")
const mongoose = require("mongoose")

function initialize(app, UserModel, EventModel, RequestModel) {

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
        
        let sub_event;
        if (position === "eventmanager" || position === "volunteer") {

            if (to_sub_event === null || to_sub_event === undefined) {
                return res.status(400).send({
                    "err_msg": "to_sub_event is a required field (since position='eventmanager' or position === 'volunteer')",
                    "field": "to_sub_event"
                })
            }

            if (!utils.checkType(to_sub_event, String)) {
                return res.status(400).send({
                    "err_msg": "to_sub_event must be a string",
                    "field": "to_sub_event"
                })
            }

            sub_event = eventObj.getSubEventById(to_sub_event, event)
            if (!sub_event) {
                return res.status(400).send({
                    "err_msg": "to_sub_event is invalid",
                    "field": "to_sub_event"
                })
            }

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has an eventmanager",
                    "field": "to_sub_event"
                })
            }

        }

        // check if a request is already made by the user, to same event_id

        const oldRequest = await RequestModel.findOne({request_by: res.locals.user._id, to_event: to_event, status: "waiting"})
        if (oldRequest) {
            return res.status(400).send({
                "err_msg": "user has a pending request with the given event",
                "field": "to_event"
            })
        }
        
        // check if user is not a part of event any way
        
        if (eventObj.checkIfUserPartOfEvent(res.locals.user._id.toString(), event)) {
            return res.status(400).send({
                "err_msg": "user is already a part of the event",
                "field": "to_event"
            })
        }

        // check if a treasurer already exist

        if (position === "treasurer") {
            if (event.treasurer) {
                return res.status(400).send({
                    "err_msg": "event already has a treasurer",
                    "field": "to_event"
                })
            }
        }

        const request = new RequestModel({
            request_by: res.locals.user._id,
            to_event: to_event,
            position: position,
            to_sub_event: (position === "eventmanager" || position === "volunteer") ? to_sub_event : undefined,
        })

        await request.save()

        res.status(200).send(
            await requestObj.toObject(
                request, UserModel, EventModel,
                res.locals.user, event, sub_event
            )
        )

    })

    app.get("/api/request/get-all", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.get("/api/request/get-all", async (req, res) => {

        const returnData = []

        const result = await RequestModel.find({request_by: res.locals.user._id})
        
        for (let request of result) {
            returnData.push(await requestObj.toObject(request, UserModel, EventModel, res.locals.user))
        }

        res.status(200).send(returnData)
    })

    app.delete("/api/request/delete-request", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.delete("/api/request/delete-request", async (req, res) => {

        const { request_id } = req.query

        if (!mongoose.isValidObjectId(request_id)) {
            return res.status(400).send({
                "err_msg": "invalid request_id",
                "field": "request_id"
            })
        }

        const requestObj = await RequestModel.findOne({ _id: request_id, request_by: res.locals.user._id, status: "waiting" })
        if (!requestObj) {
            return res.status(400).send({
                "err_msg": "A pending request with request_id does not exist",
                "field": "request_id"
            })
        }

        await RequestModel.findByIdAndDelete(request_id)

        res.status(200).send("Deleted Successfully")
    })

    app.get("/api/request/get-all-event", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.get("/api/request/get-all-event", async (req, res) => {

        const { event_id } = req.query

        const returnData = []

        const event = await eventObj.getEventById(event_id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "invalid event_id",
                "field": "event_id"
            })
        }

        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "user is not the student_coordinator of the given event_id",
                "field": "event_id"
            })
        }

        const result = await RequestModel.find({to_event: event._id})
        
        for (let request of result) {
            returnData.push(await requestObj.toObject(request, UserModel, EventModel, null, event))
        }

        res.status(200).send(returnData)
    })

    app.post("/api/request/accept-request", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/request/accept-request", async (req, res) => {

        const { request_id } = req.body

        const request = await requestObj.getRequestById(request_id, RequestModel)
        if (!request) {
            return res.status(400).send({
                "err_msg": "invalid request_id",
                "field": "request_id"
            })
        }

        if (request.status !== "waiting") {
            return res.status(400).send({
                "err_msg": "request status must be waiting",
                "field": "request_id"
            })
        }

        const event = await eventObj.getEventById(request.to_event.toString(), EventModel)
        
        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only student_coordinator of an event can accept request",
                "field": "request_id"
            })
        }

        // check if user is not a part of event any way

        const request_by_user = await UserModel.findOne({ _id: request.request_by })
        
        if (eventObj.checkIfUserPartOfEvent(request_by_user._id.toString(), event)) {
            return res.status(400).send({
                "err_msg": "user is already a part of the event",
                "field": ""
            })
        }

        // Accepting request
        
        let sub_event;

        if (request.position === "eventmanager") {
            
            sub_event = eventObj.getSubEventById(request.to_sub_event.toString(), event)

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has a eventmanager",
                    "field": ""
                })
            }

            sub_event.event_manager = request_by_user._id

        } else if (request.position === "treasurer") {

            if (event.treasurer) {
                return res.status(400).send({
                    "err_msg": "event already has a treasurer",
                    "field": ""
                })
            }

            event.treasurer = request_by_user._id

        } else if (request.position === "volunteer") {

            sub_event = eventObj.getSubEventById(request.to_sub_event.toString(), event)

            if (sub_event.event_manager) {
                return res.status(400).send({
                    "err_msg": "sub event already has a eventmanager",
                    "field": ""
                })
            }

            event.volunteers.push({
                _id: request_by_user._id,
                sub_event_id: sub_event._id
            })

        }

        await event.save()
        
        request.status = "accepted"
        request.request_response_date = new Date()
        await request.save()

        res.status(200).send(await requestObj.toObject(request, UserModel, EventModel, request_by_user, event, sub_event))
    })
    
    app.post("/api/request/reject-request", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/request/reject-request", async (req, res) => {

        const { request_id } = req.body

        const request = await requestObj.getRequestById(request_id, RequestModel)
        if (!request) {
            return res.status(400).send({
                "err_msg": "invalid request_id",
                "field": "request_id"
            })
        }

        if (request.status !== "waiting") {
            return res.status(400).send({
                "err_msg": "request status must be waiting",
                "field": "request_id"
            })
        }

        const event = await eventObj.getEventById(request.to_event.toString(), EventModel)
        
        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only student_coordinator of an event can reject request",
                "field": "request_id"
            })
        }

        // Rejecting request
                
        request.status = "rejected"
        request.request_response_date = new Date()
        await request.save()

        res.status(200).send(await requestObj.toObject(request, UserModel, EventModel, undefined, event, undefined))
    })

}

module.exports = { initialize: initialize }