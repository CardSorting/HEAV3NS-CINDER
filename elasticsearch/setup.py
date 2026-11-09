#!/usr/bin/env python3
# [LAYER: INFRASTRUCTURE]
"""Manage the eventapp index and its ingest pipelines.

Usage (from the project root):
  python3 elasticsearch/setup.py pipelines        # install/update both ingest pipelines
  python3 elasticsearch/setup.py index            # create the eventapp index (fails if it exists)
  python3 elasticsearch/setup.py simulate [N]     # dry-run the synthetic pipeline on N events2 docs
  python3 elasticsearch/setup.py reindex          # events2 -> eventapp through eventapp-synthetic
  python3 elasticsearch/setup.py purge-synthetic  # delete synthetic:true docs from eventapp
  python3 elasticsearch/setup.py all              # pipelines + index + reindex

Reads ES_URL, ES_API_KEY and ES_INDEX from .env in the project root.
"""
import json, os, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCE_INDEX = "events2"


def load_env():
    env = {}
    with open(os.path.join(ROOT, ".env")) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    env.update({k: v for k, v in os.environ.items() if k.startswith("ES_")})
    return env


ENV = load_env()
INDEX = ENV.get("ES_INDEX", "eventapp")


def es(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(ENV["ES_URL"].rstrip("/") + path, data=data, method=method,
                                 headers={"Authorization": "ApiKey " + ENV["ES_API_KEY"],
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> HTTP {e.code}\n{describe_error(e.read().decode())}")


def describe_error(raw):
    """Compact cause chain (drops the echoed script source)."""
    try:
        err = json.loads(raw)["error"]
    except Exception:
        return raw[:4000]
    lines, depth = [], 0
    while isinstance(err, dict):
        lines.append("  " * depth + f"{err.get('type')}: {str(err.get('reason', ''))[:500]}")
        for k in ("script_stack", "position"):
            if k in err:
                lines.append("  " * depth + f"  {k}: {json.dumps(err[k], ensure_ascii=False)[:800]}")
        err, depth = err.get("caused_by"), depth + 1
    return "\n".join(lines)


def read(name):
    with open(os.path.join(HERE, name)) as f:
        return f.read()


def final_pipeline():
    return {
        "description": "eventapp: unflatten slash keys, derive geoPoint, defaults. Runs on every write (index.final_pipeline).",
        "processors": [
            {"script": {"lang": "painless", "source": read("pipelines/eventapp-final.painless"), "tag": "normalize"}},
            {"set": {"field": "ingestedAt", "value": "{{{_ingest.timestamp}}}"}},
        ],
        "on_failure": [{"set": {"field": "ingestError", "value": "{{{_ingest.on_failure_message}}}"}}],
    }


def synthetic_pipeline():
    return {
        "description": "eventapp: rebuild shuffled events2 docs into coherent realistic events (synthetic:true). Reindex only.",
        "processors": [
            {"script": {"lang": "painless", "source": read("pipelines/eventapp-synthetic.painless"),
                        "params": json.loads(read("pipelines/synthetic-catalog.json")), "tag": "synthesize"}},
        ],
    }


def cmd_pipelines():
    print(es("PUT", "/_ingest/pipeline/eventapp-final", final_pipeline()))
    print(es("PUT", "/_ingest/pipeline/eventapp-synthetic", synthetic_pipeline()))


def cmd_index():
    print(es("PUT", f"/{INDEX}", json.loads(read("eventapp-index.json"))))


def cmd_simulate(n=3):
    hits = es("POST", f"/{SOURCE_INDEX}/_search", {"size": n, "sort": ["_doc"]})["hits"]["hits"]
    docs = [{"_index": INDEX, "_id": h["_id"], "_source": h["_source"]} for h in hits]
    # Chain both pipelines, the same as a real reindex (request pipeline, then final_pipeline).
    body = {"pipeline": {"processors": [
        {"pipeline": {"name": "eventapp-synthetic"}},
        {"pipeline": {"name": "eventapp-final"}},
    ]}, "docs": docs}
    out = es("POST", "/_ingest/pipeline/_simulate", body)
    for d in out["docs"]:
        if "error" in d:
            print(json.dumps(d["error"], indent=1)[:4000])
        else:
            print(json.dumps(d["doc"]["_source"], indent=1, ensure_ascii=False))
        print("-" * 80)


def cmd_reindex():
    out = es("POST", "/_reindex?refresh=true&wait_for_completion=true",
             {"source": {"index": SOURCE_INDEX}, "dest": {"index": INDEX, "pipeline": "eventapp-synthetic"}})
    print({k: out.get(k) for k in ("took", "total", "created", "updated", "failures")})


def cmd_purge():
    print(es("POST", f"/{INDEX}/_delete_by_query?refresh=true", {"query": {"term": {"synthetic": True}}}))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "pipelines": cmd_pipelines()
    elif cmd == "index": cmd_index()
    elif cmd == "simulate": cmd_simulate(int(sys.argv[2]) if len(sys.argv) > 2 else 3)
    elif cmd == "reindex": cmd_reindex()
    elif cmd == "purge-synthetic": cmd_purge()
    elif cmd == "all": cmd_pipelines(); cmd_index(); cmd_reindex()
    else: print(__doc__)
