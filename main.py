# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# 認証ルーターを読み込む
from authentication.use_case.signup.signup_controller import router as signup_router

app = FastAPI()

# ─── CORS ───────────────────────────────────────────────
origins_env = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in origins_env.split(",") if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],  # 開発中は * でも可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ルーター登録 ─────────────────────────────────────
app.include_router(signup_router)

# 健康チェック用
@app.get("/ping")
def ping():
    return {"status": "ok"}
