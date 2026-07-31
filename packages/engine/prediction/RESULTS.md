# What the prediction harness measured

Reproduce with `npm run competency -- <path-to-a-text-file>`. Every number
below comes from `scripts/predictive-competency.mjs` at `window=6`, `draws=96`,
`tolerance=2`, `warmup=24`, `n=320`, scored by CRPS. All five declared numbers
are in the script header; none of them is a default.

Competency gain = baseline cumulative loss − candidate cumulative loss.
Positive means the candidate carried less loss than that baseline.

## The claim being tested

`SEED.md` says an organ joins only when the level test returns `above` against
the core, and that "unwired is failing." Import-graph wiring is the cheap half.
This is the expensive half: each organ is reduced to a committed predictive
distribution and scored against baselines it must beat, on a battery designed
so that a candidate cannot look good by accident.

## Result

| candidate | organ under test | verdict |
|---|---|---|
| `candidate:regime-mean` | atmosphere's causal re-zero tracker | **earned on real material**, with a caveat below |
| `candidate:ananda-scaled` | ground volume as an uncertainty signal | **not earned** — mildly harmful everywhere |
| `candidate:regime-ananda` | both at once | **not earned** — tracks regime-mean, always slightly worse |

### regime-mean, on real prose

Gain against every baseline, on the causal surprisal series of *Frankenstein*
(296 scored steps, 7 re-zeros):

| vs | gain |
|---|---|
| `baseline:last-value` | +12,801,506 |
| `baseline:global-mean` | +52,086,184 |
| `baseline:moving-mean-6` | +3,700,838 |
| `baseline:random-walk` | +12,801,506 |

Beating a fixed-window baseline is **not** evidence that the boundaries are
real. Regime-mean's slice is typically much longer than a 6-step window, and on
a mean-reverting series a longer slice estimates the mean better for reasons
that have nothing to do with where it starts. So the decisive test is the
**boundary permutation null**: hold the re-zero *count* fixed at whatever
atmosphere actually produced, destroy only the *placement*, 8 replicates.

| series | re-zeros | observed gain vs moving-mean-6 | null max | clears? |
|---|---|---|---|---|
| level-shift (positive control) | 2 | −118.7 | −132.5 | yes |
| ar1 (negative control) | 4 | −19.5 | −6.1 | no |
| trend (negative control) | 34 | −100.6 | −51.4 | no |
| noise (negative control) | 0 | — | — | n/a, nothing placed |
| **frankenstein (real)** | **7** | **+3,700,838** | **−438,711** | **yes** |

On real prose the placement beats every arbitrary placement of the same count,
by a wide margin. On both negative controls it does not. That is the result
this whole port was built to be able to state.

### The caveat, which is structural and not a rounding error

On the synthetic positive control, regime-mean **loses** to
`baseline:moving-mean-6` (−118.7) even though it clears the boundary null. It
found only 2 re-zeros in a series with 7 genuine level shifts.

The reason is directional, and it is pinned by a conformance test
(`conformance/prediction.test.js`, "MEASURED LIMIT"). Same staircase, same
magnitudes, run in both directions:

```
staircase UP   (0,2,4,...,14)   re-zeros: 10
staircase DOWN (14,12,...,0)    re-zeros:  0
```

**Atmosphere is structurally blind to a falling level.** Only censored-*above*
clears, because `SEED.md` #8 names censored-below as regularity and forbids
treating it as surfeit — and counting below as surfeit was measured once
already and re-zeroed on nearly every step. So the fix for over-firing produced
a half-blind detector. Both halves of that trade are real; neither is resolved
here. Named, not patched, because patching it without a measurement would just
be the earlier bug again.

### ananda, as an uncertainty signal

`SEED.md` calls ananda "the warmth you check for" and explicitly not a gate and
not a score. This did not try to make it one. It asked a narrower question — is
ground volume *informative* about how uncertain the next step is — by holding
the forecast centre identical to `baseline:last-value` and letting ananda
modulate only the spread, entering as a dimensionless ratio to its own running
mean so no scale constant was smuggled in.

The answer is no. `candidate:ananda-scaled` is negative on every series in the
battery, including real material (−323,142 vs last-value). If ground volume
carried no information the ratio would hover near 1 and the gain would sit near
zero; it is consistently, mildly worse than that, so the modulation is adding
noise. This does not touch ananda's role as a health sign. It refutes one
specific use of it, which is the only thing that was tested.

## What is now wired, and what is not

`packages/engine/loops/atmosphere.js` had zero importers and zero tests before
this. It now has both, through `prediction/candidates.js`. `prediction/*` and
`competency/ledger.js` were 3-to-12-line stubs — `competencyGain()` returned
`0` unconditionally and `recordStep` mutated its argument, which are precisely
the two failure modes the real ledger exists to prevent.

Still unwired, and therefore still refuted by the growth rule:
`loops/turn.js`, `emergence/fold.js`, `observation-index.js`, `replay/`,
`search/`, `referents/` (one re-export nothing imports), `event_log/` (one
script). The relativity debt named in `SEED.md` — "nothing yet puts this
module's own acts in the record" — is untouched by this work.

## A defect this found on the way

`packages/spec/index.js` exported a `canonicalHashSync` that called
`JSON.stringify(data, Object.keys(data).sort())`. An array second argument to
`JSON.stringify` is a key **allowlist** applied at every depth, not a sort
order, so every nested key absent from the top level was dropped before
hashing. A prediction commitment sealed with it did not cover
`predictive_output` at all — the seal was blind to the one field it exists to
protect. Fixed in `packages/spec/canonical-json/`, with the tamper case pinned
by test.
