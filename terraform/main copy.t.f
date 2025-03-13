provider "aws" {
  region = "us-east-1"
}

###############################
# DynamoDB Table for Messages #
###############################

resource "aws_dynamodb_table" "agent_messages" {
  name         = "AgentMessages"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "messageId"

  attribute {
    name = "messageId"
    type = "S"
  }

  attribute {
    name = "receiver"
    type = "S"
  }

  global_secondary_index {
    name            = "ReceiverIndex"
    hash_key        = "receiver"
    projection_type = "ALL"
  }
}


###############################
# DynamoDB Tables for OAuth2  #
###############################

resource "aws_dynamodb_table" "agents" {
  name         = "Agents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "agentId"

  attribute {
    name = "agentId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "access_control" {
  name         = "AccessControl"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "requesterId"
  range_key    = "targetAgentId"

  attribute {
    name = "requesterId"
    type = "S"
  }

  attribute {
    name = "targetAgentId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tokens" {
  name         = "Tokens"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "accessToken"

  attribute {
    name = "accessToken"
    type = "S"
  }
}

#######################
# IAM Role & Policies #
#######################

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "lambda_policy"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ],
        Effect = "Allow",
        Resource = [
          aws_dynamodb_table.agents.arn,
          aws_dynamodb_table.access_control.arn,
          aws_dynamodb_table.tokens.arn,
          aws_dynamodb_table.agent_messages.arn,
          "${aws_dynamodb_table.agent_messages.arn}/index/ReceiverIndex"
        ]
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

##############################
# CloudWatch Log Groups      #
##############################

resource "aws_cloudwatch_log_group" "send_message_lambda_log" {
  name              = "/aws/lambda/sendMessageLambda"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "get_messages_lambda_log" {
  name              = "/aws/lambda/getMessagesLambda"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "ack_message_lambda_log" {
  name              = "/aws/lambda/ackMessageLambda"
  retention_in_days = 14
}

###############################
# Lambda Functions Definition #
###############################

resource "aws_lambda_function" "send_message" {
  filename         = "${path.module}/sendMessageLambda.zip"
  function_name    = "sendMessageLambda"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/sendMessageLambda.zip")
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.agent_messages.name
    }
  }
}

resource "aws_lambda_function" "get_messages" {
  filename         = "${path.module}/getMessagesLambda.zip"
  function_name    = "getMessagesLambda"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/getMessagesLambda.zip")
  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.agent_messages.name,
      RECEIVER_INDEX = "ReceiverIndex"
    }
  }
}

resource "aws_lambda_function" "ack_message" {
  filename         = "${path.module}/ackMessageLambda.zip"
  function_name    = "ackMessageLambda"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/ackMessageLambda.zip")
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.agent_messages.name
    }
  }
}

# Lambda Authorizer

resource "aws_lambda_function" "authorizer" {
  filename = "${path.module}/authroizerLambda.zip"
  function_name = "authroizerLambda"
  role = aws_iam_role.lambda_exec.arn
  handler = "index.handler"
  runtime = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/authroizerLambda.zip")
  environment {
    variables = {}
  }
}

# agentRegistry Lambda Registry

resource "aws_lambda_function" "oauth2_registry" {
  filename         = "${path.module}/agentRegistryLambda.zip"
  function_name    = "agentRegistryLambda"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/agentRegistryLambda.zip")
  environment {
    variables = {
      AGENT_TABLE = aws_dynamodb_table.agents.name,
      ACL_TABLE   = aws_dynamodb_table.access_control.name,
      TOKEN_TABLE = aws_dynamodb_table.tokens.name
    }
  }
}


####################################
# Lambda Permissions for API GW    #
####################################

resource "aws_lambda_permission" "send_message_apigw" {
  statement_id  = "AllowAPIGatewayInvokeSendMessage"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_messages_apigw" {
  statement_id  = "AllowAPIGatewayInvokeGetMessages"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_messages.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ack_message_apigw" {
  statement_id  = "AllowAPIGatewayInvokeAckMessage"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ack_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*/*"
}

resource "aws_lambda_permission" "authorizer_apigw" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*"
}
##############################
# API Gateway Configuration  #
##############################

resource "aws_api_gateway_rest_api" "agent_api" {
  name        = "AgentCommunicationAPI"
  description = "API for agent-to-agent communication"
}

resource "aws_api_gateway_resource" "messages" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "messages"
}

# POST /messages
resource "aws_api_gateway_method" "post_messages" {
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = aws_api_gateway_resource.messages.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.token_authorizer.id
}

resource "aws_api_gateway_integration" "post_messages_integration" {
  rest_api_id             = aws_api_gateway_rest_api.agent_api.id
  resource_id             = aws_api_gateway_resource.messages.id
  http_method             = aws_api_gateway_method.post_messages.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.send_message.invoke_arn
}

# GET /messages
resource "aws_api_gateway_method" "get_messages" {
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = aws_api_gateway_resource.messages.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_messages_integration" {
  rest_api_id             = aws_api_gateway_rest_api.agent_api.id
  resource_id             = aws_api_gateway_resource.messages.id
  http_method             = aws_api_gateway_method.get_messages.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_messages.invoke_arn
}

# PUT /messages/{messageId}/ack
resource "aws_api_gateway_resource" "ack" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_resource.messages.id
  path_part   = "ack"
}

resource "aws_api_gateway_resource" "ack_message" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_resource.ack.id
  path_part   = "{messageId}"
}

resource "aws_api_gateway_method" "put_ack_message" {
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = aws_api_gateway_resource.ack_message.id
  http_method   = "PUT"
  authorization = "NONE"
}
data "aws_region" "current" {}

# Lambda Authorizer configuration
resource "aws_api_gateway_authorizer" "token_authorizer" {
  name                   = "tokenAuthorizer"
  rest_api_id            = aws_api_gateway_rest_api.agent_api.id
  authorizer_uri         = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${aws_lambda_function.authorizer.arn}/invocations"
  authorizer_result_ttl_in_seconds = 300
  identity_source        = "method.request.header.Authorization"
  type                   = "TOKEN"
}

resource "aws_api_gateway_integration" "put_ack_message_integration" {
  rest_api_id             = aws_api_gateway_rest_api.agent_api.id
  resource_id             = aws_api_gateway_resource.ack_message.id
  http_method             = aws_api_gateway_method.put_ack_message.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.ack_message.invoke_arn
}


########### aws api gateway oauth2_api #######

resource "aws_api_gateway_rest_api" "oauth2_api" {
  name        = "Oauth2AgentRegistryAPI"
  description = "OAuth2 API for agent registry and access control"
}

resource "aws_api_gateway_resource" "register" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "register"
}

resource "aws_api_gateway_resource" "request_access" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "request-access"
}

resource "aws_api_gateway_resource" "approve_access" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "approve-access"
}

resource "aws_api_gateway_resource" "token" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "token"
}

resource "aws_api_gateway_resource" "validate" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  parent_id   = aws_api_gateway_rest_api.agent_api.root_resource_id
  path_part   = "validate"
}
# Define API Methods and Integrations
locals {
  api_methods = {
    "register"       = { path = aws_api_gateway_resource.register,       http_method = "POST" }
    "request_access" = { path = aws_api_gateway_resource.request_access, http_method = "POST" }
    "approve_access" = { path = aws_api_gateway_resource.approve_access, http_method = "POST" }
    "token"          = { path = aws_api_gateway_resource.token,          http_method = "POST" }
    "validate"       = { path = aws_api_gateway_resource.validate,       http_method = "GET" }
  }
}

resource "aws_api_gateway_method" "api_methods" {
  for_each     = local.api_methods
  rest_api_id  = aws_api_gateway_rest_api.agent_api.id
  resource_id  = each.value.path.id
  http_method  = each.value.http_method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_integrations" {
  for_each              = aws_api_gateway_method.api_methods
  rest_api_id           = aws_api_gateway_rest_api.agent_api.id
  resource_id           = each.value.resource_id
  http_method           = each.value.http_method
  integration_http_method = "POST"
  type                  = "AWS_PROXY"
  uri                   = aws_lambda_function.oauth2_registry.invoke_arn
}

resource "aws_lambda_permission" "oauth2_api_gateway" {
  statement_id  = "AllowAPIGatewayInvokeOauth2Registry"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.oauth2_registry.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "agent_api_deployment" {
  depends_on = [
    aws_api_gateway_integration.post_messages_integration,
    aws_api_gateway_integration.get_messages_integration,
    aws_api_gateway_integration.put_ack_message_integration,
    aws_api_gateway_integration.api_integrations
  ]
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  stage_name  = "prod"
}

output "api_invoke_url" {
  value = "${aws_api_gateway_deployment.agent_api_deployment.invoke_url}/messages"
}


resource "aws_iam_user_policy" "api_gateway_access" {
  name = "APIGatewayAccess"
  user = "multi-agent-user"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["apigateway:GET", "apigateway:PUT", "apigateway:POST", "apigateway:DELETE", "apigateway:PATCH"]
        Resource = ["arn:aws:apigateway:us-east-1::/restapis/0ayys8nze8", "arn:aws:apigateway:us-east-1::/restapis/0ayys8nze8/*", "${aws_api_gateway_rest_api.agent_api.arn}/*"]
      }
    ]
  })
}