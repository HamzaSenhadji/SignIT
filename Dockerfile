FROM python:3.12-slim

WORKDIR /app

COPY server.py .
COPY index.html .
COPY explorer.html .
COPY css/ css/
COPY js/ js/
COPY images/ images/
COPY feuilles/ feuilles/

EXPOSE 8080

CMD ["python", "server.py"]
