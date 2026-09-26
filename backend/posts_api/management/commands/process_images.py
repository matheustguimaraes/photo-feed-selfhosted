import json
import sys
import uuid

import cv2
import numpy as np
import pika
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from posts_api.models import Posts
from environment_variables import (
    RABBITMQ_HOST,
    RABBITMQ_PORT,
    RABBITMQ_USER,
    RABBITMQ_PASSWORD,
    RABBITMQ_QUEUE_NAME_ENV,
)


class Command(BaseCommand):
    help = "Process images from RabbitMQ queue and generate thumbnails"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting image processing worker..."))

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

            self.stdout.write(
                self.style.SUCCESS(
                    f"Connected to RabbitMQ. Waiting for messages in queue '{RABBITMQ_QUEUE_NAME_ENV}'..."
                )
            )

            def callback(ch, method, properties, body):
                try:
                    message = json.loads(body)
                    self.stdout.write(self.style.WARNING(f"Received message: {message}"))

                    action = message.get("action")
                    if action == "process_image":
                        self.process_image(message)

                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    self.stdout.write(self.style.SUCCESS("Message processed successfully"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=RABBITMQ_QUEUE_NAME_ENV, on_message_callback=callback)

            self.stdout.write(self.style.SUCCESS("Waiting for messages. To exit press CTRL+C"))
            channel.start_consuming()

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nStopping worker..."))
            if "connection" in locals():
                connection.close()
            sys.exit(0)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error connecting to RabbitMQ: {e}"))
            sys.exit(1)

    def process_image(self, message):
        product_id = message.get("product_id")
        s3_key = message.get("s3_key")

        if not product_id or not s3_key:
            self.stdout.write(self.style.ERROR("Missing product_id or s3_key in message"))
            return

        try:
            post = Posts.objects.get(id=product_id)
        except Posts.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Post {product_id} not found"))
            return

        try:
            self.stdout.write(self.style.WARNING(f"Downloading image: {s3_key}"))
            image_file = default_storage.open(s3_key, "rb")
            image_data = image_file.read()
            image_file.close()

            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                self.stdout.write(self.style.ERROR("Failed to decode image"))
                return

            height, width = img.shape[:2]
            max_size = 300

            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))

            thumbnail = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)

            is_success, buffer = cv2.imencode(".jpg", thumbnail)
            if not is_success:
                self.stdout.write(self.style.ERROR("Failed to encode thumbnail"))
                return

            thumbnail_data = buffer.tobytes()

            thumbnail_s3_key = f"posts/{product_id}/thumbnails/{uuid.uuid4()}_thumbnail.jpg"

            self.stdout.write(self.style.WARNING(f"Uploading thumbnail: {thumbnail_s3_key}"))
            default_storage.save(thumbnail_s3_key, ContentFile(thumbnail_data))

            post.image_thumbnail_s3_key = thumbnail_s3_key
            post.save()

            self.stdout.write(self.style.SUCCESS(f"Thumbnail generated and saved for post {product_id}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing image: {e}"))
            import traceback

            traceback.print_exc()
