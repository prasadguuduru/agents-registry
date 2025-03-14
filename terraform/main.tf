provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}
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

resource "aws_dynamodb_table" "auth_logs" {
  name         = "AuthLogsTable"
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing
  hash_key     = "requestId"

  attribute {
    name = "requestId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name            = "TimestampIndex"
    hash_key        = "timestamp"
    projection_type = "ALL"
  }

  tags = {
    Name        = "AuthLogsTable"
    Environment = "Production"
  }
}

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
  timeout          = 180 # Increase timeout to 5 minutes
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
  filename         = "${path.module}/authroizerLambda.zip"
  function_name    = "authroizerLambda"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
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
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = aws_api_gateway_resource.messages.id
  http_method = "POST"
  #authorization = "CUSTOM"
  authorization = "NONE"
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
  name                             = "tokenAuthorizer"
  rest_api_id                      = aws_api_gateway_rest_api.agent_api.id
  authorizer_uri                   = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${aws_lambda_function.authorizer.arn}/invocations"
  authorizer_result_ttl_in_seconds = 300
  identity_source                  = "method.request.header.Authorization"
  type                             = "TOKEN"
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
    "register"       = { path = aws_api_gateway_resource.register, http_method = "POST" }
    "request_access" = { path = aws_api_gateway_resource.request_access, http_method = "POST" }
    "approve_access" = { path = aws_api_gateway_resource.approve_access, http_method = "POST" }
    "token"          = { path = aws_api_gateway_resource.token, http_method = "POST" }
    "validate"       = { path = aws_api_gateway_resource.validate, http_method = "GET" }
  }
}

resource "aws_api_gateway_method" "api_methods" {
  for_each      = local.api_methods
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = each.value.path.id
  http_method   = each.value.http_method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_integrations" {
  for_each                = aws_api_gateway_method.api_methods
  rest_api_id             = aws_api_gateway_rest_api.agent_api.id
  resource_id             = each.value.resource_id
  http_method             = each.value.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.oauth2_registry.invoke_arn
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



# S3 bucket for website hosting
resource "aws_s3_bucket" "website_bucket" {
  bucket = "agent-registry-app-frontend" # Change this to a globally unique name
}

# Bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "website_bucket_ownership" {
  bucket = aws_s3_bucket.website_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# Public access block configuration for the bucket
resource "aws_s3_bucket_public_access_block" "website_bucket_public_access" {
  bucket                  = aws_s3_bucket.website_bucket.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket ACL
resource "aws_s3_bucket_acl" "website_bucket_acl" {
  depends_on = [
    aws_s3_bucket_ownership_controls.website_bucket_ownership,
    aws_s3_bucket_public_access_block.website_bucket_public_access,
  ]
  bucket = aws_s3_bucket.website_bucket.id
  acl    = "public-read"
}

# Website configuration for the S3 bucket
resource "aws_s3_bucket_website_configuration" "website_config" {
  bucket = aws_s3_bucket.website_bucket.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html" # SPA routing - redirect all errors to index.html
  }
}

# Bucket policy to allow public read access
resource "aws_s3_bucket_policy" "website_bucket_policy" {
  bucket = aws_s3_bucket.website_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website_bucket.arn}/*"
      }
    ]
  })
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "website_bucket_cors" {
  bucket = aws_s3_bucket.website_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"] # In production, restrict to your domain
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for Agent Registry app"
}
# API Gateway Resource Policy
resource "aws_api_gateway_rest_api_policy" "agent_api_policy" {
  rest_api_id = aws_api_gateway_rest_api.agent_api.id

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Principal" : "*",
        "Action" : "execute-api:Invoke",
        "Resource" : "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*"
      },
      {
        "Effect" : "Allow",
        "Principal" : {
          "Service" : "cloudfront.amazonaws.com"
        },
        "Action" : "execute-api:Invoke",
        "Resource" : "${aws_api_gateway_rest_api.agent_api.execution_arn}/*/*",
        "Condition" : {
          "StringEquals" : {
            "AWS:SourceArn" : "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.website_distribution.id}"
          }
        }
      }
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Use only North America and Europe

  # S3 origin
  origin {
    domain_name = aws_s3_bucket.website_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website_bucket.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  # API Gateway origin
  origin {
    domain_name = replace(aws_api_gateway_deployment.agent_api_deployment.invoke_url, "/^https?://([^/]*).*/", "$1")
    origin_id   = "APIGateway"
    origin_path = "" # Use your API stage name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior for S3 content (frontend app)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    #cache_policy_id          = "Managed-CachingDisabled"
    #origin_request_policy_id = "Managed-AllViewerExceptHostHeader"
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for API Gateway
  ordered_cache_behavior {
    path_pattern     = "/prod/*" # Match the stage path
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "APIGateway"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Referer"] # Ensure Authorization header is forwarded
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Restrict viewer access
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL certificate
  viewer_certificate {
    cloudfront_default_certificate = true
    # For a custom domain, use:
    # acm_certificate_arn = aws_acm_certificate.cert.arn
    # ssl_support_method = "sni-only"
  }

  # SPA routing - always serve index.html for any path
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
}


# API Gateway CORS configuration
resource "aws_api_gateway_method" "options_method" {
  for_each      = local.api_methods
  rest_api_id   = aws_api_gateway_rest_api.agent_api.id
  resource_id   = each.value.path.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_integration" {
  for_each    = aws_api_gateway_method.options_method
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_response" {
  for_each    = aws_api_gateway_method.options_method
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
  for_each    = aws_api_gateway_method.options_method
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = aws_api_gateway_method_response.options_response[each.key].status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [aws_api_gateway_method_response.options_response]
}

# Add CORS headers to regular method responses
resource "aws_api_gateway_method_response" "cors_method_response" {
  for_each    = aws_api_gateway_method.api_methods
  rest_api_id = aws_api_gateway_rest_api.agent_api.id
  resource_id = each.value.resource_id
  http_method = each.value.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Output CloudFront URL
output "website_url" {
  value = "https://${aws_cloudfront_distribution.website_distribution.domain_name}"
}

# Output S3 bucket name for uploads
output "s3_bucket_name" {
  value = aws_s3_bucket.website_bucket.bucket
}

resource "aws_iam_user_policy" "s3_policy" {
  name = "s3-put-bucket-policy"
  user = "multi-agent-user"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutBucketPolicy", "s3:GetBucketPolicy"]
        Resource = "arn:aws:s3:::agent-registry-app-frontend"
      }
    ]
  })
}

# Define the IAM policy document for Secrets Manager access
data "aws_iam_policy_document" "secrets_manager_access" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["arn:aws:secretsmanager:us-east-1:891377344574:secret:SalesforceCredentials-*"]
  }
}

# Attach the policy to the existing lambda_exec_role IAM role
resource "aws_iam_role_policy" "lambda_secrets_manager_access" {
  name   = "SecretsManagerAccess"
  role   = "lambda_exec_role"
  policy = data.aws_iam_policy_document.secrets_manager_access.json
}