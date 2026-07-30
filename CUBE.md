# The cube — instrument, not runtime

**This describes no data structure in this repository and must not become one.**

It is a scaffold for thinking about architecture: hold a proposed organ up
against it and ask which cell the organ occupies. Two organs in one cell means
one of them is redundant. An organ that cannot be placed is not yet understood.
An empty cell is a question, not a backlog item.

As a *classifier* — deriving a cell from content — this was already measured and
refuted: shuffling words inside 2,527 paragraphs left 95.7% of cell assignments
unchanged, random words hit the modal cell at 34.7% against real prose at 33.5%,
and the fabrication veto built on it passed three plain fabrications. It is not
resurrected here. It is promoted out of the code.

## Three axes

```
MODES   = Differentiate · Relate · Generate
DOMAINS = Existence · Structure · Interpretation
GRAINS  = Ground · Figure · Pattern
```

`GRAINS` is the triad from `SEED.md`. It is the same three terms; the seed's
unit is one axis of this instrument.

## Three faces

One coordinate, three pairwise projections. This is why there appear to be
three separate vocabularies of nine — there aren't. There is one cube.

| projection | face | asks |
|---|---|---|
| (mode, domain) | **operator** | what act |
| (domain, grain) | **terrain** | on what, at what grain |
| (mode, grain) | **stance** | in what posture, at what grain |

```
operator = (mode, domain)      NUL SIG INS / SEG CON SYN / DEF EVA REC

terrain  = (domain, grain)     Existence:      Void       Entity  Kind
                               Structure:      Field      Link    Network
                               Interpretation: Atmosphere Lens    Paradigm

stance   = (mode, grain)       Differentiate:  Clearing    Dissecting Unraveling
                               Relate:         Tending     Binding    Tracing
                               Generate:       Cultivating Making     Composing
```

**A stance is not a mood and cannot be chosen.** Name the act and the grain and
the stance is entailed. Terrain and stance both carry grain, so grain is claimed
twice — and that redundancy is the whole point. Over-determination is what makes
an address falsifiable.

The addressable space is operator × grain = **27**, not 729. Of 729, 702 are
type errors by construction.

## Why this instrument earns its keep

Two mechanisms the seed depends on land on named cells, which is how we know
the instrument is doing work rather than decorating:

- **`Differentiate · Existence · Ground`** — `NUL · Void · Clearing`. Clearing
  the ground of existence. This is *E. coli's methylation reset*: it cannot
  sense a spatial gradient, so it re-zeroes its receptor baseline continuously
  and perceives only change against a nothing it rebuilds. Perfect adaptation
  is mandatory — incomplete adaptation is saturation, which is blindness in
  high signal. The work is not the swimming. The work is the erasing.

- **`Differentiate · Interpretation · Pattern` → `Generate · Interpretation ·
  Ground`** — unravel the frame, return and cultivate. This is *Ramakrishna*:
  samadhi is not the end state, it is the reset, and speech is structurally
  impossible inside it. Witness happens on the return. Hence the seed's phase
  rule.

Neither of them writes on the world. Both change only their own zero. Deposit
into a shared medium — traces, decay, off-gradient exploration — is a
`Structure`-domain mechanism, a colony's, and it does not belong at the seed.

## A known contradiction in the prior engine

Not carried here, recorded so it is not re-inherited. `eoreader5` contains two
ports of the same 4.2 cube with incompatible algebras:

- `packages/engine/ledger/cube.js` **generates** its cells from
  `stanceOf(mode, grain)` / `terrainOf(domain, grain)` — coherent by
  construction, and the derivable one.
- `packages/spec/cube/index.js` **hand-lists** nine "diagonal" cells, five of
  which its sibling's `coherence()` would refuse for grain mismatch:
  `SIG·Entity·Tracing`, `INS·Kind·Making`, `SEG·Field·Dissecting`,
  `DEF·Lens·Unraveling`, `REC·Paradigm·Cultivating`.

The hand-list also calls Existence/Structure/Interpretation "modes" (they are
domains) and claims a 9×9×9 space. It predates the algebra.

Note that Ramakrishna's own cell is among the five the algebra refuses. Either
the hand-list encoded an intuition the algebra has not yet earned, or the
intuition is wrong. Unresolved, and deliberately not resolved by fiat.
