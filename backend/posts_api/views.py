import traceback
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model, authenticate, login
from django.shortcuts import render, redirect
from rest_framework_simplejwt.tokens import RefreshToken
from environment_variables import USE_S3_ENV, SERVICE_API_TOKEN
from posts_api.models import Posts, Profile
from posts_api.serializers import ProductSerializer, ProfileSerializer
from posts_api.utils import (
    log_crud_action,
    get_s3_url,
    delete_s3_file,
    get_dynamodb_logs,
)

from datetime import datetime

from django.core.files.storage import FileSystemStorage

from posts_api.models import UploadPrivate
from posts_api.tasks import process_image_task
from posts_api.storage_backends import PrivateMediaStorage


def image_upload(request):
    if request.method == "POST":
        image_file = request.FILES["image_file"]

        if USE_S3_ENV:
            upload = UploadPrivate(file=image_file)
            upload.save()
            image_url = upload.file.url
            print(f"image_upload image_url: {image_url}")
            print(f"image_upload upload: {upload}")
        else:
            fs = FileSystemStorage()
            filename = fs.save(image_file.name, image_file)
            image_url = fs.url(filename)
            print(f"image_upload image_url: {image_url}")
            print(f"image_upload filename: {filename}")

        return render(request, "upload.html", {"image_url": image_url})
    return render(request, "upload.html")


@method_decorator(csrf_exempt, name="dispatch")
class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Posts.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["id", "name"]

    def perform_create(self, serializer):
        post = serializer.save(user=self.request.user)
        log_crud_action(
            action_type="CREATE",
            model_name="Post",
            data={"id": post.id, "name": post.name, "price": str(post.price)},
            user_id=self.request.user.id,
        )

    def perform_update(self, serializer):
        post = serializer.save()
        log_crud_action(
            action_type="UPDATE",
            model_name="Post",
            data={"id": post.id, "name": post.name, "price": str(post.price)},
            user_id=self.request.user.id,
        )

    def perform_destroy(self, instance):
        product_id = instance.id
        product_name = instance.name
        instance.delete()
        log_crud_action(
            action_type="DELETE",
            model_name="Post",
            data={"id": product_id, "name": product_name},
            user_id=self.request.user.id,
        )

    def get_queryset(self):
        if getattr(self, "action", None) == "register_bw_image":
            return Posts.objects.all()
        return Posts.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        log_crud_action(
            action_type="READ",
            model_name="Post",
            data={"action": "list"},
            user_id=request.user.id,
        )
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        log_crud_action(
            action_type="READ",
            model_name="Post",
            data={"id": kwargs.get("pk")},
            user_id=request.user.id,
        )
        return response

    @action(detail=True, methods=["post"], url_path="upload-image")
    def upload_image(self, request, pk=None):
        post: Posts = self.get_object()
        print(f"upload_image post: {post}")

        if "image" not in request.FILES:
            print(f"upload_image error: No image provided")
            return Response(
                {"error": "No image provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_file = request.FILES["image"]
        print(f"upload_image image_file: {image_file}")

        try:
            old_image_s3_key = post.image_s3_key
            old_image_bw_s3_key = post.image_bw_s3_key
            old_image_thumbnail_s3_key = post.image_thumbnail_s3_key

            upload = UploadPrivate(file=image_file)
            upload.save()
            print(f"upload_image upload: {upload}")

            post.image_s3_key = upload.file.name
            post.image_bw_s3_key = None
            post.image_thumbnail_s3_key = None
            post.save()
            print(f"upload_image post saved: {post}")

            storage = PrivateMediaStorage()
            if old_image_s3_key:
                delete_s3_file(old_image_s3_key, storage)
            if old_image_bw_s3_key:
                delete_s3_file(old_image_bw_s3_key, storage)
            if old_image_thumbnail_s3_key:
                delete_s3_file(old_image_thumbnail_s3_key, storage)

            message = {
                "action": "process_image",
                "post_id": post.id,
                "upload_id": upload.id,
                "timestamp": datetime.now().isoformat(),
            }
            process_image_task.delay(message)
            print(f"upload_image message published: {message}")

            log_crud_action(
                action_type="UPDATE",
                model_name="Post",
                data={"id": post.id, "action": "image_upload", "s3_key": upload.file.name},
                user_id=request.user.id,
            )

            return Response(
                {
                    "message": "Imagem enviada com sucesso",
                    "s3_key": upload.file.name,
                    "image_url": upload.file.url,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"Erro ao fazer upload: {str(e)}")
            traceback.print_exc()
            return Response(
                {"error": f"Erro ao fazer upload: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)

        old_image_s3_key = instance.image_s3_key
        old_image_s3_key_bw = instance.image_bw_s3_key

        storage = PrivateMediaStorage()
        delete_s3_file(old_image_s3_key, storage)
        delete_s3_file(old_image_s3_key_bw, storage)

        return Response({"detail": "Object successfully deleted."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[AllowAny], url_path="register-bw-image")
    def register_bw_image(self, request, pk=None):
        try:
            service_token = request.headers.get("X-Service-Token", "")
            if not SERVICE_API_TOKEN or service_token != SERVICE_API_TOKEN:
                return Response(
                    {"error": "Acesso não autorizado"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            image_bw_s3_key = request.data.get("image_bw_s3_key")
            if not image_bw_s3_key:
                return Response(
                    {"error": "Campo image_bw_s3_key é obrigatório"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            post: Posts = self.get_object()
            post.image_bw_s3_key = image_bw_s3_key
            post.save(update_fields=["image_bw_s3_key"])

            log_crud_action(
                action_type="UPDATE",
                model_name="Post",
                data={"id": post.id, "action": "image_bw_registered", "s3_key": image_bw_s3_key},
                user_id=self.request.user.id if self.request.user.is_authenticated else None,
            )

            serializer = self.get_serializer(post)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error registering black and white image: {str(e)}")
            traceback.print_exc()
            return Response(
                {"error": f"Error registering black and white image: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@csrf_exempt
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == "GET":
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method in ["PUT", "PATCH"]:
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_crud_action(
                action_type="UPDATE",
                model_name="Profile",
                data={
                    "id": profile.id,
                    "age": serializer.validated_data.get("age"),
                    "course": serializer.validated_data.get("course"),
                    "city": serializer.validated_data.get("city"),
                },
                user_id=request.user.id,
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST", "OPTIONS"])
@authentication_classes([])
@permission_classes([AllowAny])
def register_view(request):
    if request.method == "OPTIONS":
        return Response(status=200)

    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not email or not password:
        return Response({"error": "All fields are required"}, status=400)

    User = get_user_model()

    if User.objects.filter(username=username).exists():
        return Response({"error": "User already exists"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already in use"}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    Profile.objects.create(user=user)
    return Response({"message": "User created successfully"}, status=201)


def login_page_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        if not username or not password:
            return render(request, "login.html", {"error": "Usuário e senha são obrigatórios"})

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            request.session["access_token"] = access_token
            request.session["refresh_token"] = refresh_token
            request.session["user_id"] = user.id

            return redirect("/feed/")
        else:
            return render(request, "login.html", {"error": "Credenciais inválidas"})

    return render(request, "login.html")


def register_page_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password = request.POST.get("password")

        if not username or not email or not password:
            return render(request, "register.html", {"error": "Todos os campos são obrigatórios"})

        User = get_user_model()

        if User.objects.filter(username=username).exists():
            return render(request, "register.html", {"error": "Usuário já existe"})

        if User.objects.filter(email=email).exists():
            return render(request, "register.html", {"error": "Email já está em uso"})

        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            Profile.objects.create(user=user)

            login(request, user)

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            request.session["access_token"] = access_token
            request.session["refresh_token"] = refresh_token
            request.session["user_id"] = user.id

            return redirect("/feed/")
        except Exception as e:
            return render(request, "register.html", {"error": f"Erro ao criar usuário: {str(e)}"})

    return render(request, "register.html")


def feed_page_view(request):
    if not request.user.is_authenticated:
        return redirect("/login/")

    posts = Posts.objects.filter(user=request.user).order_by("-created_at")

    posts_data = []
    for post in posts:
        post_dict = {
            "id": post.id,
            "name": post.name,
            "description": post.description,
            "price": post.price,
            "created_at": post.created_at,
            "image_url": get_s3_url(post.image_s3_key) if post.image_s3_key else None,
            "thumbnail_url": get_s3_url(post.image_thumbnail_s3_key) if post.image_thumbnail_s3_key else None,
            "bw_image_url": get_s3_url(post.image_bw_s3_key) if post.image_bw_s3_key else None,
        }
        posts_data.append(post_dict)

    return render(request, "feed.html", {"posts": posts_data, "user": request.user})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def logs_view(request):
    limit = int(request.query_params.get("limit", 100))
    action_type = request.query_params.get("action_type")
    model_name = request.query_params.get("model_name")

    logs = get_dynamodb_logs(limit=limit, action_type=action_type, model_name=model_name)

    return Response({"logs": logs, "count": len(logs)}, status=status.HTTP_200_OK)
