
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const utils = require("../utils/utils.js")
const { v4: uuidv4 } = require('uuid')
const _ = require('lodash')

function initialize(app, UserModel, EventModel) {

    createEventEndpoint(app, UserModel, EventModel)
    createSubEventEndpoint(app, UserModel, EventModel)
    getEventEndpoint(app, UserModel, EventModel)

}

function createEventEndpoint(app, UserModel, EventModel) {

    app.post("/api/event/create", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/event/create", async (req, res) => {

        const { name, date_from, date_to, department } = req.body;

        // Required field validation
        
        validator = utils.validateRequired([name, date_from, department], ["name", "date_from", "department"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
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

        let result = await EventModel.findOne({name: name.trim().toLowerCase()})
        if (result) return res.status(400).send({
            "err_msg": "An event with the same name exist",
            "field": "name"
        })

        // date_from validation

        const dateFromObj = utils.validateDate(date_from)
        if (!dateFromObj) {
            return res.status(400).send({
                "err_msg": "date must be of format Y-m-d",
                "field": "date_from"
            })
        }
        
        if (!utils.isFuture(dateFromObj)) {
            return res.status(400).send({
                "err_msg": "future date is required",
                "field": "date_from"
            })
        }

        // date_to validation
        
        let dateToObj;
        if (date_to !== null && date_to !== undefined) {

            dateToObj = utils.validateDate(date_to)
            if (!dateToObj) {
                return res.status(400).send({
                    "err_msg": "date must be of format Y-m-d",
                    "field": "date_to"
                })
            }
            
            if (!utils.isFutureTo(dateToObj, dateFromObj)) {
                return res.status(400).send({
                    "err_msg": "A date future to date_from is required. If the event is for one day, don't include this field",
                    "field": "date_from"
                })
            }

        }


        // department validation

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

        const event = new EventModel({
            name: name,
            date_from: dateFromObj,
            date_to: (date_to !== null && date_to !== undefined) ? dateToObj : undefined,
            department: department,
            student_coordinator: res.locals.user._id
        })

        await event.save()

        res.status(200).send(await eventObj.toObject(event, UserModel))

    })
}

function createSubEventEndpoint(app, UserModel, EventModel) {

    app.post("/api/sub-event/create", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/sub-event/create", async (req, res) => {

        const { event_id, name } = req.body;

        // Required field validation
        
        validator = utils.validateRequired([event_id, name], ["event_id", "name"])
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

        const event = await eventObj.getEventById(event_id, EventModel);
        if (!event) {
            return res.status(400).send({
                "err_msg": "event_id is invalid",
                "field": "event_id"
            })
        }
        
        if (event.student_coordinator.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only studentcoordinator of this event can create sub-events",
                "field": "event_id"
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

        if (eventObj.checkIfSubEventExist(event, name)) {
            return res.status(400).send({
                "err_msg": "A sub event with the same name exist",
                "field": "name"
            })
        }

        event.sub_events.push({
            name: name
        })

        await event.save()

        res.send(await eventObj.toObject(event, UserModel))

    })

}

function getEventEndpoint(app, UserModel, EventModel) {

    app.get("/api/event/get-all", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "studentcoordinator", "volunteer"]))
    app.get("/api/event/get-all", async (req, res) => {

        const resData = []
        const result = await EventModel.find()

        for (let event of result) {

            resData.push(await eventObj.toObject(event, UserModel, {
                include_student_coordinator: false,
                include_sub_events: true,
                include_treasurer: false,
                include_volunteers: false,
                include_sub_event_event_manager: false,
                include_sub_event_participants: false,
                include_sub_event_bills: false,
            }))

        }

        res.status(200).send(resData)

    })

    app.get("/api/event/get-one", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "studentcoordinator", "volunteer"]))
    app.get("/api/event/get-one", async (req, res) => {

        const { id } = req.query

        const event = await eventObj.getEventById(id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "id is invalid",
                "field": "id"
            })
        }

        if (
            res.locals.userType === "admin" ||
            (res.locals.userType === "hod" && event.department === res.locals.user.department) ||
            (res.locals.userType === "studentcoordinator" && event.student_coordinator?.toString() === res.locals.user._id.toString()) ||
            (res.locals.userType === "volunteer" && event.treasurer?.toString() === res.locals.user._id.toString())
        ) {
            return res.status(200).send(await eventObj.toObject(event, UserModel))
        }

        // checks if an event_manager

        if (eventObj.checkIfEventManagerExistById(res.locals.user._id.toString(), event)) {
            
            const result = await eventObj.toObject(event, UserModel, {
                include_student_coordinator: false,
                include_sub_events: true,
                include_treasurer: false,
                include_volunteers: false,
                include_sub_event_event_manager: false,
                include_sub_event_participants: true,
                include_sub_event_bills: false,
            })

            result.sub_events = await Promise.all(result.sub_events.map(async (sub_event_obj) => {

                const sub_event_obj_full = eventObj.getSubEventById(sub_event_obj._id.toString(), event)

                if (sub_event_obj_full.event_manager?.toString() === res.locals.user._id.toString()) {
                    return await eventObj.subEventToObject(sub_event_obj_full, UserModel, {
                        include_event_manager: true,
                        include_participants: true,
                        include_bills: true,
                    })
                } else {
                    return sub_event_obj
                }

            }))

            return res.status(200).send(result)

        }

        if (eventObj.checkIfVolunteerExistById(res.locals.user._id.toString(), event)) {
            return res.status(200).send(await eventObj.toObject(event, UserModel, {
                include_student_coordinator: false,
                include_sub_events: true,
                include_treasurer: false,
                include_volunteers: false,
                include_sub_event_event_manager: false,
                include_sub_event_participants: true,
                include_sub_event_bills: false,
            }))
        }

        // for people not linked to the event at all
        return res.status(200).send(await eventObj.toObject(event, UserModel, {
            include_student_coordinator: false,
            include_sub_events: true,
            include_treasurer: false,
            include_volunteers: false,
            include_sub_event_event_manager: false,
            include_sub_event_participants: false,
            include_sub_event_bills: false,
        }))

    })


}

module.exports = { initialize: initialize }