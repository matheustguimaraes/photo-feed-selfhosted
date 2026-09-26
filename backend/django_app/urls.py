from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_yasg import openapi
from drf_yasg.views import get_schema_view

from posts_api.views import (
    ProductViewSet,
    register_view,
    profile_view,
    image_upload,
    login_page_view,
    register_page_view,
    feed_page_view,
    logs_view,
)

router = DefaultRouter()
router.register("posts", ProductViewSet, basename="posts")

schema_view = get_schema_view(
    openapi.Info(
        title="Nuvem API",
        default_version="v1",
        description="Posts, profiles and image processing",
    ),
    public=True,
)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/register/", register_view, name="register"),
    path("auth/profile/", profile_view, name="profile"),
    path("logs/", logs_view, name="logs"),
    path("login/", login_page_view, name="login_page"),
    path("register/", register_page_view, name="register_page"),
    path("feed/", feed_page_view, name="feed_page"),
    path("upload/", image_upload, name="image_upload"),
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
