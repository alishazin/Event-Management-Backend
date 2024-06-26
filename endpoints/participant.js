const authMiddleware = require("../middlewares/auth.js")
const departments = require("../schemas/extras/departments.js")
const participantObj = require("../schemas/extras/participant.js")
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const eventObj = require("../schemas/event.js")
const utils = require("../utils/utils.js")
const emailClient = require("../utils/email.js")
const _ = require("lodash")
const { v4: uuidv4 } = require('uuid')
const { default: mongoose } = require("mongoose")
const fs = require("fs");
const { parse } = require("csv-parse");

function initialize(app, UserModel, EventModel) {

    createParticipantEndpoint(app, UserModel, EventModel)

}

function createParticipantEndpoint(app, UserModel, EventModel) {

    app.post("/api/participant/add", authMiddleware.restrictAccess(app, UserModel, ["admin"]))
    app.post("/api/participant/add", async (req, res) => {

        const { event_id, sub_event_id, name, email, contact_no, college } = req.body

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, name, email, contact_no, college], ["event_id", "sub_event_id", "name", "email", "contact_no", "college"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        if (!utils.checkType(event_id, String)) {
            return res.status(400).send({
                "err_msg": "event_id must be a string",
                "field": "event_id"
            })
        }

        const event = await eventObj.getEventById(event_id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "event_id is invalid",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        if (!utils.checkType(sub_event_id, String)) {
            return res.status(400).send({
                "err_msg": "sub_event_id must be a string",
                "field": "sub_event_id"
            })
        }

        const sub_event = eventObj.getSubEventById(sub_event_id, event)
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "sub_event_id is invalid",
                "field": "sub_event_id"
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

        let result = participantObj.getParticipantWithEmail(email, sub_event)
        if (result) return res.status(400).send({
            "err_msg": "A user with the same email exist",
            "field": "email"
        })

        // contact_no validation

        if (!utils.checkType(contact_no, String)) {
            return res.status(400).send({
                "err_msg": "contact_no must be a string",
                "field": "contact_no"
            })
        }

        validator = utils.checkTrimmedLength(contact_no, 10, 12, "contact_no")
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": "contact_no"
            })
        }

        // college validation

        if (!utils.checkType(college, String)) {
            return res.status(400).send({
                "err_msg": "college must be a string",
                "field": "college"
            })
        }

        const participant_id = new mongoose.Types.ObjectId();
        const participant = {
            _id: participant_id,
            name: name,
            email: email,
            contact_no: contact_no,
            college: college
        };

        sub_event.participants.push(participant)

        await event.save()

        await emailClient.sendConfirmationEmail(email, event, sub_event, participant, UserModel)

        res.send({
            _id: participant_id,
            name: _.startCase(name.toLowerCase()),
            email: email.trim(),
            contact_no: contact_no.trim(),
            college: _.startCase(college.toLowerCase())
        });

    })

    app.post("/api/participant/enroll", authMiddleware.restrictAccess(app, UserModel, ["participant"]))
    app.post("/api/participant/enroll", async (req, res) => {

        const { event_id, sub_event_id, contact_no, college } = req.body

        const name = res.locals.user.name
        const email = res.locals.user.email

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, contact_no, college], ["event_id", "sub_event_id", "contact_no", "college"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        if (!utils.checkType(event_id, String)) {
            return res.status(400).send({
                "err_msg": "event_id must be a string",
                "field": "event_id"
            })
        }

        const event = await eventObj.getEventById(event_id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "event_id is invalid",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        if (!utils.checkType(sub_event_id, String)) {
            return res.status(400).send({
                "err_msg": "sub_event_id must be a string",
                "field": "sub_event_id"
            })
        }

        const sub_event = eventObj.getSubEventById(sub_event_id, event)
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "sub_event_id is invalid",
                "field": "sub_event_id"
            })
        }

        // email validation 

        let result = participantObj.getParticipantWithEmail(email, sub_event)
        if (result) return res.status(400).send({
            "err_msg": "A participant with the same email is enrolled in the sub-event",
            "field": "email"
        })

        // contact_no validation

        if (!utils.checkType(contact_no, String)) {
            return res.status(400).send({
                "err_msg": "contact_no must be a string",
                "field": "contact_no"
            })
        }

        validator = utils.checkTrimmedLength(contact_no, 10, 12, "contact_no")
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": "name"
            })
        }

        // college validation

        if (!utils.checkType(college, String)) {
            return res.status(400).send({
                "err_msg": "college must be a string",
                "field": "college"
            })
        }

        const participant_id = new mongoose.Types.ObjectId();
        const participant = {
            _id: participant_id,
            name: name,
            email: email,
            contact_no: contact_no,
            college: college,
            is_self_enrolled: true,
            id_if_self_enrolled: res.locals.user._id
        };

        sub_event.participants.push(participant)

        await event.save()

        await emailClient.sendConfirmationEmail(email, event, sub_event, participant, UserModel)

        res.send({
            _id: participant_id,
            name: _.startCase(name.toLowerCase()),
            email: email.trim(),
            contact_no: contact_no.trim(),
            college: _.startCase(college.toLowerCase())
        });

    })

    app.post("/api/participant/get", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator", "volunteer"]))
    app.post("/api/participant/get", async (req, res) => {

        const { event_id, sub_event_id, participant_id } = req.body;

        // Required field validation
    
        validator = utils.validateRequired([event_id, sub_event_id, participant_id], ["event_id", "sub_event_id", "participant_id"])
        if (!validator.is_valid) {
            return res.status(400).send({
                "err_msg": validator.err_msg,
                "field": validator.err_msg.split(" ")[0]
            })
        }

        // event_id validation

        if (!utils.checkType(event_id, String)) {
            return res.status(400).send({
                "err_msg": "event_id must be a string",
                "field": "event_id"
            })
        }

        const event = await eventObj.getEventById(event_id, EventModel)
        if (!event) {
            return res.status(400).send({
                "err_msg": "event_id is invalid",
                "field": "event_id"
            })
        }

        if (!(event.student_coordinator.toString() === res.locals.user._id.toString() || eventObj.checkIfUserPartOfEvent(res.locals.user._id.toString(), event))) {
            return res.status(400).send({
                "err_msg": "only studentcoordinator and volunteers of this event can access this endpoint",
                "field": "event_id"
            })
        }

        // sub_event_id validation

        if (!utils.checkType(sub_event_id, String)) {
            return res.status(400).send({
                "err_msg": "sub_event_id must be a string",
                "field": "sub_event_id"
            })
        }

        const sub_event = eventObj.getSubEventById(sub_event_id, event)
        if (!sub_event) {
            return res.status(400).send({
                "err_msg": "sub_event_id is invalid",
                "field": "sub_event_id"
            })
        }

        // participant_id validation

        if (!utils.checkType(participant_id, String)) {
            return res.status(400).send({
                "err_msg": "participant_id must be a string",
                "field": "participant_id"
            })
        }

        let participant = participantObj.getParticipantById(participant_id, sub_event)
        if (!participant) {
            return res.status(400).send({
                "err_msg": "participant_id is invalid",
                "field": "participant_id"
            })
        }

        let returnObj;

        returnObj = {
            ...participantObj.toObject(participant, force_is_verifed=true),
            first_verification: participant.is_verified === false ? true : false,
            event_details: {
                event_name: _.startCase(event.name),
                sub_event_name: _.startCase(sub_event.name)
            }
        }
        participant.is_verified = true
        await event.save()

        res.send(returnObj)

    })
    
    app.post("/api/participant/add-csv", authMiddleware.restrictAccess(app, UserModel, ["studentcoordinator", "volunteer"]))
    app.post("/api/participant/add-csv", async (req, res) => {

        const { event_id, sub_event_id } = req.body
        const { csv_file } = req.files

        // Required field validation
        
        validator = utils.validateRequired([event_id, sub_event_id, csv_file], ["event_id", "sub_event_id", "csv_file (as file)"])
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
                "err_msg": "User must be part of the event to add participants",
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

        // csv_file validation
        
        if (!(typeof csv_file === "object" && !Array.isArray(csv_file))) {
            return res.status(400).send({
                "err_msg": "only one file is allowed",
                "field": "csv_file"
            })
        }

        if (csv_file.type !== "text/csv") {
            return res.status(400).send({
                "err_msg": "csv_file must be a csv file",
                "field": "csv_file"
            })
        }

        validator = await validateCsv(csv_file, sub_event)

        if (validator.status !== 200) {
            return res.status(validator.status).send(validator.body)
        }

        sub_event.participants.push(...validator.formatted_data)
        await event.save()

        // Send emails (one in 5 seconds)
        let count = 0
        for (let participant of validator.formatted_data) {
            setTimeout(() => {
                emailClient.sendConfirmationEmail(participant.email, event, sub_event, participant, UserModel)        
            }, 5000 * count)
            count++;
        }

        return res.status(200).send({
            "info": `${validator.formatted_data.length} participants added.`,
        })

    })

    app.get("/api/participant/get-all", authMiddleware.restrictAccess(app, UserModel, ["admin", "hod", "dean", "studentcoordinator", "volunteer"]))
    app.get("/api/participant/get-all", async (req, res) => {

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

        if (!(
            res.locals.userType === "admin" ||
            (res.locals.userType === "hod" && event.department === res.locals.user.department) ||
            (res.locals.userType === "dean" && event.department === res.locals.user.department) ||
            eventObj.checkIfUserPartOfEvent(res.locals.user._id.toString(), event, {
                check_studentcoordinator: true
            })
        )) {
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

        return res.status(200).send(await eventObj.subEventToObject(sub_event, UserModel, res.locals.user?._id.toString(), {
            include_event_manager: false,
            include_participants: true,
            include_bills: false,
            include_your_bills: false
        }))

    })

    app.patch("/api/participant/change-name", authMiddleware.restrictAccess(app, UserModel, ["participant"]))
    app.patch("/api/participant/change-name", async (req, res) => {

        const { name, contact_no } = req.body

        // Required field validation
        
        validator = utils.validateRequired([name], ["name"])
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

        res.locals.user.name = name

        // contact_no validation

        if (contact_no !== null && contact_no !== undefined) {

            if (!utils.checkType(contact_no, String)) {
                return res.status(400).send({
                    "err_msg": "contact_no must be a string",
                    "field": "contact_no"
                })
            }
    
            validator = utils.checkTrimmedLength(contact_no, 10, 12, "contact_no")
            if (!validator.is_valid) {
                return res.status(400).send({
                    "err_msg": validator.err_msg,
                    "field": "contact_no"
                })
            }

            res.locals.user.contact_no = contact_no

        }

        await res.locals.user.save()

        res.status(200).send(userObj.toObject(res.locals.user))

    })

}

function validateCsv(csv_file, sub_event) {
    return new Promise((resolve) => {
        
        let count = 1
        const all_emails = []
        const formatted_data = []
        
        fs.createReadStream(csv_file.path)
        .pipe(parse({ delimiter: ",", from_line: 1,relax_column_count: true }))
        .on("data", function (row) {

            row = removeEmptyFieldsFromRight(row) 

            if (count === 1) {

                if (!(
                    row.length === 4 && 
                    row[0].trim().toLowerCase() === "name" &&
                    row[1].trim().toLowerCase() === "email" &&
                    row[2].trim().toLowerCase() === "contact no" &&
                    row[3].trim().toLowerCase() === "college"
                )) {
                    return resolve({status: 400, body: {
                        "err_msg": "First row must be [name, email, contact no, college]",
                        "field": "csv_file.1"
                    }})
                }

            } else {

                if (row.length !== 4) {
                    return resolve({status: 400, body: {
                        "err_msg": "All rows must have 4 values (name, email, contact no, College)",
                        "field": `csv_file.${count}`
                    }})
                }

                const [ name, email, contact_no, college ] = row

                // name validation
        
                validator = utils.checkTrimmedLength(name, 3, 30, "name")
                if (!validator.is_valid) {
                    return resolve({status: 400, body: {
                        "err_msg": validator.err_msg,
                        "field": `csv_file.${count}.name`
                    }})
                }
        
                // email validation 
        
                if (!utils.validateEmail(email)) {
                    return resolve({status: 400, body: {
                        "err_msg": "invalid email",
                        "field": `csv_file.${count}.email`
                    }})
                }

                if (all_emails.includes(email.trim().toLowerCase())) {
                    return resolve({status: 400, body: {
                        "err_msg": `Email of a user repeats in row ${count}`,
                        "field": `csv_file.${count}.email`
                    }})
                }
        
                let result = participantObj.getParticipantWithEmail(email, sub_event)
                if (result) {
                    return resolve({status: 400, body: {
                        "err_msg": "A user with the same email exist",
                        "field": `csv_file.${count}.email`
                    }})
                }

                // all_emails.push(email.trim().toLowerCase())
        
                // contact_no validation
        
                validator = utils.checkTrimmedLength(contact_no, 10, 12, "contact_no")
                if (!validator.is_valid) {
                    return resolve({status: 400, body: {
                        "err_msg": validator.err_msg,
                        "field": `csv_file.${count}.contact_no`
                    }})
                }
        
                // college validation
        
                if (!utils.checkType(college, String)) {
                    return resolve({status: 400, body: {
                        "err_msg": "college must be a string",
                        "field": `csv_file.${count}.college`
                    }})
                }

                validator = utils.checkTrimmedLength(college, 3, 50, "college")
                if (!validator.is_valid) {
                    return resolve({status: 400, body: {
                        "err_msg": validator.err_msg,
                        "field": `csv_file.${count}.college`
                    }})
                }

                formatted_data.push({
                    _id: new mongoose.Types.ObjectId(),
                    name: name,
                    email: email,
                    contact_no: contact_no,
                    college: college
                })

            }

            count++
        })
        .on("end", function () {
            return resolve({status: 200, body: {}, formatted_data: formatted_data})
        })
        .on("error", function (error) {
            console.log(error);
            return resolve({status: 500, body: error})
        });
    })
}

function removeEmptyFieldsFromRight(row) {

    for (let i=row.length-1; i>3; i--) {
        if (row[i].trim().length === 0) {
            row.splice(i,i)
        }
    }

    return row

}

module.exports = {initialize: initialize}