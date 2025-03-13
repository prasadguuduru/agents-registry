import {
    APIGatewayTokenAuthorizerEvent,
    APIGatewayAuthorizerResult,
    Context,
    StatementEffect
  } from 'aws-lambda';
  
  export const handler = async (
    event: APIGatewayTokenAuthorizerEvent,
    context: Context
  ): Promise<APIGatewayAuthorizerResult> => {
    console.log("Authorizer invoked. Event:", JSON.stringify(event));
    /*
    
    const tokenHeader = event.authorizationToken;
    if (!tokenHeader) {
      throw new Error("Unauthorized");
    }
    
    const parts = tokenHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      throw new Error("Unauthorized");
    }
    
    const token = parts[1];
    
    // For demonstration, we treat "token-preconfig-001" as valid.
    if (token !== "token-preconfig-001") {
      throw new Error("Unauthorized");
    }
    */
    const token = "token-preconfig-001";
    const effect: StatementEffect = "Allow"; // explicit literal type
  
    const policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: event.methodArn
        }
      ]
    };
  
    return {
      principalId: "authorizedUser",
      policyDocument,
      context: { token }
    };
  };