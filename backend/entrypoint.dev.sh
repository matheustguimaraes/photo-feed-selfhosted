#!/bin/bash

echo 'running database migrations'
python manage.py migrate

echo 'collecting static files...'
python manage.py collectstatic --noinput || echo "Static file collection failed, continuing..."

echo 'deploying backend server'
python manage.py runserver 0.0.0.0:8000
