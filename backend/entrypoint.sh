#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate --noinput || echo "Migration failed, continuing..."

echo 'collecting static files...'
python manage.py collectstatic --noinput || echo "Static file collection failed, continuing..."

echo "Starting Django server..."
python manage.py runserver 0.0.0.0:8000
