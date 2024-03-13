
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

}

module.exports = { initialize: initialize }