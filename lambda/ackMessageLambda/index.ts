import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME || "AgentMessages";

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  try {
    const messageId = event.pathParameters?.messageId;
    if (!messageId) {
      return { statusCode: 400, body: JSON.stringify({ error: "MessageId is required" }) };
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { messageId: { S: messageId } },
      UpdateExpression: "SET acknowledged = :val",
      ExpressionAttributeValues: { ":val": { BOOL: true } }
    };

    await client.send(new UpdateItemCommand(params));
    return { statusCode: 200, body: JSON.stringify({ status: "success", messageId }) };
  } catch (error) {
    console.error("Error acknowledging message", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to acknowledge message" }) };
  }
};