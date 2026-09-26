data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  ec2_user_data = <<-EOF
#!/bin/bash
set -ex
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user-data script execution..."

yum update -y
yum install -y yum-utils

systemctl start amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl status amazon-ssm-agent || echo "SSM agent status check completed"

sudo yum update -y 
sudo amazon-linux-extras install docker 
sudo yum install docker 
sudo service docker start 
sudo usermod -a -G docker ec2-user 
docker info

sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose version

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
yum install -y unzip
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip


mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app

echo "User-data script execution completed."
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo "AWS CLI version: $(aws --version)"
EOF
}

resource "aws_instance" "docker_compose_host" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  key_name               = var.key_pair_name
  user_data              = local.ec2_user_data

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-docker-compose-host"
  }
}

resource "aws_eip" "ec2_eip" {
  domain   = "vpc"
  instance = aws_instance.docker_compose_host.id

  tags = {
    Name = "${var.project_name}-ec2-eip"
  }
}

