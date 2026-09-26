from django.contrib import admin
from posts_api.models import Posts, Profile, Upload, UploadPrivate


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "age", "course", "city", "created_at"]
    list_filter = ["created_at", "city", "course"]
    search_fields = ["user__username", "user__email", "course", "city"]
    readonly_fields = ["created_at", "updated_at"]


admin.site.register(Posts)
admin.site.register(Upload)
admin.site.register(UploadPrivate)
