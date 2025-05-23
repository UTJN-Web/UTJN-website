from functools import lru_cache
from os import getenv
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

class Settings:
    database_url = getenv("DATABASE_URL")
    pool_id = getenv("COGNITO_POOL_ID")
    client_id = getenv("COGNITO_CLIENT_ID")
    region = getenv("COGNITO_REGION")
    arn = getenv("ARN")
    aws_access_key = getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = getenv("AWS_SECRET_ACCESS_KEY")
    client_secret = getenv("COGNITO_CLIENT_SECRET")

@lru_cache
def get_settings() -> Settings:
    return Settings()

if __name__ == "__main__":
    settings = get_settings()
    if settings.pool_id:
        print("1")
    if settings.client_id:
        print("2")
    if settings.region:
        print("3")
    if settings.arn:
        print("4")
    if settings.access_key:
        print("5")
    if settings.secret_key:
        print("6")
    if settings.client_secret:
        print("7")
    if settings.database_url:
        print("8")