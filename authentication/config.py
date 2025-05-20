from functools import lru_cache
from os import getenv

class Settings:
    region = getenv("AWS_REGION", "us-east-1")
    pool_id = getenv("COGNITO_POOL_ID")
    client_id = getenv("COGNITO_CLIENT_ID")
    client_secret = getenv("COGNITO_CLIENT_SECRET")  # may be empty
    jwt_audience = getenv("JWT_AUDIENCE", client_id)
    secret_arn = getenv("SECRET_ARN")                # Secrets Manager

@lru_cache
def get_settings() -> Settings:
    return Settings()
