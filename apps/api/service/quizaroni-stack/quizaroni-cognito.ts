import { Duration } from "aws-cdk-lib";
import { AccountRecovery, UserPool, UserPoolClient, UserPoolOperation } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import postConfirmationTrigger from "../lambdas/cognito/postConfirmationTrigger";
import { ExtendedStackProps } from "models/stack";

export class QuizaroniCognito extends Construct {
    constructor(scope: Construct, id: string, props: ExtendedStackProps) {
        super(scope, id);
        const {
            appName = "quizaroni",
            deploymentType = "development",
            env,
        } = props;

        const userPoolName = `${appName}-users`;
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

        const lambdaProps = {
            construct: this,
            props,
        };

        const postConfirmationTriggerLambda = postConfirmationTrigger({ ...lambdaProps });
        userPool.addTrigger(UserPoolOperation.POST_CONFIRMATION, postConfirmationTriggerLambda)

        const { userPoolId } = userPool;
        const userPoolClientName = `${appName}-user-pool-client`
        const mainUserPoolClient = new UserPoolClient(this, userPoolClientName, {
            userPool,
            userPoolClientName,
            refreshTokenValidity: Duration.days(30),
            accessTokenValidity: Duration.days(1),
            idTokenValidity: Duration.days(1),
        })
    }
}
