
const mongoose = require("mongoose")
const userObj = require("../user.js")

const billSchema = mongoose.Schema({
    uploaded_by: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    img: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true,
        required: true
    },
    status: {
        type: String,
        enum: ['accepted', 'rejected', 'waiting'],
        default: 'waiting'
    },
    message_from_treasurer: {
        type: String,
        required: false,
    },
    bill_uploaded_date: {
        type: Date,
        required: true,
        default: new Date()
    },
    bill_responded_date: {
        type: Date,
        required: false
    }
})


function getBillFromSubEventById(bill_id, sub_event) {
    let bill;
    let found = false;

    for (let billObj of sub_event.bills) {
        if (billObj._id.toString() === bill_id) {
            bill = billObj
            found = true
            break
        }
    }

    if (found)
        return bill
    else
        return null
}

async function toObject(obj, UserModel, user_obj = null) {
    return {
        _id: obj._id,
        uploaded_by: user_obj ? 
            userObj.toObject(user_obj) : 
            userObj.toObject(await userObj.getUserById(obj.uploaded_by._id, UserModel)),
        img: obj.img,
        description: obj.description,
        status: obj.status,
        message_from_treasurer: obj.message_from_treasurer ? obj.message_from_treasurer : null,
        bill_uploaded_date: obj.bill_uploaded_date ? obj.bill_uploaded_date : null,
        bill_responded_date: obj.bill_responded_date ? obj.bill_responded_date : null,
    }
}

module.exports = {
    schema: billSchema,
    toObject: toObject,
    getBillFromSubEventById: getBillFromSubEventById
}