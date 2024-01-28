import { Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { getRole } from "../../../resources/roles";
import { LambdaProps } from "../../../models/stack";
import { Duration } from "aws-cdk-lib";
import path from "path";

export default ({
    props,
    construct
}: LambdaProps) => {
    const { appName, deploymentType = "" } = props;

    const functionName = "completeMultipartUpload";
    const nameAndID = `${deploymentType}-${functionName}`
    const role = getRole(`${deploymentType}-main-lambda-role`)

    const lambdaFunction = new LambdaFunction(construct, nameAndID, {
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.seconds(30),
        functionName: nameAndID,
        handler: `${functionName}.handler`,
        code: Code.fromAsset(path.join(__dirname, `./src`)),
        role,
        memorySize: 1000,
        environment: {
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            deploymentType,
            mainDynamoDBTable: `${appName}-${deploymentType}-main-table`,
            mainS3Bucket: `${appName}-${deploymentType}-main-bucket`,
        } 
    })

    return lambdaFunction;
}

