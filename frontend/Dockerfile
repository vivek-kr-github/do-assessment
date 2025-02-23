# Use Nginx as base image
FROM nginx:latest

# Copy static frontend files
COPY index.html /usr/share/nginx/html/index.html

# Copy custom Nginx config with placeholders
COPY nginx.conf /etc/nginx/templates/nginx.conf.template

# Replace env variables and start Nginx properly
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]

EXPOSE 80

