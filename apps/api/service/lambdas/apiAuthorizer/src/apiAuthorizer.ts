import {
    APIGatewayAuthorizerResult,
    APIGatewayRequestAuthorizerEvent,
    Handler,
} from "aws-lambda";
import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const { userPoolId = "", clientId = "" } = process.env;

const cognitoClient = new CognitoIdentityProviderClient({});

console.log({userPoolId, clientId })
// Verifier that expects valid access tokens:
const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "access",
    clientId,
});

export const handler: Handler = async (
    event: APIGatewayRequestAuthorizerEvent,
    context
): Promise<APIGatewayAuthorizerResult> => {
    console.log(JSON.stringify({ event, context }, null, 4));

    try {
        const authorization = event.headers?.Authorization ?? event.headers?.authorization ?? "";
        const [accessToken, idToken] = authorization.split(" ");
        console.log({accessToken, idToken})

        const { userAttributes, username } = await getCognitoUserAttributes(accessToken, idToken);

        const payload = await verifier.verify(accessToken);
        console.log("Token is valid. Payload:", payload);

        return {
            principalId: "",
            // @ts-ignore 
            policyDocument: undefined, 
        }
    } catch (err) {
        console.error(err);
    }
};

const getCognitoUserAttributes = async (accessToken: string, idToken: string) => {
    const getUserCommand = new GetUserCommand({
        AccessToken: accessToken
    });
    const response = await cognitoClient.send(getUserCommand);
    const { UserAttributes: userAttributes, Username: username} = response;

    // verify(accessToken, )

    return {
        userAttributes,
        username,
    };
}
