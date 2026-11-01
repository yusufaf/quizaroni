import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { getRole } from '../../../resources/roles';
import { LambdaProps } from 'models/stack';
import { Duration } from 'aws-cdk-lib';
import path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
    LOGTO_ENDPOINT,
    LOGTO_M2M_APP_ID,
    LOGTO_M2M_APP_SECRET,
    LOGTO_MANAGEMENT_API_RESOURCE,
} from '../../../resources/logto';

export default ({ props, construct }: LambdaProps) => {
    const { appName, deploymentType = '' } = props;

    const functionName = 'updateUsername';
    const nameAndID = `${appName}-${deploymentType}-${functionName}`;
    const role = getRole(`${deploymentType}-main-lambda-role`);

    const lambdaFunction = new NodejsFunction(construct, nameAndID, {
        functionName: nameAndID,
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        role,
        memorySize: 1000,
        entry: path.join(__dirname, `./src/${functionName}.ts`),
        handler: 'handler',
        environment: {
            deploymentType,
            NODE_OPTIONS: '--enable-source-maps',
            usersTable: `${appName}-${deploymentType}-users`,
            mainTable: `${appName}-${deploymentType}-main`,
            logtoEndpoint: LOGTO_ENDPOINT[deploymentType],
            logtoManagementApiResource: LOGTO_MANAGEMENT_API_RESOURCE,
            logtoM2mAppId: LOGTO_M2M_APP_ID,
            logtoM2mAppSecret: LOGTO_M2M_APP_SECRET,
        },
    });

    return lambdaFunction;
};
