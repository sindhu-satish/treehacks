from flask import Blueprint, request, jsonify, current_app

prefs = Blueprint("prefs", __name__)

@prefs.get("/preferences/<user_id>")
def get_prefs(user_id):
    sb = current_app.extensions["supabase"]
    res = sb.table("user_preferences").select("*").eq("user_id", user_id).limit(1).execute()
    if not res.data:
        return jsonify({"user_id": user_id, "exists": False}), 200
    return jsonify(res.data[0]), 200

@prefs.post("/preferences/<user_id>")
def upsert_prefs(user_id):
    sb = current_app.extensions["supabase"]
    body = request.get_json(force=True) or {}
    body["user_id"] = user_id
    res = sb.table("user_preferences").upsert(body).execute()
    return jsonify(res.data[0] if res.data else {"ok": True}), 200