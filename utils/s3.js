
const { Upload } = require("@aws-sdk/lib-storage")
const { S3 } = require("@aws-sdk/client-s3")
const { v4: uuidv4 } = require('uuid')

async function uploadBase64(photoBase64) {

    const folder = "bill-img"

    // const photoBase64Data = new Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64')
    const photoBase64Data = new Buffer.from(photoBase64.split("base64,")[1], 'base64')

        const s3 = new S3({
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },

            region: process.env.S3_REGION,
        })

        const type = photoBase64.split(';')[0].split('/')[1]

        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${folder}/${uuidv4()}.${type}`, // type is not required
            Body: photoBase64Data,
            ContentEncoding: 'base64', // required
            ContentType: `image/${type}` // required. Notice the back ticks
        }
        
            let location = ''
            let key = ''
        try {
            const { Location, Key } = await new Upload({
                client: s3,
                params,
            }).done()
            location = Location
            key = Key
        } catch (error) {
            console.log(error)
        }

        return [location, key]
}

module.exports = { uploadBase64: uploadBase64}