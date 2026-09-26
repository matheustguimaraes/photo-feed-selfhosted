from rest_framework import serializers
from posts_api.models import Posts, Profile

from posts_api.utils import get_s3_url


class ProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    bw_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Posts
        fields = "__all__"
        read_only_fields = [
            "created_at",
            "updated_at",
            "image_s3_key",
            "image_bw_s3_key",
            "image_thumbnail_s3_key",
            "user",
        ]

    def get_image_url(self, obj):
        if obj.image_s3_key:
            return get_s3_url(obj.image_s3_key)
        return None

    def get_bw_image_url(self, obj):
        if obj.image_bw_s3_key:
            return get_s3_url(obj.image_bw_s3_key)
        return None

    def get_thumbnail_url(self, obj):
        if obj.image_thumbnail_s3_key:
            return get_s3_url(obj.image_thumbnail_s3_key)
        return None


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "user", "username", "email", "age", "course", "city", "created_at", "updated_at"]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
