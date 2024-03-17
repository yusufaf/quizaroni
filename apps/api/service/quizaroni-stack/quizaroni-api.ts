import { Construct } from "constructs";
import { ExtendedStackProps, LambdaProps } from "models/stack";
import {
    MethodLoggingLevel,
    RestApi,
    LambdaIntegration,
    Resource,
    ApiKey,
    UsagePlan,
} from "aws-cdk-lib/aws-apigateway";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import {
    Role,
    ServicePrincipal,
    PolicyStatement,
    ManagedPolicy,
    Effect,
} from "aws-cdk-lib/aws-iam";
import { addRole } from "../../resources/roles";
import {
    capitalizeFirstLetter,
    getDefaultExportForLambda,
} from "../../utilities/generalUtils";
import {
    CfnStage,
    CorsHttpMethod,
    HttpApi,
    HttpMethod,
    HttpStage,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup } from "aws-cdk-lib/aws-logs";

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
    prefix: string;

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
        this.prefix = `${appName}-${deploymentType}`;

        const apiNameAndID = `${this.prefix}-main`;
        const api = new HttpApi(this, apiNameAndID, {
            apiName: apiNameAndID,
            description: `${capitalizeFirstLetter(
                deploymentType
            )} API for Quizaroni`,
            corsPreflight: {
                allowHeaders: [
                    "Content-Type",
                    "X-Amz-Date",
                    "Authorization",
                    "X-Api-Key",
                ],
                allowMethods: [
                    CorsHttpMethod.OPTIONS,
                    CorsHttpMethod.GET,
                    CorsHttpMethod.POST,
                    CorsHttpMethod.PUT,
                    CorsHttpMethod.PATCH,
                    CorsHttpMethod.DELETE,
                ],
                allowCredentials: true,
                allowOrigins: [
                    "http://localhost:3000",
                    "https://quizaroni.netlify.app",
                ],
            },
        });

        // Setup the access log for APIGWv2
        const logGroupNameAndID = `${this.prefix}-api-AccessLogs`
        const accessLogs = new LogGroup(this, logGroupNameAndID,
            {
                logGroupName: logGroupNameAndID
            }
        );
        const stage = api.defaultStage?.node.defaultChild as CfnStage;
        stage.accessLogSettings = {
            destinationArn: accessLogs.logGroupArn,
            format: JSON.stringify({
                requestId: "$context.requestId",
                userAgent: "$context.identity.userAgent",
                sourceIp: "$context.identity.sourceIp",
                requestTime: "$context.requestTime",
                requestTimeEpoch: "$context.requestTimeEpoch",
                httpMethod: "$context.httpMethod",
                path: "$context.path",
                status: "$context.status",
                protocol: "$context.protocol",
                responseLength: "$context.responseLength",
                domainName: "$context.domainName",
            }),
        };

        const role = new Role(this, "ApiGWLogWriterRole", {
            assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
        });

        const policy = new PolicyStatement({
            actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams",
                "logs:PutLogEvents",
                "logs:GetLogEvents",
                "logs:FilterLogEvents",
            ],
            resources: ["*"],
        });
        role.addToPolicy(policy);
        accessLogs.grantWrite(role);

        new HttpStage(this, `${deploymentType}-stage}`, {
            httpApi: api,
            stageName: deploymentType,
        });


        this.createLambdaRoles();

        const lambdaProps = {
            construct: this,
            props,
        };

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: "/api/files/initiateMultipartUpload",
            lambdaName: "initiateMultipartUpload",
        });

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: "/api/files/completeMultipartUpload",
            lambdaName: "completeMultipartUpload",
        });

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: "/api/files/getMultipartSignedUploadUrls",
            lambdaName: "getMultipartSignedUploadUrls",
        });

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: "/api/files/deleteFile",
            lambdaName: "deleteFile",
        });
    }

    createLambdaRoles = () => {
        // Define an IAM role for the Lambda function
        const mainLambdaRoleNameAndID = `${this.deploymentType}-main-lambda-role`;
        const mainLambdaRole = new Role(this, mainLambdaRoleNameAndID, {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            roleName: mainLambdaRoleNameAndID,
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        });

        // Add a policy statement for DynamoDB access
        const dynamoDBTableName = `${this.prefix}-main-table`;
        const dynamoDBPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
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
        const s3BucketName = `${this.prefix}-main-bucket`;
        const s3PolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket",
                "s3:DeleteObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts",
            ],
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

    createLambdaHttpIntegration = async ({
        api,
        lambdaProps,
        methods = [HttpMethod.POST],
        path,
        lambdaName,
    }: {
        api: HttpApi;
        lambdaName: string;
        lambdaProps: any;
        methods?: HttpMethod[];
        path: string;
    }) => {
        const lambdaFunction: (props: LambdaProps) => NodejsFunction =
            await getDefaultExportForLambda(lambdaName);

        api.addRoutes({
            path,
            methods,
            integration: new HttpLambdaIntegration(
                `${this.deploymentType}-${lambdaName}-integration`,
                lambdaFunction({ ...lambdaProps }),
                {}
            ),
        });
    };
}
