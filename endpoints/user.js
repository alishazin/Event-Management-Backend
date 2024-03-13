
const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const utils = require("../utils/utils.js")
const event = require("./event.js")

function initialize(app, UserModel, EventModel) {

    app.get("/api/user/get-all-volunteers", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "studentcoordinator"]))
    app.get("/api/user/get-all-volunteers", async (req, res) => {

        const returnData = []

        for (let user of await UserModel.find({ type: "volunteer" })) {
            returnData.push(userObj.toObject(user))
        }

        return res.status(200).send(returnData)

    })

    app.get("/api/user/get-all-studentcoordinators", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod"]))
    app.get("/api/user/get-all-studentcoordinators", async (req, res) => {

        const returnData = []
        const all_events = await EventModel.find()

        for (let user of await UserModel.find({ type: "studentcoordinator" })) {

            const events_as_studentcoordinator = []
            
            for (let event of all_events) {

                if (event.student_coordinator?.toString() === user._id.toString()) {
                    events_as_studentcoordinator.push(event._id.toString())
                }

            }   

            returnData.push({
                ...userObj.toObject(user),
                events_as_studentcoordinator: events_as_studentcoordinator
            })
        }

        return res.status(200).send(returnData)

    })

}

module.exports = { initialize: initialize }