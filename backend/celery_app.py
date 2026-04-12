import os

from celery import Celery

broker = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "rainuse",
    broker=broker,
    backend=backend,
    include=[
        "tasks.scan_territory",
        "tasks.run_sonar",
        "tasks.generate_report",
        "tasks.route_to_rep",
        "tasks.generate_debrief",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Chicago",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
