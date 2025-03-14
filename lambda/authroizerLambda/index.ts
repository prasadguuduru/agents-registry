import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
  StatementEffect
} from "aws-lambda";
import AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AUTH_LOGS_TABLE = "AuthLogsTable";
const TOKENS_TABLE = "Tokens";

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Authorizer invoked. Event:", JSON.stringify(event));

  let effect: StatementEffect = "Deny";
  let clientId = "Unknown";
  let targetAgentId = "Unknown";

  try {
    // Extract Authorization token from headers
    const tokenHeader = event.authorizationToken;
    if (!tokenHeader) {
      console.log("No authorization token found.");
      await logAuthorizationAttempt(clientId, targetAgentId, effect);
      return generatePolicy("UnauthorizedUser", effect, event.methodArn);
    }

    const parts = tokenHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      console.log("Invalid token format.");
      await logAuthorizationAttempt(clientId, targetAgentId, effect);
      return generatePolicy("UnauthorizedUser", effect, event.methodArn);
    }
    
    const token = parts[1];

    // Fetch token record from DynamoDB
    console.log("Fetching token record from DynamoDB...");
    const tokenRecord = await getTokenFromDynamoDB(token);
    if (!tokenRecord) {
      console.log("Token not found in database.");
      await logAuthorizationAttempt(clientId, targetAgentId, effect);
      return generatePolicy("UnauthorizedUser", effect, event.methodArn);
    }

    // Extract source and target from token record
    clientId = tokenRecord.source || "Unknown";
    targetAgentId = tokenRecord.target || "Unknown";
    
    if (clientId !== "Unknown" && targetAgentId !== "Unknown") {
      effect = "Allow"; // Grant access
    }

    // Log the authorization attempt
    await logAuthorizationAttempt(clientId, targetAgentId, effect);

    return generatePolicy(clientId, effect, event.methodArn, targetAgentId);
  } catch (error) {
    console.error("Authorization validation failed:");

    // Ensure we log the attempt even if it failed
    await logAuthorizationAttempt(clientId, targetAgentId, effect);

    return generatePolicy(clientId, effect, event.methodArn);
  }
};

// Function to fetch token record from DynamoDB
const getTokenFromDynamoDB = async (token: string) => {
  try {
    const params = {
      TableName: TOKENS_TABLE,
      Key: { accessToken: token }
    };

    const data = await dynamoDB.get(params).promise();
    return data.Item || null;
  } catch (error) {
    console.error("Error fetching token from DynamoDB:");
    return null;
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

// Function to generate IAM policy and attach custom headers
const generatePolicy = (
  principalId: string,
  effect: StatementEffect,
  resource: string,
  targetAgentId?: string
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
      targetAgentId: targetAgentId || "Unknown", // Attach target to the request context
      authStatus: effect
    }
  };
};
