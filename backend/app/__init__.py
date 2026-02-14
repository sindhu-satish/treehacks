import os
from flask import Flask
from supabase import create_client

from dotenv import load_dotenv
load_dotenv()

def create_app():
    app = Flask(__name__)

    app.config.update(
        SUPABASE_URL = os.getenv("SUPABASE_URL"),
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY"),

        BRIGHTDATA_TOKEN = os.getenv("BRIGHTDATA_TOKEN"),
        BRIGHTDATA_ZONE = os.getenv("BRIGHTDATA_ZONE", "unlocker"),

        CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "1800")),
    )

    if app.config["SUPABASE_URL"] and app.config["SUPABASE_SERVICE_ROLE_KEY"]:
        app.extensions["supabase"] = create_client(
            app.config["SUPABASE_URL"],
            app.config["SUPABASE_SERVICE_ROLE_KEY"]
        )
    else:
        app.extensions["supabase"] = None


    from .marketplace import mktplace
    from .health import health
    from .preferences import prefs
    from .debug import debug

    app.register_blueprint(health)
    app.register_blueprint(mktplace, url_prefix="/api")
    app.register_blueprint(prefs, url_prefix='/api') # /api/user?
    app.register_blueprint(debug, url_prefix='/api/debug')

    return app