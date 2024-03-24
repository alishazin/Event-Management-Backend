require('dotenv').config()

const _ = require('lodash')
const path = require('path')
var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
var utils = require('./utils.js');
var userObj = require('../schemas/user.js');

async function sendConfirmationEmail(toEmail, eventObj, subEventObj, participantObj, UserModel) {

    const transporter = nodemailer.createTransport({
        port: 465,
        host: "smtp.gmail.com",
            auth: {
                user: process.env.MAIL_CLIENT_EMAIL,
                pass: process.env.MAIL_CLIENT_APP_PASS,
            },
        secure: true,
    });

    const handlebarOptions = {
        viewEngine: {
            extName: ".handlebars",
            partialsDir: path.resolve('./email_formats'),
            defaultLayout: false,
        },
        viewPath: path.resolve('./email_formats'),
        extName: ".handlebars",
    }
      
    transporter.use('compile', hbs(handlebarOptions));

    const event_manager = await userObj.getUserById(subEventObj.event_manager, UserModel)
    const QRCode = await utils.generateQRCode({
        event_id: eventObj._id.toString(),
        sub_event_id: subEventObj._id.toString(),
        participant_id: participantObj._id.toString()
    })
    
    const mailData = {
        from: process.env.MAIL_CLIENT_EMAIL,
        to: toEmail.trim().toLowerCase(),
        subject: "Event Registration Completed",
        attachDataUrls: true,
        template: 'confirmation',
        context: {
            event_name: _.startCase(eventObj.name),
            event_date: `${eventObj.date_from.toLocaleDateString()} ${eventObj.date_to ? ` - ${eventObj.date_to.toLocaleDateString()}` : ""}`,
            event_dept: _.toUpper(eventObj.department),
            subevent_name: _.startCase(subEventObj.name),
            eventmanager_name: event_manager ? _.startCase(event_manager.name) : null,
            eventmanager_email: event_manager ? _.toLower(event_manager.email) : null,
            participant_name: _.startCase(participantObj.name),
            participant_email: _.toLower(participantObj.email),
            participant_contact: participantObj.contact_no,
            participant_college: _.startCase(participantObj.college),
        },
        attachments: [
            {  
                filename: 'qrcode.jpg',
                content: QRCode.split("base64,")[1],
                encoding: 'base64',
                cid: 'qrcode'
            }
        ]
    };
    
    transporter.sendMail(mailData, function (err, info) {
        if(err)
          console.log(err)
        else
          console.log(info);
    });
}

module.exports = {
    sendConfirmationEmail
}