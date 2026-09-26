from io import BytesIO
from PIL import Image
from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist
import traceback

from django.core.files.base import ContentFile

from posts_api.models import Posts, Upload, UploadPrivate


@shared_task
def sum_a_and_b(a: int, b: int):
    return a + b


@shared_task
def process_image_task(message: dict):
    print(f"process_image_task message: {message}")
    try:
        post_id = message.get("post_id")
        upload_id = message.get("upload_id")

        print(f"process_image_task post_id: {post_id}")
        print(f"process_image_task upload_id: {upload_id}")

        if not post_id or not upload_id:
            print(f"process_image_task post_id not found")
            return

        post = Posts.objects.get(id=post_id)

        upload = None
        private = False
        if UploadPrivate.objects.filter(id=upload_id).exists():
            upload = UploadPrivate.objects.filter(id=upload_id).first()
            private = True
        else:
            print(f"process_image_task upload not found")
            return None

        file_name = upload.file.name
        image_data = upload.file.read()

        image = Image.open(BytesIO(image_data))
        bw_image = image.convert("L")
        bw_image_rgb = bw_image.convert("RGB")

        output_buffer = BytesIO()
        format_ext = image.format if image.format else "JPEG"
        if format_ext not in ["JPEG", "PNG"]:
            format_ext = "JPEG"

        bw_image_rgb.save(output_buffer, format=format_ext, quality=95)
        output_buffer.seek(0)

        print(f"process_image_task created black and white image")

        base_key = file_name.rsplit(".", 1)[0] if "." in file_name else file_name
        extension = file_name.rsplit(".", 1)[1] if "." in file_name else "jpg"
        bw_filename = f"{base_key}_bw.{extension}"

        file_content = output_buffer.read()
        bw_file = ContentFile(file_content, name=bw_filename)

        print(f"process_image_task bw_filename: {bw_filename}")

        if private:
            upload_bw = UploadPrivate(file=bw_file)
            upload_bw.save()
            print(f"process_image_task private storage bw_s3_key: {upload_bw.file.name}")
        else:
            upload_bw = Upload(file=bw_file)
            upload_bw.save()
            print(f"process_image_task public storage bw_s3_key: {upload_bw.file.name}")

        if post_id:
            try:
                post = Posts.objects.get(id=post_id)
                post.image_bw_s3_key = upload_bw.file.name
                post.save(update_fields=["image_bw_s3_key"])
                print(f"process_image_task post saved: {post}")
            except ObjectDoesNotExist:
                print(f"Post with id {post_id} not found")

    except Exception as e:
        print(f"Error processing image {post.image_s3_key}: {str(e)}")
        traceback.print_exc()
        raise
