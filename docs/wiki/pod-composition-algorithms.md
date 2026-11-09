<!-- [LAYER: UI] -->
# Pod Composition Algorithms & Heuristics

A detailed review of the mathematics, social dynamics, and heuristic optimization rules used to compose CINDER Pods.

---

## 1. The Pod Sizing Invariant: 4 to 6 Members

Small-group sociological research indicates clear thresholds in group communication dynamics:
- **Pairs (2 attendees):** High social pressure. If one member is shy or leaves, the interaction collapses immediately.
- **Trios (3 attendees):** Frequent 2-vs-1 dynamic or odd-person-out isolation.
- **Cohorts of 4 to 6 attendees:** **Optimal.** Multiple side conversations can occur; introverts can listen comfortably without feeling scrutinized; enough diversity of skills exists for genuine problem-solving.
- **Groups of 8+ attendees:** Conversation fragments into separate sub-tables; dominant speakers monopolize discussion.

Therefore, CINDER enforces a target Pod size of **4 to 6 members**.

---

## 2. Multi-Objective Scoring Formulation

The Pod grouping engine (`src/core/PodOrchestrationController.mjs`) selects member assignments by optimizing three balanced forces:

### A. Mutual Match Affinity (Social Bonds)
Attendees who swiped `LIKE` on each other have expressed clear intent to collaborate.
$$\text{Score}_{\text{bonds}} = \sum_{(u, v) \in \mathcal{P} \times \mathcal{P}} \mathbb{I}(\text{MutualMatch}(u, v)) \cdot W_{\text{bond}}$$

### B. Centroid Cohesion (Shared Problem Space)
Members must share enough common context that they can understand each other's technical language. The group centroid $\mathbf{c}$ is the mean of all member unit vectors:
$$\mathbf{c} = \frac{1}{|\mathcal{P}|} \sum_{u \in \mathcal{P}} \mathbf{v}_u$$
Cohesion is the average cosine similarity of members to the centroid:
$$\text{Score}_{\text{cohesion}} = \frac{1}{|\mathcal{P}|} \sum_{u \in \mathcal{P}} (\mathbf{v}_u \cdot \mathbf{c})$$

### C. Discipline Diversity Bonus (Complementary Perspectives)
To prevent monoculture collapse (e.g. 5 identical DevOps engineers), the algorithm rewards candidate pairs whose technical roles span complementary disciplines:
$$\text{Score}_{\text{diversity}} = 1.0 - \text{PairwiseOverkill}(\mathcal{P})$$

---

## 3. Greedy Balanced Assignment Algorithm

1. **Seed Selection:** Identify pairs of attendees with confirmed mutual matches. Assign the highest-affinity pair as the seed for a new Pod.
2. **Candidate Retrieval:** Retrieve candidate attendees from Elasticsearch using the seed pair's centroid vector as the kNN target.
3. **Diversity-Filtered Candidate Selection:** For each remaining open seat (up to 5 or 6), evaluate candidate addition scores:
   $$\Delta \mathcal{J}(u) = \alpha \cdot \text{BondBonus}(u) + \beta \cdot (\mathbf{v}_u \cdot \mathbf{c}) + \gamma \cdot \text{DiversityScore}(u, \mathcal{P})$$
4. **Finalization:** Assign the top-scoring candidate, update the centroid $\mathbf{c}$, and repeat until the Pod reaches target size.
5. **Theme Assignment:** Synthesize the most frequent shared domain keywords into a human-readable title (e.g. *"Cloud-Native Autonomous Agents"*).

