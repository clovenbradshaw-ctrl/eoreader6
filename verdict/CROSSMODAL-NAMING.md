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
