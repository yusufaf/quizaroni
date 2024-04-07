import {
    APIGatewayAuthorizerResult,
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    APIGatewayRequestAuthorizerEvent,
    Handler,
} from "aws-lambda";
import { S3Client, CompleteMultipartUploadCommand, CompletedPart, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { mainS3Bucket = "" } = process.env;

const s3Client = new S3Client();

type RequestBody = {
    key: string;
    uploadId: string;
    parts: CompletedPart[]
};

export const handler: Handler = async (
    event: APIGatewayRequestAuthorizerEvent,
    context
): Promise<APIGatewayAuthorizerResult> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    try {

    } catch (err) {
        console.error(err);
    }
};
