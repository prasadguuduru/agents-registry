import axios from 'axios';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AGENT_TABLE = "Agents";

const secretsManager = new AWS.SecretsManager();

const DEFAULT_AGENT_ID = '0XxdM000000I5u5SAC';
const DEFAULT_SALESFORCE_DOMAIN = 'orgfarm-8bc2c5f31d-dev-ed.develop.my.salesforce.com';

interface TokenResponse {
    access_token: string;
}

interface SessionResponse {
    id: string;
}

async function getSalesforceCredentials(targetAgentId: string): Promise<{ CLIENT_ID: string; CLIENT_SECRET: string }> {
    //const secretName = 'SalesforceCredentials';
    const data = await secretsManager.getSecretValue({ SecretId: targetAgentId }).promise();
    console.log('####data : '+JSON.stringify(data));
    if (!data.SecretString) throw new Error('SecretString is empty');

    return JSON.parse(data.SecretString);
}

async function getAgentFromDynamoDB(targetAgentid: string)  {
    try {
      const params = {
        TableName: 'Agents',
        Key: { agentId: targetAgentid }
      };
  
      const data = await dynamoDB.get(params).promise();
      return data.Item || null;
    } catch (error) {
      console.error("Error fetching targetAgentId from DynamoDB:");
      return null;
    }
  };

export const handler = async (event: APIGatewayEvent, context: Context) => {

    console.log('Event:', JSON.stringify(event));
    const message = getMessageFromEvent(event);
    
    const targetAgentId = event.requestContext?.authorizer?.targetAgentId || '';
    console.log('targetAgentId:', targetAgentId);
    const agentItem = await getAgentFromDynamoDB(targetAgentId);
    console.log('Agent Item:', JSON.stringify(agentItem));
    console.log('agentItem?.targetAgentId: ', agentItem?.agentId);
    try {
        //agentId is targetAgentId
        const { CLIENT_ID, CLIENT_SECRET } = await getSalesforceCredentials(agentItem?.agentId);

        const requestBody = JSON.parse(event.body || '{}');
        const agentId = targetAgentId || DEFAULT_AGENT_ID;
        console.log('TARGET Agent ID:', agentId);
        const salesforceDomain = agentItem?.agentUrl || DEFAULT_SALESFORCE_DOMAIN;

        const agent = await dynamoDB.get({ TableName: AGENT_TABLE, Key: { agentId: agentId } }).promise();
        if (!agent.Item) return sendResponse(401, { error: "Invalid credentials" });

        console.log('Salsforce Agent ID:', agent.Item.salesforceAgentId);
        const SALESFORCE_TOKEN_URL = `https://${salesforceDomain}/services/oauth2/token`;
        const SALESFORCE_SESSION_URL = `https://api.salesforce.com/einstein/ai-agent/v1/agents/${agent.Item.salesforceAgentId}/sessions`;
        const SALESFORCE_MESSAGE_URL = 'https://api.salesforce.com/einstein/ai-agent/v1/sessions';

        // Step 1: Get Token
        const tokenResponse = await axios.post<TokenResponse>(SALESFORCE_TOKEN_URL, new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const accessToken = tokenResponse.data.access_token;
        console.log('Access Token:', accessToken);

        // Step 2: Get Session ID with random externalSessionKey
        const externalSessionKey = uuidv4();
        const sessionResponse = await axios.post(SALESFORCE_SESSION_URL, {
            externalSessionKey: externalSessionKey,
            instanceConfig: { endpoint: `https://${salesforceDomain}` },
            streamingCapabilities: { chunkTypes: ['Text'] },
            bypassUser: true,
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log('sessionResponse:', sessionResponse);
        const sessionId = sessionResponse.data.sessionId;
        console.log('Session ID:', sessionId);

        console.log('##Chatting with Agentforce ')

        // Step 3: Call Agent with Message
        const messageResponse = await axios.post(`${SALESFORCE_MESSAGE_URL}/${sessionId}/messages`, {
            message: {
                sequenceId: 1,
                type: 'Text',
                text: message,
            },
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log('Message Response:', messageResponse.data);
        return { statusCode: 200, body: JSON.stringify(messageResponse.data) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error }) };
    }
};

function sendResponse(statusCode: number, body: object) {
    return {
        statusCode,
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    };
}

function getMessageFromEvent(event: APIGatewayEvent): string {
    try {
      // Check if event.body exists
      if (!event?.body) {
        throw new Error('Event body is missing');
      }
  
      let parsedBody;
  
      // Handle case where body is a string (needs parsing) vs already parsed object
      if (typeof event.body === 'string') {
        parsedBody = JSON.parse(event.body);
      } else {
        parsedBody = event.body;
      }
  
      // Verify message exists in the parsed body
      if (!parsedBody.message) {
        throw new Error('Message attribute not found in event body');
      }
  
      return parsedBody.message;
    } catch (error) {
      throw new Error(`Failed to extract message: ${error}`);
    }
  }