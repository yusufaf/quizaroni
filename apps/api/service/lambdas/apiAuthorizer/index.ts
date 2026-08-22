import { Runtime } from "aws-cdk-lib/aws-lambda";
import { getRole } from "../../../resources/roles";
import { LOGTO_API_RESOURCE, LOGTO_ENDPOINT } from "../../../resources/logto";
import { LambdaProps } from "models/stack";
import { Duration } from "aws-cdk-lib";
import path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export default ({
    props,
    construct
}: LambdaProps) => {
    const { appName = "", deploymentType = "" } = props;

    const functionName = "apiAuthorizer";
    const nameAndID = `${appName}-${deploymentType}-${functionName}`
    const role = getRole(`${deploymentType}-main-lambda-role`)

    const lambdaFunction = new NodejsFunction(construct, nameAndID, {
        functionName: nameAndID,
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        role,
        memorySize: 1000,
        entry: path.join(__dirname, `./src/${functionName}.ts`),
        handler: "handler",
        environment: {
            NODE_OPTIONS: '--enable-source-maps',
            logtoEndpoint: LOGTO_ENDPOINT[deploymentType],
            apiResource: LOGTO_API_RESOURCE[deploymentType],
        },
    })

    return lambdaFunction;
}

