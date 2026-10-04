FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install "pydantic[email]"

COPY . .

EXPOSE 8080

CMD ["python", "run.py"]
