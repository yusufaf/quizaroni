import { Construct } from "constructs";
import { ExtendedStackProps } from "models/stack";
import { QuizaroniAPI } from "./quizaroni-api";
import { QuizaroniDynamoDB } from "./quizaroni-dynamo";
import { QuizaroniS3 } from "./quizaroni-s3";
import { QuizaroniCognito } from "./quizaroni-cognito";

export class Quizaroni extends Construct {
    appName: string;
    deploymentType: string;

    constructor(scope: Construct, id: string, props: ExtendedStackProps) {
        super(scope, id);

        const { appName = "quizaroni", deploymentType = "development" } = props;
        this.appName = appName;
        this.deploymentType = deploymentType;

        new QuizaroniAPI(scope, `${appName}-${deploymentType}-api`, props);
        new QuizaroniDynamoDB(
            scope,
            `${appName}-${deploymentType}-dynamoDB`,
            props
        );
        new QuizaroniS3(scope, `${appName}-${deploymentType}-s3`, props);
        new QuizaroniCognito(
            scope,
            `${appName}-${deploymentType}-quizaroni`,
            props
        );
    }
}
