# ADR 0007: Path playback runs on the view's clock, and a path stop commits the pose the view brings the arm to rest at

**Status:** Proposed · 2026-10-16

In 2.1.0, pose transitions went into the Babylon view only. A command commits its target to the entity at once. The view then eases the rendered arm toward that target on its render loop. The domain has no notion of time, and the glossary forbids interpolating in the domain or PM.

Issue #20, from the demo_automation_cell In Cycle epic (its ADR 0025), asks for two things:

- **Path playback.** The arm plays an ordered list of segments, each a pose, a travel time and an optional dwell. Each segment's pose is committed as the segment starts. The host must learn when the arm reaches each pose, so it can fire the weld gun during the dwell.
- **A path stop.** The rendered arm decelerates from where it is on screen, and the pose it comes to rest at is committed.

Both requests are new to this component. The domain must act at moments in time: a segment starts, a pose is reached, an arm comes to rest. And for the first time a committed pose comes from motion, not from a command. Whatever decides those moments is the path's clock. It can live in the domain, or in the view, which already owns the transition clock.

## Decisions

1. **The view's render loop is the path's only clock.** The domain owns the request: the segment list, the current segment's index and phase, every commit, and the three events (`pathSegmentReached`, `pathCompleted`, `pathStopped`). The view renders the current segment over its travel time and counts its dwell. It reports to the domain through package-internal controllers at three points: when the arm reaches a segment's pose, when a dwell ends, and when a stop brings the arm to rest. The domain never reads a clock.
2. **The view computes a path stop, and the domain commits the result.** On a stop, the view slows the arm along its current segment from the speed it has on screen, and brings it to rest within the stop duration. It then reports the pose it rests at. The domain commits that pose and drops the rest of the path. The domain never evaluates an easing curve, so the glossary's rule against interpolating in the domain stands.
3. **A path advances only while its view renders.** Before `load()`, or while the scene's render loop is stopped, a path waits on its committed segment, and a requested stop waits to come to rest. Commands still work headless, as before: the committed pose, the VM and `getState()` stay correct.

## Considered options

**A domain clock (rejected).** The use case runs timers: it commits each segment when its time comes and announces arrivals on its own schedule. The view follows each committed target, using durations and easing carried on the VM. This has real advantages: paths advance with no view, and sequencing can be tested without a scene. It was rejected for three reasons:

- To commit a stop's pose, the domain would have to evaluate the easing curve itself. That pose only approximates the screen, and computing it is the interpolation the glossary keeps out of the domain.
- Two clocks would decide each arrival, so the event and the arrival on screen could differ by a frame.
- In a background tab, throttled timers would advance a path nobody sees.

**The view plays the whole path and only reports results (rejected).** The VM would carry the full segment list, and the view would sequence it. This needs fewer reports, but it puts the sequencing rules in the view: dwells, cancellation, and when each segment's pose is committed. There they could be tested only through a scene, and a remount would lose them.

**Keep the host chaining single transitions (rejected).** This is the consumer's interim executor. It cannot stop a move partway, because each move's target is committed when the move starts. That limit is what the issue exists to remove.

**The host interpolates joints every frame (rejected).** The consumer's ADR 0025 already rejected this. It duplicates the easing the component owns, and it makes the host the authority on how an ABB 6700 moves.

## Consequences

- The view calls into the domain for the first time, through controllers. This is the canonical inbound path for an event that occurs in the framework layer. The report controllers are package-internal and are not exported from `index.ts`.
- `ABB6700VM` gains a required `path` field: the segment index and phase, plus the current segment's travel time, dwell and stop duration that the view renders. A host that builds VM literals must add it, as with `snapCount` in 2.2.0.
- Domain tests drive a path by calling the report controllers in place of the view. View tests drive frames on the mock scene, as the transition tests already do.
- A host that waits for `pathCompleted` or `pathStopped` needs the arm's view loaded and its scene rendering. A headless host, such as the consumer's domain tests, mocks the path controllers instead.
- Paths pause while a tab is hidden, because the render loop does.
