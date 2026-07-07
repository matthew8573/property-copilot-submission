import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

/**
 * Provisions the AWS backend for the property browser:
 *   - DynamoDB table for listings, with a geohash GSI for geospatial queries.
 *   - A Lambda running the shared request router (backend/src/handlers.ts).
 *   - An HTTP API (API Gateway) fronting the Lambda.
 */
export class PropertiesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = "Properties";

    const table = new dynamodb.Table(this, "PropertiesTable", {
      tableName,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // Free-tier friendly and fine for an OA. Tears down cleanly.
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Geospatial GSI: partition by coarse geohash prefix, sort by full geohash.
    // A bounding-box query hits only the prefixes that overlap the viewport.
    table.addGlobalSecondaryIndex({
      indexName: "geo-index",
      partitionKey: { name: "geohashPrefix", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "geohash", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // The repo root holds the shared backend source and the lockfile esbuild
    // uses to resolve dependencies (ngeohash). The Lambda entry must live under
    // projectRoot, so both point at the repo root rather than infra/.
    const repoRoot = path.join(__dirname, "..", "..");

    const apiFn = new lambdaNode.NodejsFunction(this, "ApiFunction", {
      entry: path.join(repoRoot, "backend", "src", "handlers.ts"),
      handler: "handler",
      projectRoot: repoRoot,
      depsLockFilePath: path.join(repoRoot, "package-lock.json"),
      runtime: lambda.Runtime.NODEJS_22_X,
      // CPU scales with memory; 1024MB keeps the geohash fan-out fast.
      memorySize: 1024,
      timeout: cdk.Duration.seconds(10),
      environment: {
        PROPERTIES_TABLE: table.tableName
      },
      bundling: {
        format: lambdaNode.OutputFormat.ESM,
        target: "node22"
      }
    });

    table.grantReadData(apiFn);

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ["Content-Type"],
        // Let browsers cache the preflight instead of paying it per request.
        maxAge: cdk.Duration.days(1)
      }
    });

    const integration = new integrations.HttpLambdaIntegration("ApiIntegration", apiFn);

    httpApi.addRoutes({
      path: "/properties",
      methods: [apigwv2.HttpMethod.GET],
      integration
    });
    httpApi.addRoutes({
      path: "/properties/{id}",
      methods: [apigwv2.HttpMethod.GET],
      integration
    });
    httpApi.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Base URL for NEXT_PUBLIC_API_BASE_URL"
    });
  }
}
