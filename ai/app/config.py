from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    port: int = 5001
    api_base_url: str = "http://localhost:4000"
    model: str = "claude-sonnet-4-6"

    class Config:
        env_file = ".env"


settings = Settings()
