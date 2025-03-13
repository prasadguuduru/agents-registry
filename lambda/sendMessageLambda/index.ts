import axios from 'axios';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';

const secretsManager = new AWS.SecretsManager();

const DEFAULT_AGENT_ID = '0XxdM000000I5u5SAC';
const DEFAULT_SALESFORCE_DOMAIN = 'orgfarm-8bc2c5f31d-dev-ed.develop.my.salesforce.com';

interface TokenResponse {
    access_token: string;
}

interface SessionResponse {
    id: string;
}

async function getSalesforceCredentials(): Promise<{ CLIENT_ID: string; CLIENT_SECRET: string }> {
    const secretName = 'SalesforceCredentials';
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if (!data.SecretString) throw new Error('SecretString is empty');
    return JSON.parse(data.SecretString);
}

export const handler = async (event: APIGatewayEvent, context: Context) => {
    try {
        const { CLIENT_ID, CLIENT_SECRET } = await getSalesforceCredentials();

        const requestBody = JSON.parse(event.body || '{}');
        const agentId = requestBody.agentId || DEFAULT_AGENT_ID;
        const salesforceDomain = requestBody.salesforceDomain || DEFAULT_SALESFORCE_DOMAIN;

        const SALESFORCE_TOKEN_URL = `https://${salesforceDomain}/services/oauth2/token`;
        const SALESFORCE_SESSION_URL = `https://api.salesforce.com/einstein/ai-agent/v1/agents/${agentId}/sessions`;
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

        // Step 3: Call Agent with Message
        const messageResponse = await axios.post(`${SALESFORCE_MESSAGE_URL}/${sessionId}/messages`, {
            message: {
                sequenceId: 1,
                type: 'Text',
                text: 'aws function callout and list me ConversationID',
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
