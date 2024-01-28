import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ExtendedStackProps } from '../../models/stack';
import { Quizaroni } from './quizaroni';

export class QuizaroniStack extends Stack {
  constructor(scope: Construct, id: string, props: ExtendedStackProps) {
    super(scope, id, props);

    const { appName, deploymentType } = props;

    new Quizaroni(this, `${appName}-${deploymentType}`, props);
  }
}