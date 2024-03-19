
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const billObj = require("../schemas/extras/bill.js")
const utils = require("../utils/utils.js")
const event = require("./event.js")
const { default: mongoose } = require("mongoose")
const s3Client = require("../utils/s3.js")

function initialize(app, UserModel, EventModel) {

    app.post("/api/bill/upload-bill", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator", "volunteer"]))
    app.post("/api/bill/upload-bill", async (req, res) => {

        let { event_id, sub_event_id, img, description } = req.body

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, img, description], ["event_id", "sub_event_id", "img", "description"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation 

        const event = await eventObj.getEventById(event_id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "invalid event_id",
                "field": "event_id"
            })
        }

        if (event.treasurer?.toString() === res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "treasurer of the event can't upload bill",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        const sub_event = eventObj.getSubEventById(sub_event_id, event)
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "invalid sub_event",
                "field": "sub_event"
            })
        }

        // description validation

        if (!utils.checkType(description, String)) {
            return res.status(400).send({
                "err_msg": "description must be a string",
                "field": "description"
            })
        }

        validator = utils.checkTrimmedLength(description, 3, 300, "description")
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
            const [location, key] = await s3Client.uploadBase64(img)
            img = location
        }

        const billId = new mongoose.Types.ObjectId()

        sub_event.bills.push({
            _id: billId,
            uploaded_by: res.locals.user._id,
            img: img,
            description: description
        })

        await event.save()

        return res.status(200).send(
            await billObj.toObject(
                await billObj.getBillFromSubEventById(billId.toString(), sub_event),
                UserModel,
                res.locals.user
            )
        )

    })

    app.delete("/api/bill/delete-bill", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator", "volunteer"]))
    app.delete("/api/bill/delete-bill", async (req, res) => {

        const { event_id, sub_event_id, bill_id } = req.body

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, bill_id], ["event_id", "sub_event_id", "bill_id"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        const event = await eventObj.getEventById(event_id, EventModel);
        if (!event) {
            return res.status(400).send({
                "err_msg": "invalid event_id",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        const sub_event = eventObj.getSubEventById(sub_event_id, event);
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "invalid sub_event_id",
                "field": "sub_event_id"
            })
        }

        // bill_id validation

        const bill = billObj.getBillFromSubEventById(bill_id, sub_event);
        if (!bill) {
            return res.status(400).send({
                "err_msg": "invalid bill_id",
                "field": "bill_id"
            })
        }

        if (bill.uploaded_by.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only the user who uploaded the bill can delete it",
                "field": "bill_id"
            })
        }
        
        if (bill.status !== "waiting") {
            return res.status(400).send({
                "err_msg": "Can't delete bills which are not on waiting status",
                "field": "bill_id"
            })
        }

        await EventModel.findOneAndUpdate(
            { _id: event_id, "sub_events._id": sub_event_id },
            { $pull: {
                "sub_events.$.bills" : { _id: bill_id }
            }},
            { safe: true, multi: false }
        )

        return res.status(200).send("Bill Deleted Successfuly")

    })

    app.post("/api/bill/respond-to-bill", authMiddleware.restrictAccess(app, UserModel, ["volunteer"]))
    app.post("/api/bill/respond-to-bill", async (req, res) => {

        const { event_id, sub_event_id, bill_id, status, message } = req.body

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, bill_id, status], ["event_id", "sub_event_id", "bill_id", "status"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        const event = await eventObj.getEventById(event_id, EventModel);
        if (!event) {
            return res.status(400).send({
                "err_msg": "invalid event_id",
                "field": "event_id"
            })
        }

        if (event.treasurer.toString() !== res.locals.user._id.toString()) {
            return res.status(400).send({
                "err_msg": "only treasurer can respond to a bill",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        const sub_event = eventObj.getSubEventById(sub_event_id, event);
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "invalid sub_event_id",
                "field": "sub_event_id"
            })
        }

        // bill_id validation

        const bill = billObj.getBillFromSubEventById(bill_id, sub_event);
        if (!bill) {
            return res.status(400).send({
                "err_msg": "invalid bill_id",
                "field": "bill_id"
            })
        }
        
        if (bill.status !== "waiting") {
            return res.status(400).send({
                "err_msg": "You have already responded to this bill",
                "field": "bill_id"
            })
        }

        // status validation

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).send({
                "err_msg": "status must be one of ['accepted', 'rejected']",
                "field": "status"
            })
        }

        // message validation

        if (message !== null && message !== undefined) {

            if (!utils.checkType(message, String)) {
                return res.status(400).send({
                    "err_msg": "message must be a string",
                    "field": "message"
                })
            }

            validator = utils.checkTrimmedLength(message, 3, 100, "message")
            if (!validator.is_valid) {
                return res.status(400).send({
                    "err_msg": validator.err_msg,
                    "field": "message"
                })
            }

        }

        // await EventModel.findOneAndUpdate(
        //     { _id: event_id },
        //     { $set: {
        //         "sub_events.$[i].bills.$[j].status" : status,
        //         "sub_events.$[i].bills.$[j].message_from_treasurer" : message ? message : undefined,
        //         "sub_events.$[i].bills.$[j].bill_responded_date" : new Date()
        //     }},
        //     {
        //         arrayFilters: [{
        //             "i._id" : sub_event_id
        //         }, {
        //             "j._id" : bill_id
        //         }]
        //     },
        //     { safe: true, multi: false }
        // )
        
        bill.status = status
        bill.message_from_treasurer = message ? message : undefined
        bill.bill_responded_date = new Date()

        await event.save()

        return res.status(200).send(await billObj.toObject(bill, UserModel))

    })

    app.get("/api/bill/get-all", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "studentcoordinator", "volunteer"]))
    app.get("/api/bill/get-all", async (req, res) => {

        const { event_id, sub_event_id } = req.query

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id], ["event_id", "sub_event_id"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        } 

        // event_id validation

        const event = await eventObj.getEventById(event_id, EventModel)
        if(!event) {
            return res.status(400).send({
                "err_msg": "invalid event_id",
                "field": "event_id"
            })
        }

        if (!eventObj.checkIfUserPartOfEvent(res.locals.user._id.toString(), event, {
            check_studentcoordinator: true
        })) {
            return res.status(400).send({
                "err_msg": "User must be part of the event to access bills",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        const sub_event = eventObj.getSubEventById(sub_event_id, event)
        if(!sub_event) {
            return res.status(400).send({
                "err_msg": "invalid sub_event_id",
                "field": "sub_event_id"
            })
        }

        if (
            res.locals.userType === "admin" ||
            (res.locals.userType === "hod" && event.department === res.locals.user.department) ||
            (res.locals.userType === "studentcoordinator" && event.student_coordinator?.toString() === res.locals.user._id.toString()) ||
            (res.locals.userType === "volunteer" && event.treasurer?.toString() === res.locals.user._id.toString()) ||
            (res.locals.userType === "volunteer" && sub_event.event_manager?.toString() === res.locals.user._id.toString())
        ) {
            return res.status(200).send(await eventObj.subEventToObject(sub_event, UserModel, res.locals.user?._id.toString(), {
                include_event_manager: false,
                include_participants: false,
                include_bills: true,
                include_your_bills: true
            }))
        } else {
            return res.status(200).send(await eventObj.subEventToObject(sub_event, UserModel, res.locals.user?._id.toString(), {
                include_event_manager: false,
                include_participants: false,
                include_bills: false,
                include_your_bills: true
            }))
        }

    })

}

module.exports = { initialize: initialize }