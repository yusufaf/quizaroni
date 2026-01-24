import { Duration, SecretValue } from 'aws-cdk-lib';
import {
    AccountRecovery,
    OAuthScope,
    ProviderAttribute,
    UserPool,
    UserPoolClient,
    UserPoolClientIdentityProvider,
    UserPoolIdentityProviderGoogle,
    UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import postConfirmationTrigger from '../lambdas/cognito/postConfirmationTrigger';
import { ExtendedStackProps } from 'models/stack';

const { GOOGLE_CLIENT_ID = '', GOOGLE_CLIENT_SECRET } = process.env;

export class QuizaroniCognito extends Construct {
    constructor(scope: Construct, id: string, props: ExtendedStackProps) {
        super(scope, id);
        const {
            appName = 'quizaroni',
            deploymentType = 'development',
            env,
        } = props;

        const userPoolName = `${appName}-users`;
        const userPool = new UserPool(this, userPoolName, {
            userPoolName,
            standardAttributes: {
                email: {
                    required: true,
                },
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
                emailSubject: `Your Quizaroni verification code`,
            },
            userInvitation: {
                emailSubject: `Your Quizaroni temporary password`,
            },
            selfSignUpEnabled: true,
        });

        const lambdaProps = {
            construct: this,
            props,
        };

        const postConfirmationTriggerLambda = postConfirmationTrigger({
            ...lambdaProps,
        });
        userPool.addTrigger(
            UserPoolOperation.POST_CONFIRMATION,
            postConfirmationTriggerLambda
        );

        userPool.addDomain(`${appName}-user-pool-domain`, {
            cognitoDomain: {
                domainPrefix: appName,
            },
        });

        // const googleClientSecret = SecretValue.secretsManager(
        //     'google-client-secret'
        // );

        // const googleProvider = new UserPoolIdentityProviderGoogle(
        //     this,
        //     'Google',
        //     {
        //         userPool,
        //         clientId: GOOGLE_CLIENT_ID,
        //         clientSecretValue: googleClientSecret,
        //         attributeMapping: {
        //             custom: {
        //                 email: ProviderAttribute.GOOGLE_EMAIL,
        //             },
        //         },
        //         scopes: ['openid', 'profile', 'email'], // Required scopes
        //     }
        // );

        // userPool.registerIdentityProvider(googleProvider);

        const { userPoolId } = userPool;
        const userPoolClientName = `${appName}-user-pool-client`;
        const mainUserPoolClient = new UserPoolClient(
            this,
            userPoolClientName,
            {
                userPool,
                userPoolClientName,
                refreshTokenValidity: Duration.days(30),
                accessTokenValidity: Duration.days(1),
                idTokenValidity: Duration.days(1),
                // supportedIdentityProviders: [
                //     UserPoolClientIdentityProvider.GOOGLE,
                // ],
                oAuth: {
                    scopes: [
                        OAuthScope.OPENID,
                        OAuthScope.PROFILE,
                        OAuthScope.EMAIL,
                    ],
                },
            }
        );

        // mainUserPoolClient.node.addDependency(googleProvider);
    }
}
