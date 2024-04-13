import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { AccountRecovery, UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { ExtendedStackProps } from "models/stack";

export class QuizaroniCognito extends Construct {
    constructor(scope: Construct, id: string, props: ExtendedStackProps) {
        super(scope, id);
        const {
            appName = "quizaroni",
            deploymentType = "development",
            env,
        } = props;
        const { account = "", region = "" } = env!;

        const userPoolName = `${appName}-${deploymentType}-users`;
        const userPool = new UserPool(this, userPoolName, {
            userPoolName,
            standardAttributes: {
                email: {
                    required: true,
                }
            },
            passwordPolicy: {
                tempPasswordValidity: Duration.days(30),
            },
            signInAliases: {
                email: true,
                username: true,
                preferredUsername: true,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            userVerification: {
                emailSubject: `Your Quizaroni verification code`
            },
            userInvitation: {
                emailSubject: `Your Quizaroni temporary password`
            },
            selfSignUpEnabled: true,
        })

        const { userPoolId } = userPool;
        const userPoolClientName = `${appName}-${deploymentType}-user-pool-client`
        const mainUserPoolClient = new UserPoolClient(this, userPoolClientName, {
            userPool,
            userPoolClientName,
            refreshTokenValidity: Duration.days(30),
            accessTokenValidity: Duration.days(1),
            idTokenValidity: Duration.days(1),
        })
    }
}
