"""
Phase 1: Auth and user identity.
Provides register, login, logout; user_id via session or X-User-Id header.
"""
from flask import Blueprint, request, jsonify, session, g, current_app

auth_bp = Blueprint("auth", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


@auth_bp.post("/auth/register")
def register():
    """Create user; return user_id and optional session."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    body = request.get_json(force=True) or {}
    name = body.get("name")
    email = body.get("email")

    res = sb.table("users").insert({"name": name, "email": email or None}).execute()
    if not res.data:
        return jsonify({"error": "insert_failed", "message": "Could not create user"}), 500

    user = res.data[0]
    user_id = str(user["id"])

    session["user_id"] = user_id
    session.permanent = True

    return jsonify({"user_id": user_id, "name": user.get("name"), "email": user.get("email")}), 201


@auth_bp.post("/auth/login")
def login():
    """Login by email or user_id; return user_id."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    body = request.get_json(force=True) or {}
    email = body.get("email")
    user_id = body.get("user_id")

    if user_id:
        res = sb.table("users").select("id").eq("id", user_id).limit(1).execute()
    elif email:
        res = sb.table("users").select("id").eq("email", email).limit(1).execute()
    else:
        return jsonify({"error": "missing_identifier", "message": "email or user_id required"}), 400

    if not res.data:
        return jsonify({"error": "user_not_found", "message": "User not found"}), 404

    uid = str(res.data[0]["id"])
    session["user_id"] = uid
    session.permanent = True

    return jsonify({"user_id": uid})


@auth_bp.post("/auth/logout")
def logout():
    """Clear session."""
    session.pop("user_id", None)
    return jsonify({"ok": True})


@auth_bp.get("/auth/me")
def me():
    """Get current user from session or X-User-Id header."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "unauthorized", "message": "Not logged in"}), 401

    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("users").select("*").eq("id", user_id).limit(1).execute()
    if not res.data:
        session.pop("user_id", None)
        return jsonify({"error": "user_not_found"}), 404

    u = res.data[0]
    return jsonify({"user_id": str(u["id"]), "name": u.get("name"), "email": u.get("email")})


def _current_user_id():
    """Get user_id from session or X-User-Id header."""
    uid = session.get("user_id")
    if uid:
        return uid
    return request.headers.get("X-User-Id")


def require_user(f):
    """Decorator: require valid user_id; set g.user_id."""
    from functools import wraps

    @wraps(f)
    def wrapped(*args, **kwargs):
        uid = _current_user_id()
        if not uid:
            return jsonify({"error": "unauthorized", "message": "X-User-Id header or login required"}), 401
        g.user_id = uid
        return f(*args, **kwargs)

    return wrapped
