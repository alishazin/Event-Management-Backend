
const _ = require('lodash');

const typeOf = (obj) => {
    return Object.getPrototypeOf(obj).constructor;
}

function validateRequired(values, order) {
    
    for (let x in values) {
        if (values[x] === null || values[x] === undefined || values[x] === '') {
            return {is_valid: false, err_msg: `${order[x]} is a required field`}
        }
    }
    
    return {is_valid: true}
}

function checkType(value, type) {

    if (typeOf(value) === type) return true
    return false
    
}

function checkTrimmedLength(value, min, max, name) {
    value = value.trim()

    if (min && value.length < min) {
        return {is_valid: false, err_msg: `${name} must be minimum ${min} characters`}
    } else if (max && value.length > max) {
        return {is_valid: false, err_msg: `${name} must not be more than ${max} characters`}
    }

    return {is_valid: true}
}

function validateDate(date) {
    try {
        const list = date.split("-")
        if (list.length !== 3) return false

        const dateObj = new Date(`${Number(list[0])}-${addZeroToLeft(Number(list[1]))}-${addZeroToLeft(Number(list[2]))}T00:00:00.000+00:00`)
        if (dateObj == "Invalid Date") return false
        return dateObj
        
    } catch(err) {
        return false
    }

}

function checkIfFuture(dateObj) {
    const today = new Date()
    today.setHours(0,0,0,0)

    if (today >= dateObj) return false
    return true

}

function arrayTimeValidate(array) {
    try {

        if (!(typeOf(array[0]) === Number && typeOf(array[1]) === Number)) return false

        if (array.length !== 2) return false
        if (array[0] < 0 || array[0] > 23) return false
        if (array[1] < 0 || array[1] > 59) return false
    
        return true
    } catch(err) {
        return false
    }
}

const addZeroToLeft = (value) => {
    if (value < 10)
        return `0${value}`
    return String(value)
}

function isFuture(date) {
    
    const today = new Date()
    const formattedToday = new Date(`${today.getFullYear()}-${addZeroToLeft(today.getMonth() + 1)}-${addZeroToLeft(today.getDate())}T00:00:00.000+00:00`)

    if (formattedToday.getTime() < date.getTime()) return true
    return false
}

function isFutureTo(date, dateTo) {
    
    const today = dateTo
    const formattedToday = new Date(`${today.getFullYear()}-${addZeroToLeft(today.getMonth() + 1)}-${addZeroToLeft(today.getDate())}T00:00:00.000+00:00`)

    if (formattedToday.getTime() < date.getTime()) return true
    return false
}

function isToday(date) {
    
    const today = new Date()
    const formattedToday = new Date(`${today.getFullYear()}-${addZeroToLeft(today.getMonth() + 1)}-${addZeroToLeft(today.getDate())}T00:00:00.000+00:00`)

    if (formattedToday.getTime() == date.getTime()) return true
    return false
}

function isPast(date) {
    
    const today = new Date()
    const formattedToday = new Date(`${today.getFullYear()}-${addZeroToLeft(today.getMonth() + 1)}-${addZeroToLeft(today.getDate())}T00:00:00.000+00:00`)

    if (formattedToday.getTime() > date.getTime()) return true
    return false
}

const validateEmail = (email) => {
    return String(email)
    .toLowerCase()
    .match(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

function isNumeric(value) {
    return /^-?\d+$/.test(value);
}

function isUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (err) {
      return false;
    }
}

function isBase64(string) {
    // return string.startsWith("data:image");
    const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

    return base64regex.test(string.split("base64,")[1])

}

module.exports = {
    validateRequired: validateRequired, 
    checkType: checkType, 
    checkTrimmedLength: checkTrimmedLength,
    validateDate: validateDate,
    checkIfFuture: checkIfFuture,
    arrayTimeValidate: arrayTimeValidate,
    validateEmail: validateEmail,
    addZeroToLeft: addZeroToLeft,
    isNumeric: isNumeric,
    isPast: isPast,
    isFuture: isFuture,
    isFutureTo: isFutureTo,
    isToday: isToday,
    isUrl: isUrl,
    isBase64, isBase64,
}