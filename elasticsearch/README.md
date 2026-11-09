<!-- [LAYER: UI] -->
# Elasticsearch data tooling

Scripts, mappings and ingest pipelines that build and maintain CINDER's Elasticsearch data. This is
tooling, not app code: it sits outside `src/` and the app never imports it. Everything here talks to the
cluster in `.env` (copy [`.env.example`](../.env.example); `.env` is git-ignored).

Requires Python 3.9+ (standard library only) and Node 18+ for the compatibility check.

## Layout

| Path | What it does |
|---|---|
| [`setup.py`](setup.py) | `eventapp` index: mapping, pipelines, reindex from the raw `events2` upload |
| [`eventapp-index.json`](eventapp-index.json) | `eventapp` mapping (schema.org event shape, `geoPoint`, `name.suggest`) |
| [`pipelines/`](pipelines/) | `eventapp-final` (runs on every write: unflatten, geoPoint) and `eventapp-synthetic` (rebuilds shuffled `events2` docs into coherent events) |
| [`cinder/generate.py`](cinder/generate.py) | Builds CINDER's per-event data for every conference / academic / meetup / expo event |
| [`cinder/indices.json`](cinder/indices.json) | Strict mappings for all nine `cinder-*` indices |
| [`cinder/catalog.py`](cinder/catalog.py) | Vocabulary for generated people, talks, spaces and prompts (all invented) |
| [`cinder/verify.py`](cinder/verify.py) | Runs the app's queries against live data; also a query reference |
| [`cinder/compat_check.py`](cinder/compat_check.py) | Checks the current `src/` code still fits the indices (see below) |

## Commands

Run from the repository root.

```bash
python3 elasticsearch/setup.py pipelines|index|reindex|purge-synthetic   # eventapp
python3 elasticsearch/cinder/generate.py setup     # pipelines + any missing cinder-* indices (non-destructive)
python3 elasticsearch/cinder/generate.py build     # generate, embed, bulk-load (~15 min; deterministic)
python3 elasticsearch/cinder/generate.py reset     # delete synthetic:true docs from the reference indices
npm run seed:demo [-- --event <id>]                # the five scripted demo attendees (app check-in path; idempotent)
python3 elasticsearch/cinder/verify.py [eventId]   # smoke-test the app's queries
python3 elasticsearch/cinder/compat_check.py [eventId]   # run after pulling src/ changes
npm run eval:discovery [-- --event <id> --n 40 --quick]  # compare live discovery tunings (read-only)
```

## Indices

Everything is scoped by `eventId`, which is an `eventapp` `@id`. Selectable events are `eventapp` docs
with `cinder.enabled: true`.

| Index | Written by | Contents |
|---|---|---|
| `cinder-registrations` | generator + app check-in | One attendee per event, in the app's `Attendee` shape plus `eventId`, `role`, `embedding` |
| `cinder-people` | generator | Person profiles that persist across events |
| `cinder-sessions` | generator | Full agenda: talks, workshops, breaks, lunch, networking; rooms and speakers |
| `cinder-spaces` | generator | Rooms and meetup spots per venue, with `aliases` for meetup-intent matching |
| `cinder-announcements` | generator | Per-event updates; room changes and delays are also reflected in the sessions |
| `cinder-prompts` | generator | Discussion prompts by topic |
| `cinder-pods`, `cinder-interactions`, `cinder-messages` | app | Pods, swipes/matches, pod chat and 1:1 match messages (`channel`: `pod` / `direct`) |

`cinder-registrations`, `cinder-sessions` and `cinder-prompts` have default pipelines that build
`searchText` and embed it, so the app can write plain documents.

## Gotchas

These cost debugging time. The integration code needs to handle each one.

1. **Embedding model.** `.jina-embeddings-v5-text-small` (Elastic-hosted, 1024 dims, max 16 inputs per request).
2. **Document vs query embeddings differ.** Pipelines embed as `input_type: "ingest"`. Direct
   `_inference` calls for documents must pass the same, or vectors land in a different space (cosine ≈ 0.93).
   Free-text *searches* should use `query_vector_builder` (query side).
3. **Doc-to-doc matching uses the stored vector.** ES 9.x leaves `dense_vector` out of `_source`;
   fetch it with `"_source": {"exclude_vectors": false}`.
4. **Similarity ≠ complementarity.** kNN on a profile returns people *like* them (same discipline).
   Searching on `looking_for` text returns the complementary people CINDER promises; an equal-weight
   RRF with profile similarity drowns that out, so weight `looking_for` higher.
5. **Mappings are strict.** Unknown fields are rejected. The app's entities need the small adapter in
   `compat_check.py` (`to_*` functions): add `eventId`/`role`/`channel`, drop the app's 32-dim hashed
   `embedding`, store pod messages in `cinder-messages` rather than on the pod.
6. **Serverless differences.** `/_cluster/health` returns 410 (use `GET /`); every request needs
   `Authorization: ApiKey …`; index names must be lowercase.

## Compatibility with `src/`

`compat_check.py` runs CINDER's own scenario, indexes the attendees, pods, pod messages, 1:1 messages and
matches it produces into temporary copies of the strict mappings, and constructs domain `Session`
objects from Elasticsearch agenda data. Run it after pulling changes to `src/`; a non-zero exit means a
shape changed on one side.
