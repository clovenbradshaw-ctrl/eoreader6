# What the generation apparatus measured

Reproduce with `node scripts/imagine.mjs` (what it says) and
`node scripts/generation-competency.mjs` (whether saying it is worth
anything). Corpus is fetched, not vendored — `scripts/corpus/` is gitignored;
see the headers of those scripts for the sources.

Every declared number is at the top of the script that used it. None of them
is a default anywhere in the engine — `createLayer` throws if `order`, `gamma`
or `alpha` arrives missing, `createBelief` throws for `rho` whenever there is a
share to divide, and `createGenerationTask` throws for `conditioning`,
`selection` and `prior_ids`.

## It reads a book and says what it thinks comes next

Frankenstein as the read text, Dracula / Jane Eyre / Moby-Dick as received
priors, each naming its giver. `order=4 alpha=0.7 gamma=0.99995 horizon=24
conditioning=free-running selection=sampled`. Free-running: every form after
the first conditions on the reader's **own** previous word, not the book's.

At 71% of the way through, having read this book only:

> more cheerful air, and the presence of my friend could in the latter end of
> misery and grief. it had been her

The same moment, having also read the other three (`borrowed=23.2%`):

> sweet, and the cottage so ardently miserable spectacle the same lulling t.
> this book ii look of his age — a miserable

What actually came next:

> pause of consideration of whether i should leave my labour for the night or
> hasten its conclusion by an unremitting attention to it.

No model was downloaded and no network was touched at run time. This is counts
over forms the reader has met, decayed by recency, interpolated across context
lengths — `emergence/surprise.js`'s `priorContinuationNull` already built and
sampled exactly this distribution and then discarded the sample to keep the KL.

**Read the right way round.** Every continuation above is stamped
`register: "imagined"`. It is the ground read forward, not a claim about the
book, and it needs no witness because it asserts nothing. The guarded moment
is the crossing — see below.

## EARNED: Amendment IV holds on real material

`node scripts/relevance.mjs`. Frankenstein read once, in order, against three
gifts and three noise floors. `order=4 alpha=0.7 gamma=0.99995 rho=0.9995
seed=20260731`, 60,000 forms taken from each gift. Every gift's standing is
updated against each arriving form using only the context that preceded it, so
the whole measurement is causal.

Each real gift is paired with a control built from **its own** vocabulary,
shuffled — same word frequencies exactly, all order destroyed.

Share of the borrowed mass, as the reading proceeds:

| at form | dracula | jane-eyre | moby-dick | shuf:dracula | shuf:jane-eyre | shuf:moby-dick |
|---|---|---|---|---|---|---|
| 10,609 | 23.1 | 26.9 | 21.8 | 9.4 | 9.6 | 9.2 |
| 31,827 | 24.3 | 28.1 | 20.4 | 9.9 | 9.1 | 8.2 |
| 53,046 | 23.9 | 29.3 | 20.8 | 8.9 | 8.7 | 8.3 |
| 84,874 | 24.0 | 25.5 | 22.6 | 9.8 | 9.3 | 8.9 |

**Every real gift sits at roughly 2.5× its own noise floor, at every
checkpoint, for the whole book.** Restriction 3 is satisfied: what the gifts
contribute is not word frequency, because a control with identical word
frequencies and no order earns less than half as much. The read text supplies
its own unigram statistics, and the gifts are being heard for something else.

**What is NOT established by this run.** The ordering among the real gifts —
jane-eyre 25.5% > dracula 24.0% > moby-dick 22.6% — spans 2.9 points, against
a 13-point gap to the floor. It is stable across all eight checkpoints and it
is the ordering one would guess (Jane Eyre is the closest of the three to
Frankenstein's register; Moby-Dick the furthest). Stability under one seed is
not a null test, and this run does not license "Jane Eyre is more relevant to
Frankenstein than Moby-Dick is" as a finding. The finding is real-vs-shuffled.

### The first implementation of the clause was degenerate, and the fix is the clause

Recorded because it is the second time in this work that a constitutional
sentence turned out to have an arithmetic that did not say it.

The first version took the softmax over the **discounted sum** of log
likelihoods. On a real book that saturates: the sum's scale grows with the
effective window (1/(1 − rho)), so within a few thousand forms the gaps
between gifts are hundreds of nats, `exp` underflows, and the mixture goes
one-hot. It reported **jane-eyre 100.00% and everything else exactly 0.00%, at
every checkpoint**, and the noise floor underflowed to 0 as well, which made
restriction 3 unfalsifiable at the same stroke. Relevance had become a hard
selection. Restriction 2 was satisfied only on paper — a gift 300 nats ahead
cannot be caught by any stretch of text a book actually contains.

Dividing by the discounted count of encounters makes the weight a **per-
encounter mean**, which is what Amendment IV says relevance is: "the surprise
that did not happen", per thing encountered, not summed over everything ever
read. So the correction is not a rescue of the arithmetic. It is the
arithmetic finally saying what the clause says.

## REFUTED: lemma abstraction does not improve next-form prediction

The headline result, and it is negative.

SEED.md Amendment IV consequence 5 says cross-modal analogy is free at the
numeric series and owed **a shared abstraction over forms** everywhere else.
`generation/abstractions.js` builds that abstraction and
`scripts/build-morphology-prior.mjs` supplies the first one from UniMorph
English (224,550 lemma/form pairs read, 216,011 dropped as recoverable by
`morphology.js`'s own suffix rule, **5,531 irregular forms kept**). On
Frankenstein it abstracts 2,900 of 7,017 types (41.3%) away from identity, and
does so correctly: `went→go`, `saw→see`, `mice→mouse`, `walked→walk`,
`cats→cat`.

Held-out mean loss, nats per form, order 4, scored on forms 60,000–63,000:

| training forms | surface only | + lemma abstraction | delta |
|---|---|---|---|
| 1,000 | 4.536 | 5.113 | **−0.576** |
| 4,000 | 5.341 | 6.284 | **−0.944** |
| 16,000 | 6.310 | 7.674 | **−1.364** |
| 40,000 | 6.763 | 8.278 | **−1.515** |

Worse at every training size, and worse the more it has read — so it is not a
sparsity story that more data would fix.

### Three fixes that each corrected a real defect and did not rescue it

Recorded because each was a genuine bug and because together they are what
makes this a finding rather than a first attempt.

1. **Chain ordering.** The abstract levels were interleaved with the surface
   levels at matching reach. Ranked strictly below the whole surface chain
   instead: −1.602 → −1.591 at 40k.
2. **A near-identity abstraction.** `lemmasOf` always includes the form itself,
   so `min(lemmasOf(form))` returned the word unchanged for every word the
   prior does not cover. The abstraction was mostly the identity function,
   which can only dilute. Fixed to prefer a real lemma: −1.591 → −1.602 at 40k,
   while raising genuine merges from a handful to 41.3% of types.
3. **Pooled counts read as confidence.** Witten-Bell's share is `n/(n+alpha)`,
   calibrated for "how often have I seen THIS context". An abstract context's
   `n` is inflated purely by coarseness, so lambda went to 0.9999, the abstract
   level swallowed nearly all remaining mass, and the unigram level that
   actually covers rare forms was left with ~1e-4 of what it needed. Corrected
   by dividing by the number of distinct surface contexts pooled in — derived
   from the table's own structure, no constant picked: −1.602 → −1.515 at 40k.

Fix 3 is kept regardless of this result: it is correct independent of whether
any abstraction earns its place, and any future one needs it.

### What this does and does not refute

It refutes **lemma abstraction, as a backoff level, for next-form prediction,
in this belief**. An order-4 surface chain already backs off through orders 3,
2, 1 and unigram; the lemma level appears to be largely redundant with those,
and every share it takes comes from a level that was doing better.

It does **not** refute the abstraction mechanism, which is what Amendment IV
consequence 5 actually owes. `classAbstraction` and `composeAbstractions` take
any inventory through the same door, and a class inventory is a different claim
about what groups with what. Under the growth rule the mechanism is unwired
until something measured earns it, and `candidate:abstracted` is deliberately
not in any default suite.

### The gift's own limits, reported rather than patched

UniMorph English's noun paradigms are incomplete: `child → children` is simply
absent from the source, though `mice → mouse` and `went → go` are present. And
the suffix rule produces `was → wa`, a false positive on an irregular the table
does not cover. Neither was worked around. A prior is a gift, and its coverage
is a fact about the gift.

## The part not measured yet

`scripts/generation-competency.mjs` runs the full prequential comparison —
every candidate a minimal contrast against `baseline:markov-4`, sealed
commitments, leakage-guarded reveals, scoped competency records. It has not
been run to completion here: the first run was measuring the peer-weighted
mixture that Amendment IV replaced, and re-running it after the amendment
landed was not finished within this session. **So there is no competency-gain
table in this file, and there should not be one until that run completes.**
What is above is held-out loss, measured directly and stated as such.

Known from a completed short run on synthetic material only: the apparatus runs
end to end, candidates clear the uniform floor, and the ordering
`markov-k > copy-previous > unigram > uniform` comes out as it should.

## A defect this found on the way, in the substrate it inherited

`baseline:copy-previous` beat every real belief on its first run **by declining
to say anything**. `sequence-log-loss` routed any target outside a step's
support to the unseen reserve, so an emitter could park its mass there and pay
almost nothing for being wrong. The reserve had quietly become a bucket for
"any word other than my guess", which is the opposite of what it is for. The
fallback is now conditional on `covers_vocabulary`, and the cheat is pinned by
`conformance/generation.test.js`.

Also found: `crps` and `pinball` checked `observed` before `kind`, inverting
`scoring.js`'s own documented contract — a well-formed emission whose kind has
no proper rule must report improper, not throw.

And twice, an invisible character. `UNSEEN` was U+0000 in one file and a plain
space in another. The context separator was a literal U+0001 in two places and
a true empty string in a third, so every order-2-and-deeper lookup missed
silently and fell back to a shorter context — indistinguishable, from outside,
from a belief that is merely weak. Both were found by running things. Neither
was found by reading them, and the second was found only because the fast path
was pinned against the full distribution by a test whose entire job is to
assert that two ways of computing one quantity agree.
