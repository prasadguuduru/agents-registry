import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME || "AgentMessages";
const RECEIVER_INDEX = process.env.RECEIVER_INDEX || "ReceiverIndex";

export const handler: APIGatewayProxyHandler = async (event, _context) => {
console.log("event", event);
console.log("event.queryStringParameters?.receiver", event.queryStringParameters?.receiver);
  try {
    const receiver = event.queryStringParameters?.receiver;
    if (!receiver) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Receiver parameter is required" })
      };
    }
    const params = {
      TableName: TABLE_NAME,
      IndexName: RECEIVER_INDEX,
      KeyConditionExpression: "receiver = :r",
      ExpressionAttributeValues: {
        ":r": { S: receiver }
      }
    };

    console.log("after");

    const result = await client.send(new QueryCommand(params));
    const messages = result.Items?.map(item => ({
      messageId: item.messageId.S,
      sender: item.sender.S,
      receiver: item.receiver.S,
      content: JSON.parse(item.content.S || "{}"),
      performative: item.performative.S,
      conversationId: item.conversationId.S,
      timestamp: item.timestamp.S,
      acknowledged: item.acknowledged.BOOL
    })) || [];

    return {
      statusCode: 200,
      body: JSON.stringify(messages)
    };
  } catch (error) {
    console.error("Error retrieving messages", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to retrieve messages" })
    };
  }
};