variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "mdcc-nuvem-t2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for logs"
  type        = string
  default     = "crud_logs"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "aws_access_key_id" {
  description = "AWS Access Key ID for application"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key for application"
  type        = string
  sensitive   = true
}

variable "terraform_state_bucket_name" {
  description = "S3 bucket name for Terraform state storage (must be globally unique)"
  type        = string
  default     = "mdcc-nuvem-terraform-state-t2"
}

variable "terraform_state_lock_table_name" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
  default     = "mdcc-nuvem-terraform-state-lock-t2"
}

variable "key_pair_name" {
  description = "Name of the AWS EC2 Key Pair to use for SSH access. Leave empty to disable SSH key configuration."
  type        = string
  default     = "mdcc-nuvem-key-pair-t2"
}

variable "create_app_user" {
  description = "Whether to create an IAM user for local development. Requires IAM:CreateUser permission. Set to false if your terraform user doesn't have IAM permissions."
  type        = bool
  default     = false
}


variable "aws_profile" {
  description = "AWS CLI profile used by the provider"
  type        = string
  default     = "default"
}
