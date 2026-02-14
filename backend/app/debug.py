from flask import Blueprint, request, jsonify, current_app

debug = Blueprint("debug", __name__)

@debug.get("/cache")
def list_cache():
    sb = current_app.extensions["supabase"]
    store = request.args.get("store")
    q = sb.table("scrape_cache").select("cache_key,store,zip,query,fetched_at").order("fetched_at", desc=True).limit(50)
    if store:
        q = q.eq("store", store)
    res = q.execute()
    return jsonify(res.data), 200