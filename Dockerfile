FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY explorer.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY images/ /usr/share/nginx/html/images/
COPY feuilles/ /usr/share/nginx/html/feuilles/
EXPOSE 80
