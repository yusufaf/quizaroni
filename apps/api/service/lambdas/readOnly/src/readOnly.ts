import { APIGatewayProxyResultV2, Handler } from "aws-lambda";
import { logRequest } from "utilities/logging";
import { READ_ONLY_MESSAGE } from "utilities/readOnly";

export const handler: Handler = async (event): Promise<APIGatewayProxyResultV2> => {
    logRequest(event);
    return {
        statusCode: 503,
        headers: { "Content-Type": "application/json", "Retry-After": "600" },
        body: JSON.stringify({ message: READ_ONLY_MESSAGE }),
    };
};
