import os

import django
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_app.settings")

django.setup()

app = Celery("backend_t2")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
app.conf.worker_hijack_root_logger = False


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
