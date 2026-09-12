#!/bin/sh
set -e

# If CARTO_API_KEY is provided at container runtime, replace the placeholder in index.html
if [ -n "$CARTO_API_KEY" ]; then
  sed -i "s|__CARTO_API_KEY__|$CARTO_API_KEY|g" /usr/share/nginx/html/index.html
fi
