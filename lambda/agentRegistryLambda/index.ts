import { APIGatewayEvent, Context, Callback } from "aws-lambda";
import AWS from "aws-sdk";
import crypto from "crypto";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AGENT_TABLE = "Agents";
const ACL_TABLE = "AccessControl";

// Utility function to generate random strings
function generateSecret() {
    return crypto.randomBytes(16).toString("hex");
}

// Utility function to send a response
function sendResponse(statusCode: number, body: object) {
    return {
        statusCode,
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    };
}

// Lambda handler function
export async function handler(event: APIGatewayEvent, context: Context, callback: Callback) {
    const { path, httpMethod, body, headers } = event;
    let parsedBody = body ? JSON.parse(body) : {};

    if (httpMethod === "POST" && path === "/register") {
        const { agentId, type, agentUrl, clientId, secret, topics } = parsedBody as {
            agentId: string;
            type: string;
            agentUrl: string;
            clientId: string;
            secret: string;
            topics?: string; // Optional in case it's missing
        };
    
        if (!agentId || !type || !agentUrl || !clientId || !secret || topics === undefined) {
            return sendResponse(400, { error: "Missing required parameters" });
        }
    
        const existingAgent = await dynamoDB.get({ TableName: AGENT_TABLE, Key: { agentId } }).promise();
        if (existingAgent.Item) {
            return sendResponse(400, { error: "Agent already registered" });
        }
    
        const clientSecret = generateSecret();
        const topicsArray: string[] = topics.split(',').map(topic => topic.trim()); // Explicitly define as string[]
    
        await dynamoDB.put({
            TableName: AGENT_TABLE,
            Item: { 
                agentId, 
                clientSecret, 
                type, 
                agentUrl, 
                clientId, 
                secret, 
                topics: topicsArray 
            }
        }).promise();
    
        return sendResponse(200, { agentId, clientSecret });
    }

    if (httpMethod === "POST" && path === "/request-access") {
        const { requesterId, targetAgentId } = parsedBody;
        if (requesterId === targetAgentId) return sendResponse(400, { error: "Cannot request access to self" });
        
        await dynamoDB.put({ TableName: ACL_TABLE, Item: { requesterId, targetAgentId, status: "pending" } }).promise();
        return sendResponse(200, { message: "Access request submitted" });
    }

    if (httpMethod === "POST" && path === "/approve-access") {
        const { approverId, requesterId } = parsedBody;
        const accessRecord = await dynamoDB.get({ TableName: ACL_TABLE, Key: { requesterId, targetAgentId: approverId } }).promise();
        if (!accessRecord.Item) return sendResponse(400, { error: "Invalid approval request" });
        
        await dynamoDB.update({
            TableName: ACL_TABLE,
            Key: { requesterId, targetAgentId: approverId },
            UpdateExpression: "SET #status = :approved",
            ExpressionAttributeNames: { "#status": "status" }, // Map #status to the actual attribute name
            ExpressionAttributeValues: { ":approved": "approved" }
        }).promise();
        
        return sendResponse(200, { message: "Access approved" });
    }

    if (httpMethod === "POST" && path === "/token") {
        const { clientId, clientSecret, targetAgentId } = parsedBody;
        const agent = await dynamoDB.get({ TableName: AGENT_TABLE, Key: { agentId: clientId } }).promise();
        if (!agent.Item || agent.Item.clientSecret !== clientSecret) return sendResponse(401, { error: "Invalid credentials" });

        const aclRecord = await dynamoDB.get({ TableName: ACL_TABLE, Key: { requesterId: clientId, targetAgentId } }).promise();
        if (!aclRecord.Item || aclRecord.Item.status !== "approved") return sendResponse(403, { error: "Access not approved" });
        
        const accessToken = generateSecret();
        await dynamoDB.put({ TableName: "Tokens", Item: { accessToken, clientId, targetAgentId, expiresAt: Date.now() + 3600000 } }).promise();
        return sendResponse(200, { accessToken, expiresIn: 3600 });
    }

    if (httpMethod === "GET" && path === "/validate") {
        console.log("### headers : "+  JSON.stringify(headers));
        console.log("### headers.authorization : "+  headers.Authorization);
        const accessToken = headers.Authorization?.split(" ")[1];
        console.log("###accessToken : "+ accessToken);
        if (!accessToken) return sendResponse(401, { error: "Invalid or missing token" });
        
        const tokenRecord = await dynamoDB.get({ TableName: "Tokens", Key: { accessToken } }).promise();
        if (!tokenRecord.Item || Date.now() > tokenRecord.Item.expiresAt) {
            if (tokenRecord.Item) await dynamoDB.delete({ TableName: "Tokens", Key: { accessToken } }).promise();
            return sendResponse(401, { error: "Token expired or invalid" });
        }
        return sendResponse(200, { clientId: tokenRecord.Item.clientId, targetAgentId: tokenRecord.Item.targetAgentId });
    }

    return sendResponse(404, { error: "Not found" });
}
