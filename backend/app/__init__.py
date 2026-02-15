"""
Mahm backend – Flask app.
Implements auth, user profile, meal plans, marketplace, cart, recipes, meal logs.
"""
import os
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv

# Load .env from backend/ regardless of CWD
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-in-production")

    app.config.update(
        SUPABASE_URL=os.getenv("SUPABASE_URL"),
        SUPABASE_SERVICE_ROLE_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        CACHE_TTL_SECONDS=int(os.getenv("CACHE_TTL_SECONDS", "1800")),
        SCRAPER_SERVICE_URL=(os.getenv("SCRAPER_SERVICE_URL") or "").strip() or None,
        MARKETPLACE_STORES=(os.getenv("MARKETPLACE_STORES") or "walmart,safeway,target").strip(),
    )

    if app.config["SUPABASE_URL"] and app.config["SUPABASE_SERVICE_ROLE_KEY"]:
        app.extensions["supabase"] = create_client(
            app.config["SUPABASE_URL"],
            app.config["SUPABASE_SERVICE_ROLE_KEY"],
        )
    else:
        app.extensions["supabase"] = None

    CORS(app, origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","), supports_credentials=True)

    from .health import health
    from .auth import auth_bp
    from .user_profile import user_bp
    from .meal_plans import meal_plans_bp
    from .marketplace import marketplace_bp
    from .cart import cart_bp
    from .recipes import recipes_bp
    from .meal_logs import meal_logs_bp

    app.register_blueprint(health, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(meal_plans_bp, url_prefix="/api")
    app.register_blueprint(marketplace_bp, url_prefix="/api")
    app.register_blueprint(cart_bp, url_prefix="/api")
    app.register_blueprint(recipes_bp, url_prefix="/api")
    app.register_blueprint(meal_logs_bp, url_prefix="/api")

    return app
