#!/usr/bin/env python3
# [LAYER: INFRASTRUCTURE]
"""Smoke-test the CINDER indices with the queries the app will run. Doubles as a query reference.

  python3 elasticsearch/cinder/verify.py [eventId]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from setup import es  # noqa: E402

EMBED_MODEL = ".jina-embeddings-v5-text-small"


def search(index, body):
    return es("POST", f"/{index}/_search", body)


def hits(res):
    return [h["_source"] for h in res["hits"]["hits"]]


def main():
    # 1) Counts
    for idx in ["cinder-people", "cinder-registrations", "cinder-sessions", "cinder-spaces", "cinder-announcements",
                "cinder-prompts", "cinder-pods", "cinder-interactions", "cinder-messages"]:
        print(f"{idx:24} {es('GET', f'/{idx}/_count')['count']:>7}")
    missing = es("POST", "/cinder-registrations/_count", {"query": {"bool": {"must_not": {"exists": {"field": "embedding"}}}}})["count"]
    print("registrations without embedding:", missing)

    # 2) Event picker: CINDER-enabled events, upcoming first
    picker = search("eventapp", {
        "size": 5, "_source": ["@id", "name", "category", "startDate", "location.name", "cinder"],
        "query": {"bool": {"filter": [{"term": {"cinder.enabled": True}}, {"range": {"startDate": {"gte": "now"}}}]}},
        "sort": [{"startDate": "asc"}]})
    print("\nEVENT PICKER (next 5 of", picker["hits"]["total"]["value"], "upcoming):")
    for e in hits(picker):
        print(f"  {e['startDate'][:10]} {e['category']:<10} {e['name'][:55]:<55} regs={e['cinder']['registrations']}")
    event_id = sys.argv[1] if len(sys.argv) > 1 else next(e["@id"] for e in hits(picker) if e["category"] == "conference")
    print("\nusing event:", event_id)
    f_event = {"term": {"eventId": event_id}}

    # 3) Discovery for one attendee: hybrid = BM25 on profile text + kNN on the attendee's STORED vector (doc-to-doc),
    #    fused with RRF, restricted to the same event, excluding self.
    me = hits(search("cinder-registrations", {"size": 1, "query": {"bool": {"filter": [f_event, {"term": {"role": "attendee"}}]}},
                                               # dense_vector fields are left out of _source by default in ES 9.x;
                                               # ask for them to reuse the stored vector as the kNN query.
                                               "_source": {"excludes": ["searchText"], "exclude_vectors": False}}))[0]
    print(f"\nDISCOVERY for {me['name']} — {me['title']} @ {me['company']} [{me['discipline']}]")
    print("  looking_for:", me["looking_for"])
    not_me = {"bool": {"filter": [f_event], "must_not": [{"term": {"id": me["id"]}}]}}
    disc = search("cinder-registrations", {
        "size": 5, "_source": ["name", "title", "company", "discipline", "interests"],
        "retriever": {"rrf": {"retrievers": [
            {"standard": {"query": {"bool": {**not_me["bool"], "should": [{"multi_match": {
                "query": " ".join(me["interests"] + me["topics"]) + " " + me["looking_for"],
                "fields": ["interests^3", "expertise^2", "projects", "challenges", "looking_for", "bio", "topics"]}}]}}}},
            {"knn": {"field": "embedding", "query_vector": me["embedding"], "k": 20, "num_candidates": 100, "filter": not_me}},
        ], "rank_window_size": 50, "rank_constant": 60}}})
    for h in hits(disc):
        print(f"  → {h['name']:<22} {h['title'][:32]:<32} [{h['discipline']}] {', '.join(h['interests'][:3])}")

    # 4) Free-text people search ("search" input_type on the query side via query_vector_builder)
    q = "someone who has run Kubernetes in production and cares about observability"
    sem = search("cinder-registrations", {"size": 3, "_source": ["name", "title", "discipline"],
                                           "knn": {"field": "embedding", "k": 3, "num_candidates": 100, "filter": f_event,
                                                   "query_vector_builder": {"text_embedding": {"model_id": EMBED_MODEL, "model_text": q}}}})
    print(f"\nSEMANTIC PEOPLE SEARCH: \"{q}\"")
    for h in hits(sem):
        print(f"  → {h['name']:<22} {h['title']} [{h['discipline']}]")

    # 5) Relevant talks for this attendee (doc-to-doc again), excluding breaks/logistics
    talks = search("cinder-sessions", {"size": 3, "_source": ["title", "startDate", "roomName", "speakerNames"],
                                        "knn": {"field": "embedding", "query_vector": me["embedding"], "k": 3, "num_candidates": 50,
                                                "filter": {"bool": {"filter": [f_event, {"terms": {"sessionType": ["talk", "workshop", "keynote", "panel", "paper-session"]}}]}}}})
    print("\nRELEVANT TALKS:")
    for h in hits(talks):
        print(f"  → {h['startDate'][5:16]} {h['roomName']:<16} {h['title'][:60]}  ({', '.join(h['speakerNames'])})")

    # 6) Agenda: next break/lunch slot (meetup confirmation)
    lunch = hits(search("cinder-sessions", {"size": 1, "query": {"bool": {"filter": [f_event, {"term": {"sessionType": "lunch"}}]}},
                                             "sort": [{"startDate": "asc"}], "_source": ["title", "startDate", "endDate", "roomName"]}))
    print("\nLUNCH SLOT:", lunch[0] if lunch else None)

    # 7) Meetup intent: resolve "let's meet on the patio" to a meetup-friendly space at this event's venue
    ev = es("GET", f"/eventapp/_doc/{event_id}")["_source"]
    venue_id = next((l["@id"] for l in ev.get("location", []) if l.get("@type") != "VirtualLocation"), None)
    space_filter = {"term": {"venueId": venue_id}} if venue_id else {"term": {"eventId": event_id}}
    sp = hits(search("cinder-spaces", {"size": 1, "_source": ["name", "floor", "capacity", "tags"],
                                       "query": {"bool": {"filter": [space_filter, {"term": {"meetupFriendly": True}}],
                                                          "must": [{"match": {"aliases": "let's meet on the patio after lunch"}}]}}}))
    print("MEETUP SPACE for 'patio':", sp[0] if sp else None)

    # 8) Announcements, chronological
    anns = hits(search("cinder-announcements", {"size": 10, "query": {"bool": {"filter": [f_event]}}, "sort": [{"publishAt": "asc"}],
                                                 "_source": ["publishAt", "kind", "title"]}))
    print("\nANNOUNCEMENTS:")
    for a in anns:
        print(f"  {a['publishAt'][:16]} {a['kind']:<16} {a['title'][:70]}")

    # 9) A discussion prompt matched to this attendee's interests
    pr = hits(search("cinder-prompts", {"size": 1, "_source": ["text", "phase"],
                                         "knn": {"field": "embedding", "query_vector": me["embedding"], "k": 1, "num_candidates": 43,
                                                 "filter": {"term": {"phase": "deep-dive"}}}}))
    print("\nPROMPT:", pr[0]["text"] if pr else None)


if __name__ == "__main__":
    main()
