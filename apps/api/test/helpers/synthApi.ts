import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { QuizaroniStack } from "../../service/quizaroni-stack";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resource = { Properties: any };

// One call per test file: resources/roles keeps a module-level lookup that
// rejects a second stack in the same module registry.
export async function routeTargets(readOnly: boolean) {
    // Skips esbuild bundling for the ~35 NodejsFunctions.
    const app = new App({ context: { "aws:cdk:bundling-stacks": [] } });
    const stack = new QuizaroniStack(app, "test-stack", {
        env: { account: "000000000000", region: "us-west-2" },
        appName: "quizaroni",
        deploymentType: "development",
        readOnly,
    });
    // Routes are added from an async helper that awaits a dynamic import.
    await new Promise((resolve) => setImmediate(resolve));

    const template = Template.fromStack(stack);
    const functions = template.findResources("AWS::Lambda::Function") as Record<string, Resource>;
    const integrations = template.findResources("AWS::ApiGatewayV2::Integration") as Record<string, Resource>;
    const routeResources = template.findResources("AWS::ApiGatewayV2::Route") as Record<string, Resource>;

    const routes = new Map<string, string>();
    for (const { Properties } of Object.values(routeResources)) {
        const integrationId = Properties.Target["Fn::Join"][1][1].Ref;
        const functionId = integrations[integrationId].Properties.IntegrationUri["Fn::GetAtt"][0];
        routes.set(Properties.RouteKey, functions[functionId].Properties.FunctionName);
    }

    const functionNames = Object.values(functions).map((fn) => fn.Properties.FunctionName);
    return { routes, functionNames, functions };
}
