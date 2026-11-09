/** [LAYER: INFRASTRUCTURE] */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { ElasticsearchClient } from "../src/infrastructure/ElasticsearchClient.mjs";
import { generateDenseEmbedding } from "../src/plumbing/textEmbedder.mjs";

describe("ElasticsearchClient Adapter", () => {
  let esClient;

  beforeEach(() => {
    esClient = new ElasticsearchClient();
  });

  it("ensures index and reports cluster status", async () => {
    const res = await esClient.ensureIndex();
    assert.strictEqual(res.acknowledged, true);
    assert.strictEqual(res.index, "cinder_attendees");

    const status = await esClient.getStatus();
    assert.strictEqual(status.status, "green");
    assert.strictEqual(status.clusterName, "cinder-es-cluster");
  });

  it("indexes attendee and executes hybrid search", async () => {
    const v1 = generateDenseEmbedding("kubernetes autonomous platform", ["k8s"]);
    const attendeeDoc = {
      id: "att_alex",
      name: "Alex Chen",
      title: "Senior Platform Engineer",
      interests: ["Kubernetes", "Platform"],
      expertise: ["Go"],
      projects: "Self healing cluster controller",
      embedding: v1
    };

    const indexRes = await esClient.indexAttendee(attendeeDoc);
    assert.strictEqual(indexRes.result, "created");
    assert.strictEqual(indexRes.id, "att_alex");

    const searchRes = await esClient.hybridSearch({
      queryText: "kubernetes cluster healing",
      queryVector: v1,
      limit: 5
    });

    assert.strictEqual(searchRes.totalHits, 1);
    assert.strictEqual(searchRes.hits[0].id, "att_alex");
    assert.ok(searchRes.hits[0].score > 0);
    assert.ok(searchRes.tookMs >= 0);
    assert.ok(searchRes.querySpec.knn);
    assert.ok(searchRes.querySpec.rank.rrf);
  });
});
