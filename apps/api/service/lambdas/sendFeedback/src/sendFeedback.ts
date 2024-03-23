import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";

const { mainS3Bucket = "" } = process.env;

const s3Client = new S3Client();

type Body = {
    key: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const body: Body = JSON.parse(event.body ?? "");
    const { key } = body;    

    try {

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Successfully deleted file",
            }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error deleting file",
            }),
        };
    }
};
