from flask import Blueprint

health = Blueprint("health", __name__)

@health.get("/health")
def svc_health():
    return {"ok": True}