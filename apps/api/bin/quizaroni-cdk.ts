#!/usr/bin/env node
// Load .env BEFORE importing the stack: constants/index.ts reads
// process.env.ALLOWED_ORIGINS at module-eval time, and ES imports are
// evaluated before any statement runs. A plain dotenv.config() call below
// the stack import would fire too late, dropping CORS origins on deploy.
import "dotenv/config";
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { QuizaroniStack } from '../service/quizaroni-stack';

const app = new App();

const env = {
    account: process.env.account,
    region: process.env.region,
};

const appName = process.env.appName;
const deploymentType = process.env.deploymentType;

new QuizaroniStack(app, `${appName}-${deploymentType}-stack`, {
    env,
    appName,
    deploymentType,
});