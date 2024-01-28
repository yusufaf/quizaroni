import { Construct } from "constructs";
import { ExtendedStackProps } from "../../models/stack";
import {
    MethodLoggingLevel,
    RestApi,
    LambdaIntegration,
    Resource,
} from "aws-cdk-lib/aws-apigateway";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Role, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { addRole } from "../../resources/roles";

/* Lambdas */
import completeMultipartUpload from "../lambdas/completeMultipartUpload";
import getMultipartSignedUploadUrls from "../lambdas/getMultipartSignedUploadUrls";
import initiateMultipartUpload from "../lambdas/initiateMultipartUpload";

type CreateLambdaProxyIntegrationProps = {
    lambda: LambdaFunction;
    httpMethod: string;
    methodName: string;
    parentResource: Resource;
};

export class QuizaroniAPI extends Construct {
    account: string;
    appName: string;
    deploymentType: string;
    region: string;

    constructor(scope: Construct, id: string, props: ExtendedStackProps) {
        super(scope, id);

        const {
            appName = "quizaroni",
            deploymentType = "development",
            env,
        } = props;
        // @ts-ignore env should be defined
        const { account = "", region = "" } = env;

        this.account = account;
        this.region = region;
        this.appName = appName;
        this.deploymentType = deploymentType;

        const apiNameAndID = `${appName}-${deploymentType}-main`;
        const api = new RestApi(this, apiNameAndID, {
            restApiName: apiNameAndID,
            description: `${deploymentType.toUpperCase()} API for Quizaroni`,
            deployOptions: {
                metricsEnabled: true,
                loggingLevel: MethodLoggingLevel.INFO,
                stageName: deploymentType,
            },
            defaultCorsPreflightOptions: {
                allowHeaders: [
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                ],
                allowMethods: [
                    "GET",
                    "POST",
                    "PUT",
                    "DELETE",
                ],
                allowCredentials: true,
                allowOrigins: ["localhost:3000", "quizaroni.netlify.app"],
            },
            cloudWatchRole: true,
        });

        this.createLambdaRoles();

        const lambdaProps = {
            construct: this,
            props,
        }

        const quizaroniResource = api.root.addResource("api");

        const filesResource = quizaroniResource.addResource("files");

        this.createLambdaProxyIntegration({
          httpMethod: "POST",
          lambda: initiateMultipartUpload({...lambdaProps}),
          methodName: "initiateMultipartUpload",
          parentResource: filesResource,
        })

        this.createLambdaProxyIntegration({
            httpMethod: "POST",
            lambda: completeMultipartUpload({...lambdaProps}),
            methodName: "completeMultipartUpload",
            parentResource: filesResource,
          })

        this.createLambdaProxyIntegration({
            httpMethod: "POST",
            lambda: getMultipartSignedUploadUrls({...lambdaProps}),
            methodName: "getMultipartSignedUploadUrls",
            parentResource: filesResource,
        })
    }

    createLambdaRoles = () => {
        // Define an IAM role for the Lambda function
        const mainLambdaRoleNameAndID = `${this.deploymentType}-main-lambda-role`;
        const mainLambdaRole = new Role(this, mainLambdaRoleNameAndID, {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            roleName: mainLambdaRoleNameAndID,
        });

        // Add a policy statement for DynamoDB access
        const dynamoDBTableName = `${this.appName}-${this.deploymentType}-main`;
        const dynamoDBPolicyStatement = new PolicyStatement({
            actions: [
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
            ],
            resources: [
                `arn:aws:dynamodb:${this.region}:${this.account}:table/${dynamoDBTableName}`,
            ],
        });
        mainLambdaRole.addToPolicy(dynamoDBPolicyStatement);

        // Add a policy statement for S3 read and write access
        const s3BucketName = `${this.appName}-${this.deploymentType}-main`;
        const s3PolicyStatement = new PolicyStatement({
            actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
            resources: [
                `arn:aws:s3:::${s3BucketName}`,
                `arn:aws:s3:::${s3BucketName}/*`,
            ],
        });
        mainLambdaRole.addToPolicy(s3PolicyStatement);

        addRole(mainLambdaRoleNameAndID, mainLambdaRole);
    };

    createLambdaProxyIntegration = ({
        httpMethod,
        lambda,
        methodName,
        parentResource,
    }: CreateLambdaProxyIntegrationProps) => {
        const lambdaIntegration = new LambdaIntegration(lambda, {
            proxy: true,
        });
        const resource = parentResource.addResource(methodName);
        resource.addMethod(httpMethod, lambdaIntegration, {});
    };
}
