import json
import traceback
from datetime import datetime

import boto3
import pika
from django.core.files.storage import default_storage
from environment_variables import (
    AWS_ACCESS_KEY_DYNAMODB,
    AWS_ACCESS_KEY_ID_ENV,
    AWS_S3_ENDPOINT_URL_ENV,
    AWS_S3_REGION_NAME_ENV,
    AWS_SECRET_ACCESS_KEY_DYNAMODB,
    AWS_SECRET_ACCESS_KEY_ENV,
    AWS_STORAGE_BUCKET_NAME_ENV,
    DEBUG_MODE,
    DYNAMODB_REGION_ENV,
    DYNAMODB_TABLE_NAME_ENV,
    RABBITMQ_HOST,
    RABBITMQ_PASSWORD,
    RABBITMQ_PORT,
    RABBITMQ_QUEUE_NAME_ENV,
    RABBITMQ_USER,
    SNS_TOPIC_ARN,
)
from posts_api.storage_backends import PrivateMediaStorage


def get_s3_client():
    client_kwargs = {
        "aws_access_key_id": AWS_ACCESS_KEY_ID_ENV,
        "aws_secret_access_key": AWS_SECRET_ACCESS_KEY_ENV,
        "region_name": AWS_S3_REGION_NAME_ENV,
    }
    if AWS_S3_ENDPOINT_URL_ENV:
        client_kwargs["endpoint_url"] = AWS_S3_ENDPOINT_URL_ENV
    return boto3.client("s3", **client_kwargs)


def get_s3_url(s3_key):
    print(f"get_s3_url s3_key: {s3_key}")
    if not s3_key:
        return None

    if not s3_key.startswith("private/"):
        s3_key = f"private/{s3_key}"

    storage = PrivateMediaStorage()
    real_key = s3_key.replace("private/", "", 1)
    return storage.url(real_key)


def upload_to_s3(file, s3_key):
    print(f"upload_to_s3 file: {file}")
    print(f"upload_to_s3 s3_key: {s3_key}")

    return default_storage.save(s3_key, file)


def delete_s3_file(s3_key, storage_class=None):
    if not s3_key:
        return

    try:
        storage_class = PrivateMediaStorage()

        bucket_name = AWS_STORAGE_BUCKET_NAME_ENV
        location = storage_class.location
        full_key = f"{location}/{s3_key}"

        full_key = full_key.lstrip("/")

        s3_client = get_s3_client()
        s3_client.delete_object(Bucket=bucket_name, Key=full_key)
        print(f"delete_s3_file: Successfully deleted {full_key} from bucket {bucket_name}")
    except Exception as e:
        print(f"delete_s3_file: Error deleting {s3_key}: {str(e)}")
        traceback.print_exc()


def log_crud_action(action_type, model_name, data, user_id=None):
    if DEBUG_MODE:
        print(f"log_crud_action DEBUG: {DEBUG_MODE}")
        return

    try:
        dynamodb = boto3.resource(
            "dynamodb",
            aws_access_key_id=AWS_ACCESS_KEY_DYNAMODB,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY_DYNAMODB,
            region_name=DYNAMODB_REGION_ENV,
        )
        print(f"log_crud_action dynamodb: {dynamodb}")

        table = dynamodb.Table(DYNAMODB_TABLE_NAME_ENV)
        print(f"log_crud_action table: {table}")

        log_item = {
            "id": f"{model_name}_{datetime.now().isoformat()}",
            "action_type": action_type,
            "model_name": model_name,
            "data": json.dumps(data, default=str),
            "timestamp": datetime.now().isoformat(),
            "user_id": str(user_id) if user_id else None,
        }
        print(f"log_crud_action log_item: {log_item}")

        table.put_item(Item=log_item)
        print(f"log_crud_action table.put_item: {table.put_item}")

    except Exception as e:
        print(f"log_crud_action error: {e}")
        traceback.print_exc()


def log_request_info(ip_address, user_id, username, path=None, method=None):
    if DEBUG_MODE:
        print(f"log_request_info DEBUG: {DEBUG_MODE}")
        return

    try:
        dynamodb = boto3.resource(
            "dynamodb",
            aws_access_key_id=AWS_ACCESS_KEY_DYNAMODB,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY_DYNAMODB,
            region_name=DYNAMODB_REGION_ENV,
        )
        print(f"log_request_info dynamodb: {dynamodb}")

        table = dynamodb.Table(DYNAMODB_TABLE_NAME_ENV)
        print(f"log_request_info table: {table}")

        log_item = {
            "id": f"REQUEST_{datetime.now().isoformat()}",
            "action_type": "REQUEST",
            "model_name": "System",
            "ip_address": ip_address,
            "user_id": str(user_id) if user_id else None,
            "username": username if username else None,
            "path": path if path else None,
            "method": method if method else None,
            "timestamp": datetime.now().isoformat(),
        }
        print(f"log_request_info log_item: {log_item}")
        table.put_item(Item=log_item)
        print(f"log_request_info table.put_item: {table.put_item}")

    except Exception as e:
        print(f"log_request_info error: {e}")
        traceback.print_exc()


def publish_to_rabbitmq(message):
    print(f"publish_to_rabbitmq message: {message}")

    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=RABBITMQ_HOST,
                port=RABBITMQ_PORT,
                credentials=pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD),
            )
        )
        channel = connection.channel()

        channel.queue_declare(queue=RABBITMQ_QUEUE_NAME_ENV, durable=True)

        channel.basic_publish(
            exchange="",
            routing_key=RABBITMQ_QUEUE_NAME_ENV,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2),
        )

        connection.close()
        return True
    except Exception as e:
        print(f"publish_to_rabbitmq error: {e}")
        traceback.print_exc()
        return None


def publish_to_sns(message):
    print(f"publish_to_sns message: {message}")

    if not SNS_TOPIC_ARN:
        print("publish_to_sns error: SNS_TOPIC_ARN not configured, skipping publication")
        return None

    try:
        sns_client = boto3.client(
            "sns",
            aws_access_key_id=AWS_ACCESS_KEY_ID_ENV,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY_ENV,
            region_name=AWS_S3_REGION_NAME_ENV,
        )

        response = sns_client.publish(
            TopicArn=SNS_TOPIC_ARN, Message=json.dumps(message), Subject="Image Processing Request"
        )

        print(f"publish_to_sns response: {response['MessageId']}")
        return response
    except Exception as e:
        print(f"publish_to_sns error: {e}")
        traceback.print_exc()
        return None


def get_dynamodb_logs(limit=100, action_type=None, model_name=None):
    try:
        dynamodb = boto3.resource(
            "dynamodb",
            aws_access_key_id=AWS_ACCESS_KEY_DYNAMODB,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY_DYNAMODB,
            region_name=DYNAMODB_REGION_ENV,
        )

        table = dynamodb.Table(DYNAMODB_TABLE_NAME_ENV)

        scan_kwargs = {"Limit": limit}

        if action_type or model_name:
            from boto3.dynamodb import conditions

            filter_expression = None
            if action_type:
                filter_expression = conditions.Attr("action_type").eq(action_type)
            if model_name:
                model_filter = conditions.Attr("model_name").eq(model_name)
                if filter_expression:
                    filter_expression = filter_expression & model_filter
                else:
                    filter_expression = model_filter

            if filter_expression:
                scan_kwargs["FilterExpression"] = filter_expression

        response = table.scan(**scan_kwargs)
        items = response.get("Items", [])

        from decimal import Decimal

        logs = []
        for item in items:
            log = {}
            for k, v in item.items():
                if isinstance(v, Decimal):
                    log[k] = str(v)
                elif isinstance(v, (dict, list)):
                    log[k] = json.loads(json.dumps(v, default=str))
                else:
                    log[k] = v
            logs.append(log)

        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return logs

    except Exception as e:
        print(f"get_dynamodb_logs error: {e}")
        traceback.print_exc()
        return []
