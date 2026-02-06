# FileSmile Static Assets - nginx
# Serves: Outlook add-in, Frontend admin, Scanner app
FROM nginx:alpine
RUN apk add --no-cache curl

# Outlook add-in (served at root: /taskpane.html, /assets/*, /src/*)
COPY outlook-addin/ /usr/share/nginx/html/outlook/

# Frontend admin panel (served at /admin/*)
COPY frontend/ /usr/share/nginx/html/admin/

# Scanner app (served at /scanner/*)
# Note: scanner-app must be pre-built (npm run build) before Docker build
COPY scanner-app/dist/ /usr/share/nginx/html/scanner/

# Nginx config
COPY static.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
