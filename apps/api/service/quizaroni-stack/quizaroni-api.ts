import { Construct } from 'constructs';
import { ExtendedStackProps, LambdaProps } from 'models/stack';
import { LambdaIntegration, Resource } from 'aws-cdk-lib/aws-apigateway';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import {
    Role,
    ServicePrincipal,
    PolicyStatement,
    ManagedPolicy,
    Effect,
} from 'aws-cdk-lib/aws-iam';
import { addRole } from '../../resources/roles';
import {
    capitalizeFirstLetter,
    getDefaultExportForLambda,
} from '../../utilities/generalUtils';
import {
    CfnStage,
    CorsHttpMethod,
    HttpApi,
    HttpAuthorizer,
    HttpAuthorizerType,
    HttpMethod,
    HttpStage,
    IHttpRouteAuthorizer,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { DEFAULT_ALLOWED_ORIGINS } from '../../constants';
import apiAuthorizer from '../lambdas/apiAuthorizer/index';

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
    // Stages that carry per-route throttling for the public routes.
    publicRouteStages: CfnStage[] = [];

    constructor(scope: Construct, id: string, props: ExtendedStackProps) {
        super(scope, id);

        const {
            appName = 'quizaroni',
            deploymentType = 'development',
            env,
        } = props;
        // @ts-ignore env should be defined
        const { account = '', region = '' } = env;

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
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
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
                allowOrigins: DEFAULT_ALLOWED_ORIGINS,
            },
        });

        // Setup the access log for APIGWv2
        const logGroupNameAndID = `${this.prefix}-api-AccessLogs`;
        const accessLogs = new LogGroup(this, logGroupNameAndID, {
            logGroupName: logGroupNameAndID,
        });
        const stage = api.defaultStage?.node.defaultChild as CfnStage;
        stage.accessLogSettings = {
            destinationArn: accessLogs.logGroupArn,
            format: JSON.stringify({
                requestId: '$context.requestId',
                userAgent: '$context.identity.userAgent',
                sourceIp: '$context.identity.sourceIp',
                requestTime: '$context.requestTime',
                requestTimeEpoch: '$context.requestTimeEpoch',
                httpMethod: '$context.httpMethod',
                path: '$context.path',
                status: '$context.status',
                protocol: '$context.protocol',
                responseLength: '$context.responseLength',
                domainName: '$context.domainName',
                authorizerError: '$context.authorizer.error',
            }),
        };

        const apiGatewayLogWriterRole = new Role(this, 'ApiGWLogWriterRole', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
        });

        const policy = new PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:PutLogEvents',
                'logs:GetLogEvents',
                'logs:FilterLogEvents',
            ],
            resources: ['*'],
        });
        apiGatewayLogWriterRole.addToPolicy(policy);
        accessLogs.grantWrite(apiGatewayLogWriterRole);

        const namedStage = new HttpStage(this, `${deploymentType}-stage}`, {
            httpApi: api,
            stageName: deploymentType,
            autoDeploy: true,
        });
        // Both stages, so `/<stage>/api/public/...` isn't an unthrottled bypass.
        this.publicRouteStages = [stage, namedStage.node.defaultChild as CfnStage];

        this.createUpdateLambdaRoles();

        const lambdaProps = {
            construct: this,
            props,
        };

        const authorizerNameAndID = `${this.prefix}-authorizer`;
        const apiAuthorizerLambda = apiAuthorizer({ ...lambdaProps });

        // Grant API Gateway permission to invoke the authorizer Lambda function
        apiAuthorizerLambda.grantInvoke(
            new ServicePrincipal('apigateway.amazonaws.com')
        );

        const authorizerUri = `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${apiAuthorizerLambda.functionArn}/invocations`;
        const httpAuthorizer = new HttpAuthorizer(this, authorizerNameAndID, {
            authorizerName: authorizerNameAndID,
            authorizerUri,
            httpApi: api,
            identitySource: ['$request.header.Authorization'],
            // identitySources: [IdentitySource.header("Authorization")]
            type: HttpAuthorizerType.LAMBDA,
            enableSimpleResponses: true,
        });

        const httpRouteAuthorizer = HttpAuthorizer.fromHttpAuthorizerAttributes(
            this,
            `http-route-authorizer`,
            {
                authorizerId: httpAuthorizer.authorizerId,
                authorizerType: 'CUSTOM',
            }
        );

        const filesPrefix = `/api/files`;
        const studysetsPrefix = `/api/studysets`;
        const usersPrefix = `/api/users`;

        const FILES_ROUTES = [
            {
                route: `${filesPrefix}/initiate-multipart-upload`,
                lambdaName: 'initiateMultipartUpload',
            },
            {
                route: `${filesPrefix}/complete-multipart-upload`,
                lambdaName: 'completeMultipartUpload',
            },
            {
                route: `${filesPrefix}/get-multipart-signed-upload-urls`,
                lambdaName: 'getMultipartSignedUploadUrls',
            },
            {
                route: `${filesPrefix}/delete-file`,
                lambdaName: 'deleteFile',
            },
        ];

        const STUDYSETS_ROUTES: {
            route: string;
            lambdaName: string;
            methods?: HttpMethod[] | undefined;
        }[] = [
            {
                route: `${studysetsPrefix}/create-studyset`,
                lambdaName: 'createStudyset',
            },
            {
                route: `${studysetsPrefix}/delete-studyset`,
                lambdaName: 'deleteStudyset',
            },
            {
                route: `${studysetsPrefix}/get-studyset`,
                lambdaName: 'getStudyset',
                // methods: [HttpMethod.GET]
            },
            {
                route: `${studysetsPrefix}/get-all-studysets`,
                lambdaName: 'getAllStudysets',
                // methods: [HttpMethod.GET]
            },
            {
                route: `${studysetsPrefix}/update-studyset`,
                lambdaName: 'updateStudyset',
            },
            {
                route: `${studysetsPrefix}/duplicate-studyset`,
                lambdaName: 'duplicateStudyset',
            },
            {
                route: `${studysetsPrefix}/publish-studyset`,
                lambdaName: 'publishStudyset',
            },
            {
                route: `${studysetsPrefix}/unpublish-studyset`,
                lambdaName: 'unpublishStudyset',
            },
            {
                route: `${studysetsPrefix}/batch-delete-studysets`,
                lambdaName: 'batchDeleteStudysets',
            },
            {
                route: `${studysetsPrefix}/batch-duplicate-studysets`,
                lambdaName: 'batchDuplicateStudysets',
            },
            {
                route: `${studysetsPrefix}/create-labels`,
                lambdaName: 'createLabels',
            },
            {
                route: `${studysetsPrefix}/delete-labels`,
                lambdaName: 'deleteLabels',
            },
            {
                route: `${studysetsPrefix}/update-studyset-labels`,
                lambdaName: 'updateStudysetLabels',
            },
            {
                route: `${studysetsPrefix}/edit-labels`,
                lambdaName: 'editLabels',
            },
            {
                route: `${studysetsPrefix}/batch-update-studyset-labels`,
                lambdaName: 'batchUpdateStudysetLabels',
            },
            {
                route: `${studysetsPrefix}/create-note`,
                lambdaName: 'createNote',
            },
            {
                route: `${studysetsPrefix}/delete-note`,
                lambdaName: 'deleteNote',
            },
            {
                route: `${studysetsPrefix}/edit-note`,
                lambdaName: 'editNote',
            },
        ];

        const USERS_ROUTES: {
            route: string;
            lambdaName: string;
            methods?: HttpMethod[] | undefined;
        }[] = [
            {
                route: `${usersPrefix}/get-user`,
                lambdaName: 'getUser',
            },
            {
                route: `${usersPrefix}/update-metadata`,
                lambdaName: 'updateUserMetadata',
            },
            {
                route: `${usersPrefix}/update-notification-preferences`,
                lambdaName: 'updateNotificationPreferences',
            },
            {
                route: `${usersPrefix}/download-user-data`,
                lambdaName: 'downloadUserData',
            },
            {
                route: `${usersPrefix}/update-gamification`,
                lambdaName: 'updateGamification',
            },
            {
                route: `${usersPrefix}/upload-profile-picture`,
                lambdaName: 'uploadProfilePicture',
            },
        ];

        const API_ROUTES = [
            ...FILES_ROUTES,
            ...STUDYSETS_ROUTES,
            ...USERS_ROUTES,
        ];

        for (const { route, lambdaName } of API_ROUTES) {
            this.createLambdaHttpIntegration({
                api,
                lambdaProps,
                path: route,
                lambdaName,
                authorizer: httpRouteAuthorizer,
            });
        }

        // Public (unauthenticated) routes — deliberately registered WITHOUT the
        // Cognito authorizer so crawlers, social scrapers, and logged-out
        // visitors can read publicly-shared study sets. The lambdas enforce
        // `metadata.publiclyViewable` server-side.
        //
        // Route throttling is per route across all callers, not per client:
        // one heavy caller can use up a route's budget for everyone. A CDN/WAF
        // for per-client limits is deferred (#123).
        // The list routes read many rows per request. The single-set route is
        // one read but sits on every `/view/*` page load (the og-meta edge
        // function and the logged-in fallback), so it gets more headroom.
        const PUBLIC_LIST_THROTTLE = { throttlingRateLimit: 20, throttlingBurstLimit: 40 };
        const PUBLIC_STUDYSET_THROTTLE = { throttlingRateLimit: 100, throttlingBurstLimit: 200 };

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: `/api/public/studyset/{studysetUUID}`,
            lambdaName: 'getPublicStudyset',
            methods: [HttpMethod.GET],
            throttle: PUBLIC_STUDYSET_THROTTLE,
        });

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: `/api/public/studysets`,
            lambdaName: 'getPublicStudysets',
            methods: [HttpMethod.GET],
            throttle: PUBLIC_LIST_THROTTLE,
        });

        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: `/api/public/explore`,
            lambdaName: 'getExploreFeed',
            methods: [HttpMethod.GET],
            throttle: PUBLIC_LIST_THROTTLE,
        });

        // Logto calls this directly (Console > Webhooks, User.Created) —
        // deliberately unauthenticated like the routes above, since Logto
        // never holds a Quizaroni access token. The handler verifies the
        // logto-signature-sha-256 header itself instead.
        this.createLambdaHttpIntegration({
            api,
            lambdaProps,
            path: `/api/webhooks/logto-user-created`,
            lambdaName: 'logtoUserCreatedWebhook',
            methods: [HttpMethod.POST],
        });

        // this.createLambdaHttpIntegration({
        //     api,
        //     lambdaProps,
        //     path: "/api/files/sendFeedback",
        //     lambdaName: "sendFeedback",
        // });
    }

    createUpdateLambdaRoles = () => {
        const mainLambdaRoleNameAndID = `${this.deploymentType}-main-lambda-role`;
        const mainLambdaRole = new Role(this, mainLambdaRoleNameAndID, {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            roleName: mainLambdaRoleNameAndID,
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaBasicExecutionRole'
                ),
            ],
        });

        // Add a policy statement for DynamoDB access. Include the `/index/*`
        // sub-resource so lambdas can Query global secondary indexes (e.g. the
        // PK2 public-sharing index) — table-level ARNs alone don't grant that.
        const dynamoTableResources = [`main`, `users`].flatMap((tableName) => {
            const tableArn = `arn:aws:dynamodb:${this.region}:${this.account}:table/${this.prefix}-${tableName}`;
            return [tableArn, `${tableArn}/index/*`];
        });
        const dynamoDBPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:BatchGetItem',
            ],
            resources: dynamoTableResources,
        });
        mainLambdaRole.addToPolicy(dynamoDBPolicyStatement);

        // Add a policy statement for S3 read and write access
        const s3BucketResources = [`main`, `assets`]
            .map((bucketName) => [
                `arn:aws:s3:::${this.prefix}-${bucketName}`,
                `arn:aws:s3:::${this.prefix}-${bucketName}/*`,
            ])
            .flat();
        const s3PolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:ListBucket',
                's3:DeleteObject',
                's3:AbortMultipartUpload',
                's3:ListMultipartUploadParts',
            ],
            resources: s3BucketResources,
        });
        mainLambdaRole.addToPolicy(s3PolicyStatement);

        // Add SES permissions for sending notification emails
        const sesPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'],
        });
        mainLambdaRole.addToPolicy(sesPolicyStatement);

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
        authorizer,
        throttle,
    }: {
        api: HttpApi;
        lambdaName: string;
        lambdaProps: any;
        methods?: HttpMethod[];
        path: string;
        authorizer?: IHttpRouteAuthorizer;
        throttle?: { throttlingRateLimit: number; throttlingBurstLimit: number };
    }) => {
        const lambdaFunction: (props: LambdaProps) => NodejsFunction =
            await getDefaultExportForLambda(lambdaName);

        const routes = api.addRoutes({
            path,
            methods,
            integration: new HttpLambdaIntegration(
                `${this.deploymentType}-${lambdaName}-integration`,
                lambdaFunction({ ...lambdaProps }),
                {}
            ),
            authorizer,
        });

        if (throttle) {
            const settings = Object.fromEntries(
                methods.map((method) => [`${method} ${path}`, throttle])
            );
            for (const stage of this.publicRouteStages) {
                stage.routeSettings = { ...(stage.routeSettings ?? {}), ...settings };
                // CloudFormation rejects route settings for a route key that
                // doesn't exist yet.
                routes.forEach((route) => stage.node.addDependency(route));
            }
        }
    };
}
