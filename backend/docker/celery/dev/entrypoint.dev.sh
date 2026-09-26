#!/bin/env bash

echo 'deploying celery server'
python3 -m celery -A celery_settings:app worker -E --loglevel=info
