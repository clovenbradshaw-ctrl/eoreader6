# Results — the second clearing

Everything here is reproducible: `node scripts/two-clearings.mjs`,
`node scripts/binary-clearings.mjs`. Frankenstein is read from
`eoreader4.2/tests/fixtures/frankenstein.txt` (24 real chapter markers).

Spec throughout: `window 12, draws 200, reseeds 5, tolerance 3, hop 4`.

---

## The headline

A ground fails two ways, and both are `DEF · Atmosphere · Clearing`:

- **surfeit** — new material exceeds the ground's support (`exceeds_witness`
  above). Wired since turn 1.
- **moved** — the ground itself shifted under maintenance, further than
  continuing the same material would have shifted it (`pattern().moved`).
  Wired now.

Against Frankenstein's 24 chapter boundaries:

| clearing | recall | precision | uniform chance | shuffled-series | **rotated chapters** |
|---|---|---|---|---|---|
| surfeit only | 4/24 | 3/4 | 4.35 | z=— | p≈0.84 |
| **moved only** | **19/24** | **11/13** | 11.52 | z=5.17 | **p≈0.000** |
| both | 17/24 | 12/14 | 12.11 | z=3.16 | p≈0.34 |

(causal match window; the tight window gives moved-only 14/24, rotated p≈0.016.)

**moved is the first thing in this project to beat a rotation null on an
external reference.** surfeit alone is at chance, which is where turn 1 left it
(1/24 against a chance of 0.99). Combining the two is *worse* than moved alone —
surfeit's boundaries dilute rather than complement.

---

## Three nulls, and why only the third one counts

This is the part worth keeping even if every number above turns over.

1. **Uniform random boundaries** — the baseline turn 1 used. Too weak. Real
   chapters are roughly evenly spaced, and so is anything a tolerance counter
   emits; two roughly periodic sets of marks agree far more than two uniform
   ones. It scores 13 evenly spaced boundaries at 11.5/24 before the detector
   has done anything.

2. **Shuffle the series, run the whole mechanism again** — strong but blunt.
   Destroys the order, and with it the trend and the autocorrelation, so
   beating it does not say *which* property carried the signal.

3. **Rotate the chapters** — sharpest and cheapest. Changes neither the
   detector's output nor the chapters' spacing; breaks only whether they line
   up. Rotated chapters score a 13-boundary set at **15.1±1.5** — higher than
   the "chance" baseline the same set beats comfortably.

A run can clear (1) and (2) and still be nothing. `both` does exactly that:
z=3.16 against shuffled, p≈0.34 against rotation.

---

## What the null had to be corrected to

`pattern()`'s null was the ground's reseeding variation at **before's** extent,
while `after` was built over more material. Burstiness is a max over windows,
so its expectation rises with extent alone. The null measured seed noise; the
displacement measured seed noise plus growth; growth won.

Wired that way, the moved clearing produced:

- boundaries on **homogeneous noise** at 36, 64, 92, 120, 164, 192, 220, 248,
  276, 304, 332 — spacings 28, 28, 28, 44, 28, 28, 28, 28, 28, 28. A clock.
- **23/24** Frankenstein chapter recall … and **21–23/24** on the same series
  shuffled.

Every headline number looked like a breakthrough. The fix is a growth-matched
conditional null: continue `before`'s material by drawing from itself, up to
`after`'s extent, then reseed. Same regime, carried on — so what the null shows
is what growth alone contributes. When the extents match it reduces to the
reseeding null unchanged.

The same check caught a second live bug: `loops/time.js` passed the *later*
material to `pattern()`, making every null draw a same-material sibling of
`after`. `moved` there was a coin landing true about 1/(reseeds+1) of the time
regardless of the document. `nul` now refuses that call
(`incommensurate_extent`) rather than answering it.

---

## Pure binary: the omnimodal claim, and it does not hold yet

Frankenstein read as **bytes** — no tokenizer, no frequency table, no
surprisal, no notion of a word. Same `runTurn`, same declared numbers, same
nulls; only the reduction changed.

| reduction | moved-only recall | precision | rotated chapters |
|---|---|---|---|
| mean byte value | 8/24 | 6/7 | p≈0.48 |
| block entropy (256 symbols) | 12/24 | 10/12 | p≈0.64 |
| distinct bytes per block | 16/24 | 15/17 | p≈0.65 |

Nothing clears the rotation null. Note `blockVariety`: **16/24 recall at 15/17
precision, and worth exactly nothing** — rotated chapters score the same set at
16.3±1.7. It is the single best illustration in this repo of why the third null
is not optional.

So the signal on text lives in the **perceiver's reduction** (causal
surprisal), not in the operator chain. As built, the omnimodal commitment is a
claim about plumbing — every modality reduces to a numeric series `nul` can
consume — and not yet a claim about perception. A nameless leitmotif would need
an audio reduction that is as informative for music as causal surprisal is for
prose, and RMS energy is the analogue of `meanByte`, which scored the worst of
the three.

That is a gap in the perceivers, not in `nul`, and it is now measured rather
than assumed.

---

## Reading left to right: what associative memory adds

`node scripts/activation-clearings.mjs`. One left-to-right pass over
Frankenstein (0.8s, recall answers on 738/753 frames), four channels out of it,
each fed to the same `moved` clearing.

| channel | tight recall | precision | rotated chapters (tight) |
|---|---|---|---|
| causal surprisal | 14/24 | 11/13 | p≈0.016 |
| activation | 16/24 | 14/19 | p≈0.431 |
| reach | 11/24 | 11/12 | p≈0.287 |
| novelty | 9/24 | 8/9 | p≈0.191 |
| **recalled** | **22/24** | **20/23** | **p≈0.005** |

**`recalled` — how many distinct prior passages answered — is the strongest
channel measured in this project so far.** 22/24 at 20/23 precision, p≈0.005
against rotated chapters, on the tight (±window) matcher.

Two things to be honest about:

- **The stated hypothesis was wrong.** Before measuring, the prediction written
  into the script was that `reach` would jump at a boundary — the material
  stops echoing what was just read. `reach` is the second-weakest channel
  (p≈0.29). It is not how far back the echo is; it is *how many things answer
  at all*.
- **The rotation null loses power as boundary count rises.** `recalled` emits
  23 boundaries against 24 true ones, and on the wide causal window that
  saturates — rotation alone scores 22.2±0.9, so p≈0.064 there. Only the tight
  window discriminates for a dense detector. Causal surprisal, which emits 13,
  is the reverse: strong on the causal window (p≈0.000), weaker tight
  (p≈0.016). The two channels are not ranked by one number.

## Where the embedding goes

Not measured — there is no checkpoint on disk and the sandbox blocks the only
host for the real one. The seam is built to the shape the measurement will
need and claims nothing until it has one, per the growth rule.

The placement is a tier decision, not a performance one. The sparse code fires
only on forms that have **already recurred**: verbatim and keyword recurrence,
engine tier, structurally unable to bridge `monster ≈ creature`. An embedding
is exactly that bridge, which makes it model tier — so it is injected (never
imported), it **reranks what the engine tier surfaced rather than retrieving on
its own**, and where the engine tier surfaced nothing it returns a typed gap
instead of a memory. Conformance holds that boundary against a deliberately
degenerate embedder.

The lineage's own benchmark argues for this rather than against it: the Hebbian
sparse code came out *ahead* of ColBERT-style late interaction at the range
these motifs recur (pg84 R@10 13 vs 10 of 60). The embedding is not a better
retriever to swap in — it is a second ground for one figure, and SEED.md #6
says the disagreement between two grounds is the only self-check available.
So `resonance` reports whether the two channels agree, and does not reconcile
them.

## The vital sign still points the wrong way

Turn 1 flagged 2 of 7 regions opening. With the moved clearing on Frankenstein
it is **9 of 14** — better than half, and better than turn 1 — but the shuffled
controls sit in the same range, so this is not yet evidence of anything. Per
SEED.md, widening is encounter and narrowing is extraction. Recorded, not
claimed.
