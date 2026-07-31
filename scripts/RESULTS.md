# Results — the second clearing

> ## RETRACTION (read this first)
>
> **The chapter-boundary results below did not survive a pre-registered test on
> a second book. They were a sweep finding its best cell on one text, and this
> file quoted a fitted number as a discovery for two commits.**
>
> What happened. The headline was `moved` recovering 19/24 Frankenstein chapter
> boundaries at p≈0.000 against rotated chapters, with `recalled` at 22/24 and
> p≈0.005. Both were computed at one configuration — 100-word chunks, a reach of
> the present of 12 units — chosen before any alternative was measured.
>
> Sweeping that parameter (`scripts/declared-present.mjs`) shows the
> significance sits in a single cell. At the two grains where the reach of the
> present is even representable, **1 of 36 cells reaches p<0.05, where chance
> alone delivers 1.8.** The winning cell was not chosen well; it was chosen
> first, and could not be told apart from a fitted one on one book.
>
> So one book that had never been looked at, one frozen configuration — the one
> that won on Frankenstein, to give it its best shot — two channels, no sweep
> (`scripts/second-book.mjs`). Garoa, a Basque novel from 1912:
>
> | channel | recall | precision | rotated chapters | p |
> |---|---|---|---|---|
> | causal surprisal | 16/20 | 11/11 | 16.2±1.1 | **0.727** |
> | recalled | 18/20 | 15/15 | 18.7±0.5 | **1.000** |
>
> `recalled` scores **18/20 recall at 15 out of 15 precision** — not one false
> boundary — and **every single rotation does at least as well.** If any single
> number in this repository is worth remembering, it is that one.
>
> **Retracted:** that `moved` beat a rotation null on an external reference;
> that `recalled` is the strongest channel measured; the paragraph-derived reach
> of the present (it never wins on Frankenstein, and degenerates on dialogue —
> Garoa's median paragraph is 8 words).
>
> **Not retracted**, because none of it rests on chapter alignment: the
> growth-matched null in `pattern()` and the two bugs it caught; the causal
> corrections in `activation`; prefix stability; admission-order invariance;
> the consumption refusals; the pure-binary null; the planted-regime result;
> and the three-nulls methodology below, which is what caught this.
>
> The tables that follow are left exactly as they were written, wrong headline
> and all. Editing them would remove the evidence of how convincing a fitted
> number looks from the inside.

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

---

## What the sweep and the second book actually established

Three things, none of them about Frankenstein.

**A sweep is not a test, and counting it is what turns it back into one.** Four
window values × two channels × two match windows × two grains is 36 comparisons.
Reporting the best one as though it were the only one is the oldest mistake
there is, and it was made here by choosing a parameter before measuring
alternatives — which feels nothing like p-hacking while you are doing it.

**Precision does not protect you.** 15/15 precision on Garoa, and p≈1.000.
Recall, precision and F-score are all satisfiable by a detector that emits
roughly evenly spaced marks, because chapters are roughly evenly spaced. Only a
null that preserves the detector's output and the truth's spacing — and breaks
just the alignment — can tell those apart.

**A test set survives exactly one sweep.** Frankenstein is burned: every future
configuration choice made against it is fitted by construction. The remaining
untouched references in this lineage should be spent one at a time, on
configurations frozen in advance.

## Where that leaves the reach of the present

`perceiver/consumption.js` stands — a perceiver must declare how its material
is consumed, in its own units, with a basis, and the reader refuses what is not
sequential. What has been withdrawn is the text perceiver's *derivation* of the
present from paragraph length, which is a guess wearing a derivation, and the
only thing worse than an unjustified number is an unjustified number with a
story attached.

`paragraphWords` remains exported as evidence. A working basis would have to
not collapse on bimodal paragraph distributions and to transfer across authors
and languages — the two tests this one failed.

---

## The growth rule, finally run — and `activation` does not pass it

`node scripts/growth-rule.mjs`. SEED.md: *"An organ joins only when the level
test returns `above` against the core. `peer` or `unstable` means it waits.
Unwired is failing."* `activation` was built, wired and validated against an
external reference; that validation is retracted above, and the test the seed
actually names had never been run. It has now.

**First it could not be run at all, and the reason is a defect in `nul`.**

`level()` took one scalar and pushed it through both grounds, which is only
meaningful when the grounds share a scale — and the case the growth rule exists
for is precisely the case where they do not. Causal surprisal is in microbits
(~10⁶); "how many prior passages answered" is a count (~30). Every
cross-measurement censored: 12 book-channel pairs, uniformly `unstable`. That
is what a broken instrument looks like, not a finding. `level` now accepts
`{own, target}` — the same *moment*, measured in each series' own units — and
the comparison is genuinely rank-based and scale-free, as it was always
documented to be.

**Then it still could not be run, for a second and deeper reason.**

The engine had exactly one statistic, and `burstiness` is a MAX over windows, so
its null's support sits at the top of the range. Measured on Frankenstein: of
742 real windowed means, **639 fall below the support and 102 land inside.** The
figure censors before the level question is reached. This is why SEED.md lists
`level` under "not yet earned" — it was never missing an implementation, it was
missing a statistic its own figures could inhabit.

`nul::windowedMean` is that statistic: a windowed mean with the order destroyed.
Under shuffle it is the mean of `window` elements drawn without regard to
position, so a real windowed mean departs from it exactly when neighbours are
correlated — which is what clustering is. Same material, same window: **635 of
742 inside, 49 below, 58 above.** A figure that can be ranked.

| | inside support | below | above |
|---|---|---|---|
| burstiness | 102 | 639 | 1 |
| windowedMean | **635** | 49 | 58 |

**And the answer is no.**

Across Frankenstein, Garoa and Heart of Darkness, four channels each, sampled
across the whole extent and asked again by a second perturbation family:
`above` never exceeds 19% of moments, `below` dominates wherever anything
resolves, and no channel reaches a majority `above` in any book. Nothing joins.

By the growth rule that is a refutation and not a delay: **`activation`
re-describes what causal surprisal already grounds rather than adding a
dimension to it.** Wiring it anyway is the thing the rule exists to prevent, and
it was wired anyway — on the strength of a chapter-boundary number that has
since been retracted.

Two honest limits on this verdict. Between 22% and 55% of moments still come
back `exceeds_witness` even with the better statistic, so a substantial share of
the material remains unplaceable and the verdict rests on the remainder. And
`below` is the modal resolved relationship, which is a stronger claim than
`peer` — it says the core's ground places these moments more comfortably than
the organ's own does — and I do not yet have an account of why that should be so.

---

## `level()` was broken a third time, and the verdict survived it

Chasing the one thing flagged as unexplained above — why `below` dominated —
turned up two more defects in `level()`, on top of the shared-scalar one already
fixed. Both were found by constructing cases with a known right answer, which is
what should have been done before quoting any verdict from it.

**The comparison was on the wrong quantity.** It subtracted raw ranks, and
`rank` is one-sided: it counts samples at or above the observation, running from
~0 at the top of a null to ~1 at the bottom. Subtracting two of those does not
compare how *extreme* an observation is against two grounds. Demonstrated: own
ground tight (support 9.27–10.82), target wide (0.38–17.65), observation 10.53 —
rank 0.030 in its own, 0.318 in the target's, so extreme for its own and
thoroughly ordinary for the target. The target anticipates it easily, which is
`below` by this function's own definition, and it returned `above`.

Extremeness is now two-sided: `1 - 2·min(r, 1-r)`, zero in the middle of a null
and one at either edge. A ground fails to anticipate an outlier in *either*
direction, and there is no reason a low one should count as anticipated.

**The threshold was a quantisation step, not a resolution.** `2/draws` is the
spacing between adjacent achievable ranks — the finest difference the null can
*represent*. The finest it can *distinguish* is the sampling error, about
`sqrt(r(1-r)/n)`, which at n=400 is ~0.025 against a step of 0.005. Five times
too tight, so noise was being reported as a level relationship: `peer` came back
on 2–3% of moments and nearly everything resolved to above or below. Two grounds
built to the same spec from independent samples of the same distribution were
not peers, which is a contradiction in terms.

Now `2·√2/√draws`, derived: se(rank) ≤ 0.5/√n at its maximum so the bound holds
everywhere, extremeness doubles it, comparing two independent grounds multiplies
by √2. Two standard errors is a stated convention and the only part not derived.

**The verdict did not change.** With all three fixed, across the same three
books and four channels: `above` 10–22% of moments, `below` 16–34%, `peer`
9–24%, censored 22–55%. Nothing reaches a majority `above` anywhere. Nothing
joins.

I expected the sign correction to invert the result and said so; it did not,
because replacing a rank difference with a two-sided extremeness difference is
not a sign flip but a different quantity. What the fixes did change is the
shape: `peer` rose from 2–3% to 9–24%, absorbing most of what the old threshold
had been calling `below`. That is the honest picture — the two grounds are
frequently indistinguishable, which the instrument previously could not say.

So: the conclusion stands, and the reasoning that first produced it did not. A
verdict reached with an instrument broken in three places was worth exactly
nothing until the instrument was checked, and it was only checked because the
one anomaly in it was chased instead of shipped.
