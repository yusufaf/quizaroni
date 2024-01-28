import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/*
    exports.handler = async (event, context) => {

    }
*/

import { Handler } from "aws-lambda";

export const handler: Handler = async (
    event: APIGatewayProxyEvent,
    context
): Promise<APIGatewayProxyResult> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    try {

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
