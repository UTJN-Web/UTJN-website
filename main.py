# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import asyncio

# 認証ルーターを読み込む
from authentication.use_case.signup.signup_controller import router as signup_router
from authentication.use_case.login.login_controller import login_router
from authentication.use_case.forgot_password.forgotpass_controller import forgotpass_router
from authentication.use_case.contact.contact_controller import contact_router
from authentication.use_case.user.user_controller import user_router
from authentication.use_case.form.form_controller import form_router
from authentication.use_case.event.event_controller import event_router
from authentication.use_case.refund.refund_controller import refund_router
from authentication.use_case.admin.admin_controller import router as admin_router
from authentication.use_case.send_contact_form.send_contact_form_controller import email_router as contact_form_router
from authentication.data_access.database_init import init_database
from authentication.data_access.database_pool import initialize_global_pool, close_global_pool

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

# ─── 静的ファイル ─────────────────────────────────────
# アップロードされた画像を提供するための静的ファイルマウント
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ─── ルーター登録 ─────────────────────────────────────
app.include_router(signup_router)
app.include_router(login_router)
app.include_router(forgotpass_router)
app.include_router(contact_router)
app.include_router(user_router)
app.include_router(form_router)
app.include_router(event_router)
app.include_router(refund_router)
app.include_router(admin_router)
app.include_router(contact_form_router)

@app.on_event("startup")
async def startup_event():
    """Initialize global connection pool and database"""
    try:
        # Initialize global connection pool first
        min_size = int(os.getenv("DB_POOL_MIN_SIZE", "5"))
        max_size = int(os.getenv("DB_POOL_MAX_SIZE", "20"))
        await initialize_global_pool(min_size=min_size, max_size=max_size)
        print(f"✅ Global connection pool initialized (min: {min_size}, max: {max_size})")
        
        # Initialize database tables
        await init_database()
        print("✅ Database connection verified and ready")
    except Exception as e:
        print(f"⚠️ Database initialization failed: {e}")
        print("⚠️ The app will continue but database operations may fail")
        print("⚠️ Connection pool will be initialized on first request")
        # アプリケーションは起動を続行する

@app.on_event("shutdown")
async def shutdown_event():
    """Close global connection pool on shutdown"""
    try:
        await close_global_pool()
        print("✅ Global connection pool closed")
    except Exception as e:
        print(f"⚠️ Error closing connection pool: {e}")

# 健康チェック用
@app.get("/ping")
def ping():
    return {"status": "ok"}

# プール状態監視用
@app.get("/pool-status")
async def get_pool_status():
    """Get database connection pool status"""
    try:
        from authentication.data_access.database_pool import get_pool_manager
        pool_manager = get_pool_manager()
        status = await pool_manager.get_pool_status()
        return status
    except Exception as e:
        return {"status": "error", "message": str(e)}
