# Changelog

## 2026-09-26

- Split the self-hosted version into its own repository, separate from the AWS one.
- Removed debug prints that logged credentials at startup, and read the Django secret key from the environment.
- Removed the unused `products_api` app, the old `products` pages and leftover Dockerfiles that were not part of the stack.
- Added `.env.docker.example` files, README with architecture and run steps, and this changelog.

## 2026-01

- Logs page in the frontend and `/logs/` endpoint reading from DynamoDB with filters.
- Deleting a post or replacing its image also removes the old files from MinIO.
- Terraform for a single EC2 host with Docker Compose, Elastic IP, DynamoDB table and IAM role.

## 2025-12 — Docker and self-hosted services

- Replaced S3 with MinIO, including a setup container that creates the buckets.
- Replaced SNS/SQS and Lambda with RabbitMQ and a Celery worker that converts images to grayscale.
- Postgres runs as a container instead of RDS.
- Dockerfiles for backend, worker and frontend; one `docker-compose.yaml` starts everything on a shared network.
- Server-rendered login, register and feed pages in Django alongside the Next.js frontend.
