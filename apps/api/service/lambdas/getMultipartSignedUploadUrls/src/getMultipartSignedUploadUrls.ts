import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { mainS3Bucket = "" } = process.env;

const s3Client = new S3Client();

type Body = {

};
export const handler: Handler = async (
    event: APIGatewayProxyEvent,
    context
): Promise<APIGatewayProxyResult> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const body: Body = JSON.parse(event.body ?? "");
    const {  } = body;

    try {

        const getObjectCommand = new GetObjectCommand({
            Bucket: mainS3Bucket,
            Key: "",
        })

        const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Hi how are ya",
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error",
            }),
        };
    }
};
