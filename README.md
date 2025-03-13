# Agent Communication API

This project implements an Agent Communication API using AWS Lambda functions written in TypeScript. It consists of three Lambda functions:

- **sendMessageLambda** (POST /messages): Sends a message.
- **getMessagesLambda** (GET /messages): Retrieves messages for a given receiver.
- **ackMessageLambda** (PUT /messages/{messageId}/ack): Acknowledges a message.

A DynamoDB table is used for message persistence. Deployment is managed via Terraform.

## Project Structure

```
 aws secretsmanager create-secret --name SalesforceCredentials \
--secret-string '{"CLIENT_ID":"XXXXXXXX","CLIENT_SECRET":"XXXXX"}'
```