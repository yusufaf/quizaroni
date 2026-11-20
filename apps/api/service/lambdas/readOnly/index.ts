import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaProps } from 'models/stack';
import { Duration } from 'aws-cdk-lib';
import path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export default ({ props, construct }: LambdaProps) => {
    const { appName, deploymentType = '' } = props;

    const functionName = 'readOnly';
    const nameAndID = `${appName}-${deploymentType}-${functionName}`;

    // No role: CDK gives it a basic execution role, with no table or bucket access.
    const lambdaFunction = new NodejsFunction(construct, nameAndID, {
        functionName: nameAndID,
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(5),
        memorySize: 128,
        entry: path.join(__dirname, `./src/${functionName}.ts`),
        handler: 'handler',
        environment: {
            NODE_OPTIONS: '--enable-source-maps',
        },
    });

    return lambdaFunction;
};
