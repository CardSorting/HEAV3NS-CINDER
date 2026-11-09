<!-- [LAYER: UI] -->
# CINDER Glossary

Definitions of core domain concepts, algorithms, architectural terms, and metrics used throughout CINDER.

---

## Domain Concepts

- **Attendee:** A registered conference participant. Profiles capture technical interests, areas of expertise, active projects, technical challenges, and collaboration desires.
- **Pod:** A curated, high-trust cohort of 4–6 conference attendees brought together based on shared problems, complementary skills, and mutual matches.
- **Swipe:** An intentional gesture expressing interest (`LIKE`) or dismissal (`PASS`) toward another attendee's discovery profile card.
- **Mutual Match:** A confirmed connection created when two attendees both express interest (`LIKE`) in each other. Mutual matches serve as high-affinity anchor bonds during Pod composition.
- **AI Facilitator:** An autonomous agent assigned to a Pod that introduces members, provides conversation prompts, announces upcoming sessions, and validates physical meetups.
- **Meetup Intent:** A message within a Pod channel proposing a physical meeting location and time (e.g., *"Let's meet at the cafe at 12:30"*).
- **Pinned Header:** Persistent metadata displayed at the top of a Pod channel containing confirmed meetup locations, times, and key session announcements.

---

## Search & Machine Learning Concepts

- **Dense Vector Embedding:** A 32-dimensional normalized floating-point array representing the semantic meaning of an attendee's profile.
- **Cosine Similarity:** The dot product of two normalized unit vectors measuring angular orientation in semantic space:
  $$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
- **BM25 (Best Matching 25):** A probabilistic ranking function used in information retrieval to score documents based on keyword frequencies and inverse document frequencies.
- **Hybrid Retrieval:** The combination of exact lexical keyword scoring (BM25) and dense vector semantic distance (kNN) to overcome the limitations of either approach alone.
- **Reciprocal Rank Fusion (RRF):** An algorithm that merges ranked lists from different retrieval methods into a unified score:
  $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
  where $k=60$ is the standard smoothing constant.
- **Centroid:** The geometric center point of multiple normalized attendee vectors in 32-dimensional embedding space:
  $$\mathbf{c} = \frac{1}{N} \sum_{i=1}^N \mathbf{v}_i$$

---

## Architectural & Governance Terms

- **Joyzoning:** The architectural doctrine of separating source files into five sovereign zones (`DOMAIN`, `CORE`, `INFRASTRUCTURE`, `PLUMBING`, `UI`) with verified directional dependency flows.
- **Geographic Alignment:** The principle that a file's physical directory location on disk must match its architectural zone.
- **Composition Root:** The single location where dependency injection occurs and the application graph is wired together (`src/core/CinderApp.mjs`).
- **Tarjan Articulation Bridge:** A critical node in a dependency graph whose removal would partition connected components into disconnected subgraphs.
- **Structural Entropy ($E_S$):** A quantitative measurement of coupling, complexity, and hierarchy disorder across a software codebase.

