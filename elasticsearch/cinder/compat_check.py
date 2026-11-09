#!/usr/bin/env python3
# [LAYER: INFRASTRUCTURE]
"""Check that CINDER's current src/ code and the cinder-* Elasticsearch indices still fit together.

  python3 elasticsearch/cinder/compat_check.py [eventId]

1. App -> ES: runs CINDER's own scenario (src/core), maps the entities it produces with the adapter
   functions below, and indexes them into TEMPORARY copies of the strict cinder-* mappings
   (cinder-compat-*, deleted afterwards). Unmapped or mistyped fields fail loudly here.
2. ES -> App: maps one event's sessions/spaces/prompts to the shapes the app serves on /api/agenda and
   constructs real domain `Session` objects from them.

The to_*/from_* functions are the reference adapter for the integration code. Exit code 1 on any failure.
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
from setup import ENV, es  # noqa: E402

DEFAULT_EVENT = "urn:ue:event:dataops-days-2026"
RUNTIME = ["cinder-registrations", "cinder-pods", "cinder-messages", "cinder-interactions"]


# ------------------------------------------------------------------ App -> ES adapter
def to_registration(attendee, event_id):
    """Attendee.toJSON() -> cinder-registrations. Drops the app's 32-dim hashed embedding: the index holds
    1024-dim model vectors, and the default pipeline (cinder-embed-registration) computes them on write."""
    doc = {k: v for k, v in attendee.items() if k != "embedding"}
    return doc | {"eventId": event_id, "personId": doc.get("personId", doc["id"]), "role": doc.get("role", "attendee")}


def to_pod(pod, event_id):
    """Pod.toJSON() (+compositionMeta) -> cinder-pods. Messages live in cinder-messages, not on the pod."""
    return {k: v for k, v in pod.items() if k != "messages"} | {"eventId": event_id, "status": pod.get("status", "active")}


def to_pod_messages(pod, event_id):
    return [m | {"eventId": event_id, "channel": "pod"} for m in pod.get("messages", [])]


def to_direct_message(msg, event_id):
    return msg | {"eventId": event_id, "channel": "direct"}


def to_interaction(match, event_id):
    return match | {"eventId": event_id}


# ------------------------------------------------------------------ ES -> App adapter
def from_session(s):
    """cinder-sessions doc -> the Session shape served on /api/agenda (times are local to the event)."""
    return {"id": s["id"], "title": s["title"], "speakers": s.get("speakerNames", []),
            "startTime": s["startDate"][11:16], "endTime": s["endDate"][11:16], "room": s["roomName"],
            "track": s.get("track") or s["sessionType"].title(), "description": s.get("abstract", ""),
            "startDate": s["startDate"], "endDate": s["endDate"], "timezone": s.get("timezone"),
            "sessionType": s["sessionType"], "spaceId": s.get("spaceId")}


def from_space(sp):
    """cinder-spaces doc -> VENUE_LOCATIONS shape {id, name, tag, capacity}."""
    return {"id": sp["id"], "name": sp["name"], "tag": " & ".join(t.title() for t in sp["tags"][:2]), "capacity": sp["capacity"]}


# ------------------------------------------------------------------ checks
def put_doc(index, doc):
    req = urllib.request.Request(f"{ENV['ES_URL'].rstrip('/')}/{index}/_doc/{doc['id']}?refresh=true", data=json.dumps(doc).encode(),
                                 method="PUT", headers={"Authorization": "ApiKey " + ENV["ES_API_KEY"], "Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=60)
        return None
    except urllib.error.HTTPError as e:
        err = json.loads(e.read()).get("error", {})
        return f"{err.get('type')}: {str(err.get('reason', ''))[:200]}"


def node(*args):
    out = subprocess.run(["node", os.path.join(HERE, "dump_entities.mjs"), *args], cwd=REPO, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"node {' '.join(args)} failed:\n{out.stderr[-2000:]}")
    return json.loads(out.stdout)


def check_app_to_es(event_id):
    ents = node("dump")
    defs = json.load(open(os.path.join(HERE, "indices.json")))
    tmp = {name: name.replace("cinder-", "cinder-compat-") for name in RUNTIME}
    failures = []
    for name, t in tmp.items():
        es("PUT", f"/{t}", defs[name])
    try:
        cases = [("registration", tmp["cinder-registrations"], to_registration(a, event_id)) for a in ents["attendees"]]
        for p in ents["pods"]:
            cases.append(("pod", tmp["cinder-pods"], to_pod(p, event_id)))
            cases += [("pod message", tmp["cinder-messages"], m) for m in to_pod_messages(p, event_id)]
        cases.append(("direct message", tmp["cinder-messages"], to_direct_message(ents["directMessage"], event_id)))
        cases += [("match", tmp["cinder-interactions"], to_interaction(m, event_id)) for m in ents["matches"]]
        counts = {}
        for kind, index, doc in cases:
            err = put_doc(index, doc)
            counts[kind] = counts.get(kind, 0) + 1
            if err:
                failures.append(f"{kind} {doc['id']}: {err}")
        print("App -> ES:", ", ".join(f"{n} {k}" for k, n in counts.items()))
        emb = es("POST", f"/{tmp['cinder-registrations']}/_search",
                 {"size": 50, "_source": {"includes": ["embedding"], "exclude_vectors": False}})["hits"]["hits"]
        bad = [h["_id"] for h in emb if len(h["_source"].get("embedding") or []) != 1024]
        print(f"  runtime embedding pipeline: {len(emb) - len(bad)}/{len(emb)} registrations embedded (1024 dims)")
        failures += [f"registration {i}: not embedded by pipeline" for i in bad]
    finally:
        for t in tmp.values():
            es("DELETE", f"/{t}")
    return failures


def check_es_to_app(event_id):
    q = lambda idx, body: [h["_source"] for h in es("POST", f"/{idx}/_search", body)["hits"]["hits"]]
    sessions = [from_session(s) for s in q("cinder-sessions", {"size": 500, "query": {"term": {"eventId": event_id}},
                                                                "sort": [{"startDate": "asc"}], "_source": {"excludes": ["searchText", "embedding"]}})]
    ev = es("GET", f"/eventapp/_doc/{event_id}")["_source"]
    venue = next((l["@id"] for l in ev.get("location", []) if l.get("@type") != "VirtualLocation"), None)
    owner = {"term": {"venueId": venue}} if venue else {"term": {"eventId": event_id}}
    venues = [from_space(s) for s in q("cinder-spaces", {"size": 50, "query": {"bool": {"filter": [owner, {"term": {"meetupFriendly": True}}]}}})]
    failures = []
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"sessions": sessions}, f)
    try:
        res = node("sessions", f.name)
    finally:
        os.unlink(f.name)
    failures += [f"Session {e}" for e in res["errors"]]
    if not sessions:
        failures.append(f"no sessions for {event_id}")
    if not venues or not all(all(v.get(k) not in (None, "") for k in ("id", "name", "tag", "capacity")) for v in venues):
        failures.append("venues missing or not in VENUE_LOCATIONS shape")
    print(f"ES -> App: {res['total'] - len(res['errors'])}/{res['total']} Session entities constructed, {len(venues)} meetup venues")
    return failures


if __name__ == "__main__":
    event = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EVENT
    print("event:", event)
    problems = check_app_to_es(event) + check_es_to_app(event)
    for p in problems:
        print("  FAIL", p)
    print("COMPATIBLE" if not problems else f"{len(problems)} PROBLEM(S)")
    sys.exit(1 if problems else 0)
