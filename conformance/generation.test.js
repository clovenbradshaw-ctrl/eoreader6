// Generation: finishing the sentence without confabulating.
//
// Two families here, and they are the two deaths from SEED.md wearing
// generative clothes.
//
// CONFABULATION is the obvious one: a generator that speaks without witness.
// The tests below that matter most are the ones where the apparatus refuses to
// say something — a belief with no ground returning a gap instead of a word, a
// continuation carried by a received prior barred from testifying about the
// material it was not read from.
//
// The subtler family is about MEASUREMENT INTEGRITY, and it is where a
// generative system actually rots. Fluent output is enormously persuasive, so
// every escape hatch that lets an emitter look good without being good has to
// be nailed shut and kept nailed. "the reserve loophole" below is one this
// repo actually fell into and had to be dug out of.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isGap } from "../nul/index.js";
import { createLayer, createBelief, UNSEEN } from "../packages/engine/generation/belief.js";
import { emitSequence, admissibleAsTestimony } from "../packages/engine/generation/emit.js";
import { createGenerationTask, walkForwardSequence, walkSentenceCompletions } from "../packages/engine/generation/tasks.js";
import { defaultGenerationBaselines, markov, copyPrevious } from "../packages/engine/generation/baselines.js";
import { decayedBelief, priorAugmented, regimeBelief } from "../packages/engine/generation/candidates.js";
import { runGeneration } from "../packages/engine/generation/run.js";
import { commitPrediction, revealAndScore } from "../packages/engine/prediction/commitments.js";
import { sequenceLogLoss, score } from "../packages/engine/prediction/scoring.js";

const TOKENS = "the cat sat on the mat the cat sat on the floor the dog sat on the mat".split(" ");
const readLayer = (over = TOKENS, opts = {}) =>
  createLayer({ id: "read", tier: "read", order: 2, gamma: 1, alpha: 1, ...opts }).train(over);
const beliefOver = (over = TOKENS) => createBelief({ layers: [readLayer(over)] });

// ── A prior is a gift and must name its giver (SEED.md #1) ──────────────────

test("a received layer cannot be built without naming its giver", () => {
  assert.throws(
    () => createLayer({ id: "gift", tier: "received", order: 1, gamma: 1, alpha: 1 }),
    /must name its giver/,
  );
  assert.doesNotThrow(() =>
    createLayer({ id: "gift", tier: "received", giver: "Bram Stoker, Dracula", order: 1, gamma: 1, alpha: 1 }),
  );
});

test("a belief has exactly one read layer — not zero, not two", () => {
  const gift = createLayer({ id: "g", tier: "received", giver: "someone", order: 1, gamma: 1, alpha: 1 });
  assert.throws(() => createBelief({ layers: [gift] }), /exactly one read layer/);
  assert.throws(() => createBelief({ layers: [readLayer(), readLayer()] }), /exactly one read layer/);
});

test("order, gamma and alpha are declared, never defaulted", () => {
  assert.throws(() => createLayer({ id: "r", tier: "read", gamma: 1, alpha: 1 }), /order/);
  assert.throws(() => createLayer({ id: "r", tier: "read", order: 1, alpha: 1 }), /gamma/);
  assert.throws(() => createLayer({ id: "r", tier: "read", order: 1, gamma: 1 }), /alpha/);
});

test("a task declares its priors and every one of them names a giver", () => {
  const base = {
    target_type: "token-sequence",
    horizon: 4,
    conditioning: "free-running",
    selection: "mode",
    scoring_rule: "sequence-log-loss",
    baseline_ids: ["baseline:markov-2"],
    population: "test",
  };
  assert.throws(() => createGenerationTask(base), /prior_ids/);
  assert.throws(
    () => createGenerationTask({ ...base, prior_ids: [{ id: "dracula" }] }),
    /must name its giver/,
  );
  // An empty list is a claim and is accepted; a missing one is not.
  assert.doesNotThrow(() => createGenerationTask({ ...base, prior_ids: [] }));
});

// ── Borrowed content is fuel for a guess, never evidence about the material ──

test("imagining is unguarded: a borrowed continuation is emitted freely and penalised nowhere", () => {
  const gift = createLayer({ id: "dracula", tier: "received", giver: "Bram Stoker", order: 2, gamma: 1, alpha: 1 });
  gift.train("the cat vanished into the night the cat vanished into the fog".split(" "));
  const belief = createBelief({ layers: [readLayer(["the", "cat"]), gift] });

  const borrowed = emitSequence({ belief, context: ["the", "cat"], horizon: 2, conditioning: "free-running", selection: "mode" });
  assert.ok(!isGap(borrowed), "a guess sourced from another book is still a guess, and is emitted");
  assert.equal(borrowed.register, "imagined");
  assert.deepEqual([...borrowed.emitted], ["vanished", "into"], "it says the borrowed thing, out loud");
  // And it is scored by the same rule as anything else, with no surcharge.
  const scored = sequenceLogLoss(borrowed, ["vanished", "into"]);
  assert.equal(scored.proper, true);
  assert.ok(Number.isFinite(scored.loss));
});

test("a belief with no ground at all still refuses — imagining is not confabulating", () => {
  // The distinction the whole refusal policy turns on: borrowed ground emits,
  // NO ground does not. A generator that produces text from nothing is not
  // imagining, it is SEED.md's first death.
  const empty = createBelief({ layers: [createLayer({ id: "read", tier: "read", order: 2, gamma: 1, alpha: 1 })] });
  assert.ok(isGap(emitSequence({ belief: empty, context: [], horizon: 2, conditioning: "free-running", selection: "mode" })));

  const gift = createLayer({ id: "g", tier: "received", giver: "somebody", order: 2, gamma: 1, alpha: 1 });
  gift.train(["a", "b", "c"]);
  const borrowedOnly = createBelief({ layers: [createLayer({ id: "read", tier: "read", order: 2, gamma: 1, alpha: 1 }), gift] });
  assert.ok(!isGap(emitSequence({ belief: borrowedOnly, context: [], horizon: 2, conditioning: "free-running", selection: "mode" })));
});

test("the crossing is guarded: an imagining asserted about the material is a category error", () => {
  const gift = createLayer({ id: "dracula", tier: "received", giver: "Bram Stoker", order: 2, gamma: 1, alpha: 1 });
  gift.train("the cat vanished into the night the cat vanished into the fog".split(" "));
  // A read layer that has met almost nothing, so the gift is audible.
  const belief = createBelief({ layers: [readLayer(["the", "cat"]), gift] });

  const borrowed = emitSequence({ belief, context: ["the", "cat"], horizon: 2, conditioning: "free-running", selection: "mode" });
  assert.equal(borrowed.grounded, false, "a form the read layer never supplied is not grounded");
  assert.ok(borrowed.received_fraction > 0, "and the borrowed mass is reported");
  const refusal = admissibleAsTestimony(borrowed);
  assert.ok(isGap(refusal));
  assert.equal(refusal.gap, "unreceived_origin");

  // The same apparatus, read-only, testifies fine.
  const own = emitSequence({ belief: beliefOver(), context: ["the", "cat"], horizon: 2, conditioning: "free-running", selection: "mode" });
  assert.equal(own.grounded, true);
  assert.equal(admissibleAsTestimony(own), null);
});

test("the gift fills the silence and does not overwrite the ground", () => {
  const gift = createLayer({ id: "gift", tier: "received", giver: "elsewhere", order: 2, gamma: 1, alpha: 1 });
  gift.train("the cat vanished the cat vanished the cat vanished".split(" "));

  // Barely any read evidence for this context: the gift is most of the answer.
  const thin = createBelief({ layers: [readLayer(["the", "cat"]), gift] });
  const thinD = thin.distribution(["the", "cat"]);

  // Plenty of read evidence for the same context: the gift is nearly inaudible.
  const thick = createBelief({ layers: [readLayer([...TOKENS, ...TOKENS, ...TOKENS]), gift] });
  const thickD = thick.distribution(["the", "cat"]);

  assert.ok(thinD.received_mass > thickD.received_mass, "the gift's share falls as the reader accumulates its own");
  assert.ok(thickD.lambda_read > thinD.lambda_read);
  // And a large gift cannot drown a small read layer by being large.
  const huge = createLayer({ id: "huge", tier: "received", giver: "elsewhere", order: 2, gamma: 1, alpha: 1 });
  huge.train("the cat vanished ".repeat(400).trim().split(" "));
  const withHuge = createBelief({ layers: [readLayer([...TOKENS, ...TOKENS, ...TOKENS]), huge] });
  assert.ok(
    Math.abs(withHuge.distribution(["the", "cat"]).lambda_read - thickD.lambda_read) < 1e-12,
    "lambda depends on the READ layer's evidence only, never on the size of the gift",
  );
});

test("a received layer never observes the material under test", () => {
  const priors = [{ id: "dracula", giver: "Bram Stoker", tokens: ["the", "cat", "vanished"] }];
  const emitter = priorAugmented({ order: 2, alpha: 1, priors });
  const before = emitter.belief.receivedLayers[0].observations;
  emitter.prime(TOKENS);
  emitter.observe(TOKENS);
  assert.equal(emitter.belief.receivedLayers[0].observations, before, "the gift does not grow by reading this text");
  assert.deepEqual(emitter.belief.givers, [{ id: "dracula", giver: "Bram Stoker" }]);
});

// ── Refusing to speak is a result ───────────────────────────────────────────

test("a belief with no ground returns a gap instead of inventing a word", () => {
  const empty = createBelief({ layers: [createLayer({ id: "read", tier: "read", order: 2, gamma: 1, alpha: 1 })] });
  const out = emitSequence({ belief: empty, context: [], horizon: 3, conditioning: "free-running", selection: "mode" });
  assert.ok(isGap(out), "no material read, nothing to say");
});

test("the unseen reserve is named, not renormalised away", () => {
  const d = beliefOver().distribution(["the", "cat"]);
  assert.ok(d.probs[UNSEEN] > 0, "there is always mass for a form never met");
  const total = Object.values(d.probs).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `the distribution sums to 1, got ${total}`);
});

// ── Measurement integrity ───────────────────────────────────────────────────

test("MEASURED DEFECT, now pinned: the reserve is not a bucket for 'any word but my guess'", () => {
  // This is the shape baseline:copy-previous had on its first run. It put a
  // sliver on its guess and everything else on the reserve, so every target it
  // MISSED collected nearly the whole reserve and cost it almost nothing. It
  // beat every real belief in the repo by declining to say anything.
  const cheat = {
    kind: "sequence",
    unseen_label: UNSEEN,
    // note: covers_vocabulary NOT asserted
    steps: [{ kind: "categorical", probs: { cat: 0.001, [UNSEEN]: 0.999 } }],
  };
  const cheated = sequenceLogLoss(cheat, ["mat"]);
  const honest = sequenceLogLoss({ ...cheat, covers_vocabulary: true }, ["mat"]);
  assert.ok(
    cheated.loss > honest.loss,
    "without the assertion, a missing target takes the floor instead of collecting the reserve",
  );
  assert.ok(cheated.loss > 100, "and the floor is genuinely punishing");
  assert.equal(cheated.unplaced, 1);
});

test("a belief places mass on every form it has met — so its reserve claim is honest", () => {
  const belief = beliefOver();
  const d = belief.distribution(["the", "cat"]);
  assert.equal(d.covers_vocabulary, true);
  for (const form of new Set(TOKENS))
    assert.ok(d.probs[form] > 0, `met "${form}" but placed no mass on it — the reserve claim would be a lie`);
});

test("horizon mismatch is refused, never truncated", () => {
  const emission = emitSequence({ belief: beliefOver(), context: ["the"], horizon: 3, conditioning: "free-running", selection: "mode" });
  assert.throws(() => sequenceLogLoss(emission, ["cat", "sat"]), /horizon mismatch/);
});

test("free-running and teacher-forced are different measurements, and neither is a default", () => {
  assert.throws(
    () => emitSequence({ belief: beliefOver(), context: ["the"], horizon: 2 }),
    /never defaulted/,
  );
  assert.throws(
    () =>
      createGenerationTask({
        target_type: "token-sequence",
        horizon: 2,
        scoring_rule: "sequence-log-loss",
        baseline_ids: ["b"],
        prior_ids: [],
        population: "t",
      }),
    /conditioning/,
  );

  // And they genuinely differ. The difference lives in the COMMITTED
  // DISTRIBUTIONS, not necessarily in the emitted forms — on this material both
  // runs happen to say the same three words, and a test that compared only the
  // emitted text would have called the two identical and passed forever. From
  // step 2 on, the free-running run is conditioning on "the cat" and the
  // teacher-forced run on "the dog", and those are not the same belief.
  const belief = beliefOver();
  const target = ["dog", "sat", "on"];
  const free = emitSequence({ belief, context: ["the"], horizon: 3, conditioning: "free-running", selection: "mode", target });
  const forced = emitSequence({ belief, context: ["the"], horizon: 3, conditioning: "teacher-forced", selection: "mode", target });
  assert.deepEqual(free.steps[0].probs, forced.steps[0].probs, "step 1 has the same context either way");
  assert.notDeepEqual(free.steps[1].probs, forced.steps[1].probs, "step 2 does not");
  assert.equal(free.conditioning, "free-running");
  assert.equal(forced.conditioning, "teacher-forced");
});

test("stride is declared — overlapping draws are not independent", () => {
  assert.throws(() => [...walkForwardSequence(TOKENS, { warmup: 2, horizon: 2 })], /stride is declared/);
});

test("a candidate that has become its own control is refused rather than reported as a null result", () => {
  assert.throws(() => decayedBelief({ order: 2, alpha: 1, gamma: 1 }), /the contrast is empty/);
  assert.throws(() => priorAugmented({ order: 2, alpha: 1, priors: [] }), /it IS the baseline/);
});

// ── The seal, on a continuation ─────────────────────────────────────────────

test("the whole continuation is sealed before any of it is revealed", () => {
  const draws = [...walkForwardSequence(TOKENS, { warmup: 4, horizon: 3, stride: 3 })];
  const first = draws[0];
  assert.equal(
    first.reveal_not_before_step,
    first.committed_at_step + 3,
    "not +1 — a free-running emitter must not see its own first target before committing its second",
  );

  const emission = emitSequence({
    belief: beliefOver(),
    context: first.history,
    horizon: 3,
    conditioning: "free-running",
    selection: "mode",
  });
  const commitment = commitPrediction({
    task_id: "task:test",
    candidate_id: "candidate:test",
    candidate_version_hash: "v1",
    input_snapshot_hash: "snap",
    predictive_output: emission,
    committed_at_step: first.committed_at_step,
    reveal_not_before_step: first.reveal_not_before_step,
  });

  assert.throws(
    () =>
      revealAndScore({
        commitment,
        observed: [...first.target],
        revealed_at_step: first.committed_at_step + 1,
        scoring_rule: "sequence-log-loss",
      }),
    /leakage refused/,
  );

  const ok = revealAndScore({
    commitment,
    observed: [...first.target],
    revealed_at_step: first.reveal_not_before_step,
    scoring_rule: "sequence-log-loss",
  });
  assert.ok(Number.isFinite(ok.loss));
  assert.equal(ok.proper, true);
});

test("a committed continuation cannot be edited after it is sealed", () => {
  const emission = emitSequence({ belief: beliefOver(), context: TOKENS, horizon: 2, conditioning: "free-running", selection: "mode" });
  const commitment = commitPrediction({
    task_id: "task:test",
    candidate_id: "candidate:test",
    candidate_version_hash: "v1",
    input_snapshot_hash: "snap",
    predictive_output: emission,
    committed_at_step: 5,
    reveal_not_before_step: 7,
  });
  const tampered = { ...commitment, predictive_output: { ...emission, steps: [{ kind: "categorical", probs: { mat: 1 } }] } };
  assert.throws(
    () => revealAndScore({ commitment: tampered, observed: ["mat", "the"], revealed_at_step: 7, scoring_rule: "sequence-log-loss" }),
    /altered after it was sealed/,
  );
});

test("the sequence kind reaches the shared scoring table", () => {
  const emission = emitSequence({ belief: beliefOver(), context: TOKENS, horizon: 2, conditioning: "free-running", selection: "mode" });
  const proper = score(emission, ["the", "cat"], { rule: "sequence-log-loss" });
  assert.equal(proper.proper, true);
  // The readable rules exist and are honestly flagged improper.
  assert.equal(score(emission, ["the", "cat"], { rule: "prefix-agreement" }).proper, false);
  assert.equal(score(emission, ["the", "cat"], { rule: "exact-match" }).proper, false);
  // And a proper rule for a different kind reports that it does not apply,
  // rather than laundering a sequence into a number.
  const notApplicable = score(emission, ["the", "cat"], { rule: "crps" });
  assert.equal(notApplicable.loss, null);
  assert.equal(notApplicable.proper, false);
});

// ── Finishing sentences, and the whole loop ─────────────────────────────────

test("sentence completion withholds the tail and never pads a target no one wrote", () => {
  // Sentence 2 is exactly as long as the prefix, so there is nothing to
  // withhold and it is skipped rather than padded. Sentence 3 has one form
  // past the prefix and yields a truncated target of exactly that one form.
  const sentences = [["a", "b", "c", "d"], ["e", "f"], ["g", "h", "i"], ["j", "k", "l", "m", "n"]];
  const draws = [...walkSentenceCompletions(sentences, { warmupSentences: 1, prefix: 2, horizon: 3 })];
  assert.equal(draws.length, 2, "the length-2 sentence yields no draw at prefix 2");
  assert.deepEqual([...draws[0].target], ["i"], "a sentence with one form past the prefix yields one target");
  assert.equal(draws[0].truncated, true);
  assert.deepEqual([...draws[1].target], ["l", "m", "n"]);
  assert.equal(draws[1].reveal_not_before_step, draws[1].committed_at_step + 3);
});

test("the prequential loop runs, and every candidate clears the uniform floor", () => {
  const stream = [];
  for (let i = 0; i < 40; i++) stream.push(...TOKENS);
  const task = createGenerationTask({
    target_type: "token-sequence",
    horizon: 3,
    conditioning: "free-running",
    selection: "mode",
    scoring_rule: "sequence-log-loss",
    baseline_ids: ["baseline:uniform-vocab", "baseline:unigram", "baseline:markov-2", "baseline:copy-previous"],
    prior_ids: [],
    population: "conformance",
  });
  const out = runGeneration({
    tokens: stream,
    draws: walkForwardSequence(stream, { warmup: 60, horizon: 3, stride: 3 }),
    candidates: [
      decayedBelief({ order: 2, alpha: 1, gamma: 0.999 }),
      regimeBelief({ order: 2, alpha: 1, window: 6, draws: 64, tolerance: 2 }),
    ],
    baselines: defaultGenerationBaselines({ order: 2, alpha: 1, horizon: 3 }),
    task,
    primeUpTo: 60,
    population: "conformance",
    source_versions: ["conformance@1"],
  });

  assert.ok(out.scored > 50, `expected a real number of scored draws, got ${out.scored}`);
  for (const id of ["candidate:decayed-belief-g0.999", "candidate:regime-belief"]) {
    const record = out.records.get(id);
    assert.ok(record.competency_gain["baseline:uniform-vocab"] > 0, `${id} failed to beat the uniform floor`);
    assert.equal(record.schema, "CompetencyRecord@1");
    assert.ok(record.scope.evaluation_protocol.includes("free-running"));
  }
  // A read-only run borrows nothing, and every emission may testify.
  for (const id of ["candidate:decayed-belief-g0.999", "baseline:markov-2"]) {
    assert.equal(out.testimony[id].borrowed, 0);
    assert.equal(out.testimony[id].mean_received_fraction, 0);
  }
});

test("the competency scope is required — a gain with no scope is unfalsifiable, not weak", () => {
  const stream = [];
  for (let i = 0; i < 20; i++) stream.push(...TOKENS);
  const task = createGenerationTask({
    target_type: "token-sequence",
    horizon: 2,
    conditioning: "free-running",
    selection: "mode",
    scoring_rule: "sequence-log-loss",
    baseline_ids: ["baseline:markov-2"],
    prior_ids: [],
    population: "conformance",
  });
  assert.throws(
    () =>
      runGeneration({
        tokens: stream,
        draws: walkForwardSequence(stream, { warmup: 40, horizon: 2, stride: 2 }),
        candidates: [decayedBelief({ order: 2, alpha: 1, gamma: 0.99 })],
        baselines: [markov({ order: 2, alpha: 1 })],
        task,
        primeUpTo: 40,
        population: "conformance",
        // source_versions deliberately omitted
      }),
    /source_versions/,
  );
});
