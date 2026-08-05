# Naming collision: rhetorical-mechanism "metaphor" vs. evidential-strength "metaphor"

## The collision

Two unrelated axes used the word "metaphor" for opposite things.

1. **Rhetorical-mechanism axis** — which EO layer (ground / figure / pattern)
   a figure of speech does its work on, independent of how well-attested any
   particular instance is. "Metaphor" here: figure substituted for ground,
   identity *asserted* rather than compared — a confident move, verdict-
   stability "settled-to-contested depending on literalization." Sibling
   terms on this axis: simile, metonymy, synecdoche, analogy, allegory,
   aphorism/adage/maxim/axiom, personification, paradox, oxymoron, litotes,
   hyperbole.

2. **Evidential-strength axis** — `verdict/crossmodal.js`'s ladder for how
   well-attested a claimed correspondence *between two readings* is:
   identity → analogy → (formerly "metaphor") → void. This axis says
   nothing about which rhetorical move is being made; it says how much of
   verdict()'s own supported/settled ladder, plus independent corroboration,
   backs the claim.

The two axes are orthogonal — a single rhetorical-mechanism instance (one
specific metaphor, one specific metonymy) can independently land at any of
the four evidential-strength tags depending on how well-attested it is — and
should not be read as the same concept at different confidence levels.

**The bug was not "reusing a word."** `identity` and `analogy` also appear
on the rhetorical-mechanism axis and were kept, because in both cases the
two readings point the *same evidential direction*: the rhetorical-mechanism
table's `analogy` row is itself "settled if isomorphism holds, thrash if
pushed past its domain" — a real, structural, but boundable correspondence,
which is exactly what the evidential-strength `analogy` tag means here.
`metaphor` was different: on the rhetorical-mechanism axis it is a
*confident, settled-until-literalized* assertion; on the evidential-strength
axis it named the *weakest, least-earned* rung. Same word, inverted
direction — the one shape of collision that actively misleads a reader who
knows only one of the two axes.

Origin of the evidential-strength ladder: a predecessor engine's phrase,
used loosely and then promoted to a tag value without renaming.
Evidence: `clovenbradshaw-ctrl/eoreader4.2`, `src/surfer/fold/verdict.js`,
`classifyTensions`, code comment: *"the career — analogy→REC→DEF is the
life of a metaphor read off one log."* That repository is outside this
session's scope, so this cites an indexed code-search snippet, not a full
read of the file.

## Resolution

- **Done.** The evidential-strength tag is renamed `"metaphor"` →
  `"nascent"` in `verdict/crossmodal.js`, `CROSSMODAL_TAGS`, and
  `conformance/crossmodal.test.js`. Blast radius at rename time: those two
  files only (checked by grep before renaming; this module was still
  unmerged).
  Evidence: `verdict/crossmodal.js`, `conformance/crossmodal.test.js`.
- **Done, by inspection, not measurement.** `identity` and `analogy` are
  kept — see "The bug was not..." above for why those two do not invert
  between axes. This is an argued judgment call, not something scored
  against a corpus; recorded as a judgment call rather than dressed up as
  more than that.
- **Not done.** The rhetorical-mechanism table itself (simile / metaphor /
  analogy / metonymy / synecdoche / allegory / parable / aphorism / adage /
  maxim / axiom / personification / paradox / oxymoron / litotes /
  hyperbole) is not imported into this repository as code, doctrine, or an
  `eo-constitution` amendment. It is a descriptive taxonomy for prose
  classification, external to this module, and nothing here claims it was
  measured against real text the way `nul`'s statistics are measured
  against real material.

## Non-goal

This doc does not attempt to unify the two axes into one model, or to build
a rhetorical-mechanism classifier. They measure different things — which
move, vs. how well-attested — and collapsing them would destroy the
orthogonality that makes both useful.

## Addendum, 2026-08-05: the naming collision has a real theoretical account

The distinction argued for above by inspection — "identity and analogy don't
invert between axes, metaphor did" — turns out to be Gentner's (1983)
structure-mapping theory and Bowdle & Gentner's (2005) "Career of Metaphor"
hypothesis, arrived at independently and then checked against the
literature rather than the other way around. Recorded so the order of
discovery isn't misrepresented later.

**Structure-mapping's actual claim** (Gentner 1983; Gentner & Markman 1997):
analogy, metaphor, and literal similarity are evaluated by ONE alignment
mechanism, not three — what differs is (a) how much surface/attribute
overlap accompanies the relational overlap, and (b) same-domain vs.
cross-domain. Gentner & Markman's 1997 typology crosses these two axes:
literal similarity (high relational + high attribute, same domain), analogy
(high relational + low attribute, cross-domain), mere-appearance (low
relational + high attribute — a cloud that looks like a rabbit: real,
noticed, not inferentially productive), and anomaly (low + low).

**Bowdle & Gentner's (2005) "Career of Metaphor"**: a metaphor is not a
separate kind of correspondence from an analogy — it is a TRAJECTORY. A
novel metaphor is processed by comparison, the same mechanism as analogy,
effortful and reversible; with enough repeated conventional use, the mapped
relational structure gets abstracted into a standing category attached to
the vehicle term, and comprehension shifts from comparison ("A is like B")
to categorization ("A is a B'") — a "dead" metaphor. This is exactly the
shape of the `eoreader4.2` comment this module already traced its ladder
to: `analogy → REC → DEF` as "the life of a metaphor read off one log" is
the SAME claim — a live analogy and a metaphor are one relation at
different points in repeated re-observation, not two labels chosen once.

**What changed in `verdict/crossmodal.js` as a result:**

- `career(history, { minObservations })` — trajectory state (`comparison`
  vs `categorized`) computed over a SEQUENCE of past `crossModalTag()`
  results for the same tracked locus, not a property of one call. Replaces
  the earlier implicit assumption that a tag, once returned, was the whole
  story.
- `mode` (`"surfeit" | "moved"`), optional per side, is the first real
  RELATIONAL-overlap signal this module has had — previously position
  alignment alone stood in for both relational and attribute overlap, which
  silently conflated Gentner-Markman's analogy cell with their
  mere-appearance cell. A new tag, `mereAppearance`, is returned when
  positions align but declared modes disagree — hard-capped, unreachable
  from `identity`/`analogy` no matter how strong or corroborated either
  side is alone, matching Gentner-Markman's claim that mere-appearance has
  nothing to transfer regardless of how salient the surface overlap is.
- `sharedOrigin: true` (an option, never inferred) refuses outright rather
  than tag anything — the metonymy/homology guard: two sides that cite the
  same literal material are coreferent, not independently similar, and
  scoring that as an extra-strong "identity" would be the exact
  unearned-correspondence mistake this module exists to catch, aimed at
  itself. Metonymy proper (contiguity/association, no relational alignment
  at all) cannot be guarded here — a `{strength, position, corroborated}`
  triple carries no signal that could distinguish it — so it must be
  filtered by the caller before a side is ever constructed.

**Explicitly not done, and should not be treated as confirmed:**
Gentner-Markman's full quadrant (literal-similarity / analogy /
mere-appearance / abstraction) needs relational overlap AND attribute
overlap as two independent, separately-measured axes. `mode`-matching gives
a real relational signal for the first time; there is still no
attribute-overlap signal anywhere in this module — nothing compares the two
sides' underlying magnitudes or surface shapes, only position and a mode
label. Choosing "literal similarity" as an output tag would require that
second axis, and inventing a proxy for it now rather than measuring one
would repeat the mistake this addendum is otherwise fixing.
Systematicity (Gentner's requirement that a real analogy connects several
higher-order relations, not one isolated match) is also not implemented:
that needs an aggregate object over several `crossModalTag()` instances
checking for a consistent, order-preserving mapping, which is a SYN-level
feature (allegory-shaped: a cluster of tensions co-varying together) and a
larger addition than this pass made.

## Addendum, 2026-08-05: mereAppearance checked against real data, not just synthetic sides

Every real case this session had run before this point (`goldens/multimodal`'s
one non-void pair, all 12 audio↔image true-matches in a synthesized
corpus grid) happened to clear by the SAME mode on both sides — every
synthetic transition built that session was a level shift, so `mode`
agreement was close to guaranteed by the test design, not demonstrated.
`mereAppearance` had been exercised only by hand-fed synthetic sides in
`conformance/crossmodal.test.js`. Caught on being asked directly whether
any of this was useful, checked rather than re-asserted.

`conformance/crossmodal-mereappearance.test.js` closes that gap: two series
built from `scripts/two-clearings.mjs`'s own already-validated construction
(a pure level shift, mean 10→25, reliably clears `surfeit`; a pure spread
shift at a *constant* mean, spread 1→6, reliably clears `moved` — measured
there at 3/3 vs `surfeit`'s 1/3), their transitions placed at the identical
normalized position, run through the real `runTurn()` pipeline. Five
(levelSeed, spreadSeed) pairs, the first five tried, unfiltered:

- All five: position-only logic (`mode` withheld) calls it `analogy` —
  perfect position match, both sides corroborated.
- 3 of 5: the underlying phenomena genuinely differ (`surfeit` vs `moved`)
  and mode-aware logic correctly catches it as `mereAppearance`.
- 2 of 5: both sides happen to clear by `surfeit` anyway (the same
  known imperfection `two-clearings.mjs` already measured — a big enough
  variance jump can still lift `surfeit`'s max-over-windows statistic) and
  `analogy` is the correct call, not a missed catch.

Evidence: `conformance/crossmodal-mereappearance.test.js`. This is the
first non-synthetic evidence that `mode`-matching changes a real outcome
rather than only ever confirming what position-only logic already said.
