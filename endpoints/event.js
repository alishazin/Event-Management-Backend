
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const utils = require("../utils/utils.js")
const { v4: uuidv4 } = require('uuid')
const _ = require('lodash')
const s3Client = require("../utils/s3.js")

function initialize(app, UserModel, EventModel) {

    createEventEndpoint(app, UserModel, EventModel)
    createSubEventEndpoint(app, UserModel, EventModel)
    getEventEndpoint(app, UserModel, EventModel)

}

function createEventEndpoint(app, UserModel, EventModel) {

    app.post("/api/event/create", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/event/create", async (req, res) => {

        const { name, date_from, date_to, department } = req.body;
        let { img } = req.body;

        // Required field validation
        
        validator = utils.validateRequired([name, date_from, department, img], ["name", "date_from", "department", "img"])
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

        // img validation

        if (!utils.checkType(img, String)) {
            return res.status(400).send({
                "err_msg": "img must be a string",
                "field": "img"
            })
        }

        if (!utils.isUrl(img)) {
            return res.status(400).send({
                "err_msg": "img must be either a url or base64",
                "field": "img"
            })
        }

        if (utils.isUrl(img) && utils.isBase64(img)) {
            const [location, key] = await s3Client.uploadBase64(img, "event-img")
            img = location
        }

        const event = new EventModel({
            name: name,
            date_from: dateFromObj,
            date_to: (date_to !== null && date_to !== undefined) ? dateToObj : undefined,
            department: department,
            img: img,
            student_coordinator: res.locals.user._id
        })

        await event.save()

        res.status(200).send(await eventObj.toObject(event, UserModel, res.locals.user._id.toString()))

    })
}

function createSubEventEndpoint(app, UserModel, EventModel) {

    app.post("/api/sub-event/create", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator"]))
    app.post("/api/sub-event/create", async (req, res) => {

        let { event_id, name, description, img } = req.body;

        // Required field validation
        
        validator = utils.validateRequired([event_id, name, description, img], ["event_id", "name", "description", "img"])
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

        // description validation

        if (!utils.checkType(description, String)) {
            return res.status(400).send({
                "err_msg": "description must be a string",
                "field": "description"
            })
        }

        validator = utils.checkTrimmedLength(description, 3, 1000, "description")
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": "description"
            })
        }

        // img validation

        if (!utils.checkType(img, String)) {
            return res.status(400).send({
                "err_msg": "img must be a string",
                "field": "img"
            })
        }

        if (!utils.isUrl(img)) {
            return res.status(400).send({
                "err_msg": "img must be either a url or base64",
                "field": "img"
            })
        }

        if (utils.isUrl(img) && utils.isBase64(img)) {
            const [location, key] = await s3Client.uploadBase64(img, "sub-event-img")
            img = location
        }

        event.sub_events.push({
            name: name,
            description: description,
            img: img
        })

        await event.save()

        res.send(await eventObj.toObject(event, UserModel, res.locals.user._id.toString(), {
            include_sub_event_participants: false,
            include_sub_event_bills: false,
            include_sub_event_your_bills: false
        }))

    })

}

function getEventEndpoint(app, UserModel, EventModel) {

    app.get("/api/event/get-all", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "dean", "studentcoordinator", "volunteer", "participant"]))
    app.get("/api/event/get-all", async (req, res) => {

        const resData = []
        const result = await EventModel.find()

        for (let event of result) {

            resData.push(await eventObj.toObject(event, UserModel, res.locals.user?._id.toString(), {
                include_student_coordinator: false,
                include_sub_events: true,
                include_treasurer: false,
                include_volunteers: false,
                include_sub_event_event_manager: false,
                include_sub_event_participants: false,
                include_sub_event_bills: false,
                include_sub_event_your_bills: false
            }))

        }

        res.status(200).send(resData)

    })

    app.get("/api/event/get-one", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "dean", "studentcoordinator", "volunteer", "participant"]))
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
            (res.locals.userType === "dean" && event.department === res.locals.user.department) ||
            (res.locals.userType === "studentcoordinator" && event.student_coordinator?.toString() === res.locals.user._id.toString()) ||
            (res.locals.userType === "volunteer" && event.treasurer?.toString() === res.locals.user._id.toString())
        ) {
            return res.status(200).send(await eventObj.toObject(event, UserModel, res.locals.user?._id.toString(), {
                include_sub_event_participants: false,
                include_sub_event_bills: false,
                include_sub_event_your_bills: false
            }))
        }

        // checks if an event_manager

        if (eventObj.checkIfEventManagerExistById(res.locals.user._id.toString(), event)) {
            
            const result = await eventObj.toObject(event, UserModel, res.locals.user._id.toString(), {
                include_student_coordinator: true,
                include_sub_events: true,
                include_treasurer: true,
                include_volunteers: true,
                include_sub_event_event_manager: false,
                include_sub_event_participants: false,
                include_sub_event_bills: false,
                include_sub_event_your_bills: false
            })

            result.sub_events = await Promise.all(result.sub_events.map(async (sub_event_obj) => {

                const sub_event_obj_full = eventObj.getSubEventById(sub_event_obj._id.toString(), event)

                if (sub_event_obj_full.event_manager?.toString() === res.locals.user._id.toString()) {
                    return await eventObj.subEventToObject(sub_event_obj_full, UserModel, res.locals.user._id.toString(), {
                        include_event_manager: true,
                        include_participants: false,
                        include_bills: false,
                        include_your_bills: false  
                    })
                } else {
                    return sub_event_obj
                }

            }))

            return res.status(200).send(result)

        }

        if (eventObj.checkIfVolunteerExistById(res.locals.user._id.toString(), event)) {
            return res.status(200).send(await eventObj.toObject(event, UserModel, res.locals.user._id.toString(), {
                include_student_coordinator: true,
                include_sub_events: true,
                include_treasurer: true,
                include_volunteers: true,
                include_sub_event_event_manager: false,
                include_sub_event_participants: false,
                include_sub_event_bills: false,
                include_sub_event_your_bills: false
            }))
        }

        // for people not linked to the event at all
        return res.status(200).send(await eventObj.toObject(event, UserModel, res.locals.user._id.toString(), {
            include_student_coordinator: false,
            include_sub_events: true,
            include_treasurer: false,
            include_volunteers: false,
            include_sub_event_event_manager: false,
            include_sub_event_participants: false,
            include_sub_event_bills: false,
            include_sub_event_your_bills: false
        }))

    })

    app.get("/api/event/get-on-date", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "dean", "studentcoordinator", "volunteer", "participant"]))
    app.get("/api/event/get-on-date", async (req, res) => {

        const { date, include_sub_events } = req.query

        // include_sub_events validation

        if (include_sub_events === undefined || include_sub_events === null) {
            return res.status(400).send({
                "err_msg": "include_sub_events is required",
                "field": "include_sub_events"
            }) 
        }

        if (include_sub_events !== '0' && include_sub_events !== '1') {
            return res.status(400).send({
                "err_msg": "include_sub_events must be either 0 or 1",
                "field": "include_sub_events"
            }) 
        }

        // date validation

        const dateObj = utils.validateDate(date)
        if (!dateObj) {
            return res.status(400).send({
                "err_msg": "date must be of format Y-m-d",
                "field": "date"
            })
        }

        const events = await EventModel.find({
            $or: [
                {$and: [
                    {date_from: dateObj},        
                    {date_to: null},        
                ]},
                {$and: [
                    {date_from: {$lte: dateObj}},        
                    {date_to: {$gte: dateObj}},        
                ]}
            ]
        })
        
        const returnData = []
        
        for (let event of events) {

            returnData.push({
                data: await eventObj.toObject(event, UserModel, null, {
                    include_student_coordinator: false,
                    include_treasurer: false,
                    include_volunteers: false,
                    include_sub_events: Number(include_sub_events),
                    include_sub_event_event_manager: false,
                    include_sub_event_participants: false,
                    include_sub_event_bills: false,
                    include_sub_event_your_bills: false,
                }),
                day_count: ((dateObj.getTime() - event.date_from.getTime()) / 86400000) + 1
            })

        }

        return res.send(returnData)

    })

    app.get("/api/event/summary", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "dean", "studentcoordinator", "volunteer"]))
    app.get("/api/event/summary", async (req, res) => {

        const { id } = req.query

        const event = await eventObj.getEventById(id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "id is invalid",
                "field": "id"
            })
        }

        if (!(
            res.locals.userType === "admin" ||
            (res.locals.userType === "hod" && event.department === res.locals.user.department) ||
            (res.locals.userType === "dean" && event.department === res.locals.user.department) ||
            eventObj.checkIfUserPartOfEvent(res.locals.user._id.toString(), event, {
                check_studentcoordinator: true
            })
        )) {
            return res.status(400).send({
                "err_msg": "Hod/Dean of the specific department and users who are part of the event can only access this endpoint",
                "field": ""
            })
        }

        const subEventsSummary = []
        const organizers = []
        const volunteers = []
        let total_self_enrolled_participants = 0
        let total_non_self_enrolled_participants = 0
        let total_participants_attended = 0
        let total_accepted_bill_amount = 0
        let total_waiting_bill_amount = 0

        const student_coordinator = await userObj.getUserById(event.student_coordinator, UserModel)
        organizers.push({
            _id: student_coordinator._id,
            name: _.startCase(student_coordinator.name),
            position: "Student Coordinator",
            profile: student_coordinator.profile ? student_coordinator.profile : null,
        })

        if (event.treasurer) {
            const treasurer = await userObj.getUserById(event.treasurer, UserModel)
            organizers.push({
                _id: treasurer._id,
                name: _.startCase(treasurer.name),
                position: "Treasurer",
                profile: treasurer.profile ? treasurer.profile : null,
            })
        }

        for (let sub_event of event.sub_events) {

            let totalAcceptedBillAmount = 0
            let totalWaitingBillAmount = 0

            let totalSelfEnrolledParticipants = 0
            let totalNonSelfEnrolledParticipants = 0
            let totalParticipantsAttended = 0

            if (sub_event.event_manager) {
                const event_manager = await userObj.getUserById(event.event_manager, UserModel)
                organizers.push({
                    _id: event_manager._id,
                    name: _.startCase(event_manager.name),
                    position: "Event Manager",
                    profile: event_manager.profile ? event_manager.profile : null,
                })
            }

            for (let bill of sub_event.bills) {
                if (bill.status === "accepted") {
                    totalAcceptedBillAmount += bill.amount
                } else if (bill.status === "waiting") {
                    totalWaitingBillAmount += bill.amount
                }
            }

            for (let participant of sub_event.participants) {
                if (participant.is_self_enrolled) {
                    totalSelfEnrolledParticipants += 1
                } else {
                    totalNonSelfEnrolledParticipants += 1
                }
                if (participant.is_verified) {
                    totalParticipantsAttended += 1
                }
            }

            subEventsSummary.push({
                _id: sub_event._id,
                name: _.startCase(sub_event.name),
                bill: {
                    total_accepted_bill_amount: totalAcceptedBillAmount,
                    total_waiting_bill_amount: totalWaitingBillAmount
                },
                participant: {
                    total_self_enrolled_participants: totalSelfEnrolledParticipants,
                    total_non_self_enrolled_participants: totalNonSelfEnrolledParticipants,
                    total_participants: totalSelfEnrolledParticipants + totalNonSelfEnrolledParticipants,
                    total_participants_attended: totalParticipantsAttended
                }
            })

            total_accepted_bill_amount += totalAcceptedBillAmount
            total_waiting_bill_amount += totalWaitingBillAmount

            total_self_enrolled_participants += totalSelfEnrolledParticipants
            total_non_self_enrolled_participants += totalNonSelfEnrolledParticipants
            total_participants_attended += totalParticipantsAttended

        }

        for (let volunteer of event.volunteers) {
            volunteer = await userObj.getUserById(volunteer, UserModel)
            volunteers.push({
                _id: volunteer._id,
                name: _.startCase(volunteer.name),
                profile: volunteer.profile ? volunteer.profile : null,
            })
        }

        return res.status(200).send({
            sub_events: subEventsSummary,
            bill: {
                total_accepted_bill_amount,
                total_waiting_bill_amount,
            },
            participant: {
                total_self_enrolled_participants,
                total_non_self_enrolled_participants,
                total_participants: total_self_enrolled_participants + total_non_self_enrolled_participants,
                total_participants_attended
            },
            organizing_team: {
                members: organizers,
                total_members: organizers.length
            },
            volunteering_team: {
                members: volunteers,
                total_members: volunteers.length
            },
        })

    })


}

module.exports = { initialize: initialize }