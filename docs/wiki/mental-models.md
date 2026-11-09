<!-- [LAYER: UI] -->
# Core Mental Models of CINDER

Four mental models that explain the purpose, design, and behavior of CINDER.

---

## 1. The Pod as a Digital Hearth

A conference hall with 3,000 attendees is overwhelming. It is difficult to start an intimate conversation when a sea of strangers is walking past in every direction.

Historically, humans gathered around small campfires or hearths. The hearth provided warmth, shared orientation, and a bounded circle where every voice could be heard. 

**The Pod is the digital hearth of the conference.** It shrinks the conference from 3,000 people to 5 peers. It gives attendees a home base to return to between keynotes, a safe space to ask questions, and a dedicated cohort to eat lunch with.

---

## 2. The Swipe as a Frictionless Spark

Starting a conversation cold in a crowded hallway carries social risk: fear of rejection, awkward exits, or finding out after ten minutes that you share no common interests.

The **Swipe** acts as a bilateral spark. Because swipes are private until mutual interest is established, attendees can express enthusiasm with zero social anxiety. When a mutual match occurs, both parties know in advance that their interest is reciprocated, dramatically lowering the activation energy required to say hello.

---

## 3. The Facilitator as a Dinner Party Host

A terrible host dominates the dinner table, monologuing endlessly and talking over the guests. An absent host leaves guests sitting in awkward silence, unsure of what they have in common.

A great host acts as a **catalyst**:
- *"Alex, Maya was just telling me about her work profiling eBPF latency in Kubernetes controllers—didn't you run into that exact issue on your cluster last month?"*
- She introduces the guests, points out their complementary strengths, asks an evocative question to spark the dialogue, and then quietly steps back to pour wine while the guests talk passionately with one another.

This is the exact role of the CINDER AI Facilitator.

---

## 4. The Principle of Geographic Alignment

In software architecture, where code lives reveals what it is. A file placed in `src/domain/` communicates immediately to any developer or AI coding agent that it contains pure business rules and must never perform disk or network I/O. A file placed in `src/infrastructure/` is explicitly an external adapter.

By enforcing Geographic Alignment, CINDER prevents architectural decay from creeping in unannounced.

