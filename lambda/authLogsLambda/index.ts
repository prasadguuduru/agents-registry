import { APIGatewayEvent, Context } from "aws-lambda";
import AWS from "aws-sdk";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AUTH_LOGS_TABLE = "AuthLogsTable";

// Utility function to send responses
function sendResponse(statusCode: number, body: object) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

export async function handler(event: APIGatewayEvent, context: Context) {
  if (event.httpMethod === "GET" && event.path === "/authlogs") {
    console.log("Fetching authorization logs...");

    try {
      const params = {
        TableName: AUTH_LOGS_TABLE,
        Limit: 50, // Adjust if needed
        ScanIndexForward: false, // Get latest logs first
      };

      const data = await dynamoDB.scan(params).promise();
      return sendResponse(200, { logs: data.Items || [] });

    } catch (error) {
      console.error("Error fetching auth logs:", error);
      return sendResponse(500, { error: "Internal Server Error" });
    }
  }

  return sendResponse(404, { error: "Not found" });
}
