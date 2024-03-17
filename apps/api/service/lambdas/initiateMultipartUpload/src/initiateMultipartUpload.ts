import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler,
} from "aws-lambda";
import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

const { mainS3Bucket = "" } = process.env;

const s3Client = new S3Client();

type Body = {
    studysetUUID: string;
    uploadType: string;
    userUUID: string;
    fileName: string;
    contentType: string;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2,
    context
): Promise<APIGatewayProxyResultV2> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    const body: Body = JSON.parse(event.body ?? "");
    const { contentType, fileName, studysetUUID, uploadType, userUUID } = body;

    const key = `${studysetUUID}/${userUUID}/${fileName}`;

    try {
        const multipartCommand = new CreateMultipartUploadCommand({
            Bucket: mainS3Bucket,
            Key: key,
            ContentType: contentType,
        });
        console.log("Sending multipart command", {
            mainS3Bucket,
            key,
            contentType,
        });
        const multipartUploadResponse = await s3Client.send(multipartCommand);
        console.log("Done sending multipart command");

        console.log("What's the return tho = ", {
            body: JSON.stringify({
                key,
                uploadId: multipartUploadResponse.UploadId,
            }),
        });
        return {
            statusCode: 200,
            body: JSON.stringify({
                key,
                uploadId: multipartUploadResponse.UploadId,
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
