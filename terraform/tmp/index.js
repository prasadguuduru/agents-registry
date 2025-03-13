"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_dynamodb_2 = require("@aws-sdk/client-dynamodb");
const uuid_1 = require("uuid");
const client = new client_dynamodb_1.DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME || "AgentMessages";
const handler = async (event, _context) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const messageId = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        const item = {
            messageId: { S: messageId },
            sender: { S: body.sender },
            receiver: { S: body.receiver },
            content: { S: JSON.stringify(body.content) },
            performative: { S: body.performative },
            conversationId: { S: body.conversationId || "" },
            timestamp: { S: timestamp },
            acknowledged: { BOOL: false }
        };
        await client.send(new client_dynamodb_2.PutItemCommand({
            TableName: TABLE_NAME,
            Item: item
        }));
        return {
            statusCode: 200,
            body: JSON.stringify({ status: "success", messageId, timestamp })
        };
    }
    catch (error) {
        console.error("Error sending message", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to send message" })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=index.js.map