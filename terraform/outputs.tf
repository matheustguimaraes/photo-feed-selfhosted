output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.docker_compose_host.id
}

output "ec2_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_eip.ec2_eip.public_ip
}

output "ec2_public_dns" {
  description = "EC2 instance public DNS"
  value       = aws_instance.docker_compose_host.public_dns
}

output "ssh_command" {
  description = "SSH command to connect to EC2 instance"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.ec2_eip.public_ip}"
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for backend logs"
  value       = aws_dynamodb_table.crud_logs.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.crud_logs.arn
}

output "dynamodb_region" {
  description = "AWS region where DynamoDB table is located"
  value       = var.aws_region
}

output "dynamodb_local_access_info" {
  description = "Information for accessing DynamoDB locally"
  value       = <<-EOT
    To access DynamoDB locally, use:
    
    AWS CLI:
      aws dynamodb list-tables --profile ${var.aws_profile} --region ${var.aws_region}
      aws dynamodb describe-table --table-name ${aws_dynamodb_table.crud_logs.name} --profile ${var.aws_profile} --region ${var.aws_region}
    
    Table Name: ${aws_dynamodb_table.crud_logs.name}
    Region: ${var.aws_region}
    ARN: ${aws_dynamodb_table.crud_logs.arn}
  EOT
}

output "ec2_setup_info" {
  description = "Information about the EC2 instance setup"
  value       = <<-EOT
    EC2 Instance is ready for docker-compose deployment.
    
    SSH to the instance:
      ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.ec2_eip.public_ip}
    
    Once connected, you can:
      1. Navigate to /home/ec2-user/app
      2. Upload your docker-compose.yml file
      3. Run: docker-compose up -d
    
    Docker and Docker Compose are already installed and configured.
  EOT
}

