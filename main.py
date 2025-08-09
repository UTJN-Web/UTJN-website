# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio

# 認証ルーターを読み込む
from authentication.use_case.signup.signup_controller import router as signup_router
from authentication.use_case.login.login_controller import login_router
from authentication.use_case.contact.contact_controller import contact_router
from authentication.use_case.user.user_controller import user_router
from authentication.use_case.form.form_controller import form_router
from authentication.use_case.event.event_controller import event_router
from authentication.use_case.refund.refund_controller import refund_router
from authentication.data_access.database_init import init_database

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
app.include_router(login_router)
app.include_router(contact_router)
app.include_router(user_router)
app.include_router(form_router)
app.include_router(event_router)
app.include_router(refund_router)

@app.on_event("startup")
async def startup_event():
    """Check database connection and initialize if needed"""
    try:
        await init_database()
        print("✅ Database connection verified and ready")
    except Exception as e:
        print(f"⚠️ Database connection failed: {e}")
        print("⚠️ The app will continue but database operations may fail")

# 健康チェック用
@app.get("/ping")
def ping():
    return {"status": "ok"}
