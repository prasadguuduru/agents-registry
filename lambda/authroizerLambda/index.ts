import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
  StatementEffect
} from "aws-lambda";
import AWS from "aws-sdk";
import axios from "axios";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AUTH_LOGS_TABLE = "AuthLogsTable";

const TOKEN_URL = "https://dvuwd91m1ghd.cloudfront.net/prod/token";
const VALIDATE_URL = "https://dvuwd91m1ghd.cloudfront.net/prod/validate";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Authorizer invoked. Event:", JSON.stringify(event));

  let effect: StatementEffect = "Deny";
  let clientId = "Unknown";
  let targetAgentId = "Unknown";

  try {
    // Extract Authorization token
    const tokenHeader = event.authorizationToken;
    if (!tokenHeader) {
      await logAuthorizationAttempt(clientId, targetAgentId, effect);
      return generatePolicy("UnauthorizedUser", effect, event.methodArn);
    }

    const parts = tokenHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      await logAuthorizationAttempt(clientId, targetAgentId, effect);
      return generatePolicy("UnauthorizedUser", effect, event.methodArn);
    }
    
    const token = parts[1];

    // Validate token via external API
    console.log("Validating token...");
    const validateResponse = await axios.get(VALIDATE_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });

    clientId = validateResponse.data.clientId || "Unknown";
    targetAgentId = validateResponse.data.targetAgentId || "Unknown";

    if (clientId !== "Unknown" && targetAgentId !== "Unknown") {
      effect = "Allow"; // Grant access
    }

    // Log the authorization attempt
    await logAuthorizationAttempt(clientId, targetAgentId, effect);

    return generatePolicy(clientId, effect, event.methodArn);
  } catch (error) {
    console.error("Authorization validation failed:");

    // Ensure we log the attempt even if it failed
    await logAuthorizationAttempt(clientId, targetAgentId, effect);

    return generatePolicy(clientId, effect, event.methodArn);
  }
};

// Function to log authorization attempts in DynamoDB
const logAuthorizationAttempt = async (
  clientId: string,
  targetAgentId: string,
  effect: StatementEffect
) => {
  try {
    const logEntry = {
      TableName: AUTH_LOGS_TABLE,
      Item: {
        requestId: `auth-${Date.now()}`, // Unique ID
        timestamp: new Date().toISOString(),
        clientId,
        targetAgentId,
        authorizationResult: effect, // "Allow" or "Deny"
      },
    };
    await dynamoDB.put(logEntry).promise();
    console.log(`Logged authorization attempt: ${JSON.stringify(logEntry.Item)}`);
  } catch (err) {
    console.error("Failed to log authorization attempt:");
  }
};

// Function to generate IAM policy
const generatePolicy = (
  principalId: string,
  effect: StatementEffect,
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource
        }
      ]
    },
    context: {
      clientId: principalId,
      authStatus: effect
    }
  };
};
