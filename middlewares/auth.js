
require('dotenv').config()
const users = require("../schemas/extras/users.js")
const userObj = require("../schemas/user.js")
const utils = require("../utils/utils.js")

const possible_allowed_users = [
    "admin", ...users
]

function restrictAccess(app, UserModel, allowed_users) {

    if (!(Array.isArray(allowed_users) && allowed_users.length > 0))
        throw "allowed_users is required, and must be a non empty array"

    allowed_users.forEach(value => {
        if (!possible_allowed_users.includes(value)) 
            throw `Invalid allowed_user: ${value}`
    })

    return async function (req, res, next) {

        let authenticated = false

        if (allowed_users.includes("admin") && !authenticated) {

            const admin_access_code = req.headers['admin-access-code']
    
            if (admin_access_code === process.env.ADMIN_ACCESS_CODE) {
                res.locals.userType = "admin"
                res.locals.user = null
                authenticated = true
            }

        }

        if ((allowed_users.includes("hod") || allowed_users.includes("studentcoordinator") || allowed_users.includes("volunteer")) && !authenticated) {

            const { session_token } = req.headers
            
            // session_token validation 

            if (session_token === null || session_token === undefined) {
                return res.status(400).send({
                    "err_msg": "session_token is required",
                    "field": "session_token"
                })
            }

            if (!utils.checkType(session_token, String)) {
                return res.status(400).send({
                    "err_msg": "session_token must be a string",
                    "field": "session_token"
                })
            }

            const user = await UserModel.findOne({ "session_token.token": session_token })
            if (!user) {
                return res.status(400).send({
                    "err_msg": "Invalid session_token",
                    "field": "session_token"
                })
            }

            // checking if expired

            if (new Date().getTime() - new Date(user.session_token.created_on).getTime() > 86400000) {
                return res.status(400).send({
                    "err_msg": "Session expired",
                    "field": "session_token"
                })
            }

            if (allowed_users.includes(user.type)) {
                res.locals.userType = user.type
                res.locals.user = user
                authenticated = true
            }

        }

        if (authenticated) {
            return next()
        } else {
            return res.status(401).send({err_msg: `Invalid authentication. User must be one of [${allowed_users}]`})
        }

    }

}

module.exports = { restrictAccess: restrictAccess }