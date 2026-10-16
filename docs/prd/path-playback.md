# feat: Path Playback

## Problem Statement

A host that runs a robot program on the ABB 6700, such as the demo cell's weld sequencer, can send only one pose at a time. It has to chain single pose transitions and time each one itself. Two problems follow. First, the host decides when each move ends, not the component, so the arm's motion and the host's timeline can drift apart. Second, the host cannot stop the arm partway through a move. The component commits a move's target when the move starts and has no early stop, so a halt either freezes the arm or lets the move finish. An Emergency Stop or a controller power-off should look like a robot braking to a stop. The pose where it stops should be the pose the host and a saved slide see.

## Solution

The ABB 6700 plays a **path**: an ordered list of **segments** played as one motion. Each segment is a pose, a travel time and an optional **dwell**. The host hands in the travel times and dwells, and the component honours them as given. Each segment's pose is committed to the view model and the state snapshot as that segment starts. A single pose command follows the same rule.

The component announces three moments: the arm reaches a segment's pose, the path is done, and a stop has brought the arm to rest. These are payload-free events, available on the facade and as standalone subscription controllers. The view model names the current segment.

A host can stop a path in flight. The rendered arm slows along its current segment from the speed it has on screen. It comes to rest within a short stop duration, 400 ms by default. It never passes the segment's pose and never starts another segment. The pose it rests at is committed, and the rest of the path is dropped. A pose command cancels a path in progress, with or without the snap option, and a new path replaces it.

The path is not part of the state snapshot, whose schema version stays 1. The path's clock is the view's render loop (ADR-0007), so a path advances only while the arm's view renders. Pose commands, the snap option and the transition duration behave as before.

## User Stories

### Host — playing a path

1. As a host, I want to play an ordered list of segments, each a pose, a travel time and an optional dwell, in one request, so that the arm runs a whole program without my chaining single pose commands.
   - facade: `playPath` on the facade starts the path
   - controller: the standalone `playPath` controller starts the path for a host that holds no facade
   - first-committed: the first segment's pose is committed to the view model and `getState()` as soon as the path starts
   - vm-path: the view model's `path` reports the segment in progress, its index and its phase, and is `undefined` when no path is in progress

2. As a host, I want each segment's pose committed as that segment starts, so that the view model and `getState()` follow a path the same way they follow a single pose command.
   - next-committed: when a segment's dwell ends, the next segment's pose is committed and the view model's segment index advances
   - targets-only: no view model delivered during a path carries angles between two segment poses
   - not-in-state: the path is not part of `ABB6700State`, and the state schema version stays 1

3. As a host, I want to be told when the arm reaches each segment's pose, so that I can fire the weld gun during the dwell.
   - once-in-order: `pathSegmentReached` fires once per segment, in segment order, when the arm arrives at the segment's pose
   - index-readable: when `pathSegmentReached` fires, the view model's `path` names the segment reached, in its dwelling phase
   - both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller, and each returns an unsubscribe function that stops further calls
   - payload-free: the callback receives no arguments

4. As a host, I want to be told when a path is done, so that I can start what comes next.
   - after-last-dwell: `pathCompleted` fires once, after the last segment has been reached and its dwell has ended
   - reached-first: for the last segment, `pathSegmentReached` fires before `pathCompleted`
   - idle-after: when `pathCompleted` fires, the view model reports no path in progress and the last segment's pose stays committed
   - both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller

5. As a host, I want the travel times and dwells I hand in honoured as given, so that the program's timing stays mine.
   - travel-time: the arm takes each segment's travel time to reach its pose, whatever transition duration is set on the arm
   - dwell: the arm holds still at a segment's pose for that segment's dwell before the next segment starts
   - no-dwell: a segment without a dwell leads straight into the next one
   - same-pose: a segment whose pose equals the one before it still takes its travel time
   - zero-travel: a segment with a travel time of zero snaps to its pose
   - duration-untouched: changing the transition duration during a path does not change the path's timing, and the new duration applies to the next pose command after the path

6. As a host, I want a malformed path request rejected whole, so that a bad program never half-plays.
   - empty: an empty segment list is rejected with a warning, and nothing changes
   - bad-time: a negative or non-finite travel time or dwell in any segment rejects the whole request with a warning, and whatever was in progress carries on unchanged
   - missing-arm: the `playPath` controller called with an id that has no arm behind it submits a warning and does nothing

### Student — watching a path

7. As a Student, I want the arm to move through a path as one continuous motion, so that a program reads as a robot working rather than a series of jumps.
   - from-screen: the first segment starts from the angles on screen, even when a transition is in flight
   - eased: each segment eases in and out between its two poses, as a pose transition does
   - exact: the arm arrives exactly on each segment's pose
   - stabilizer: the stabilizer linkage stays attached throughout

8. As a Student, I want each arm's path to play independently, so that one arm's program never moves, stops or interrupts another arm.

### Host — stopping a path in flight

9. As a host, I want to stop a path in flight, so that an Emergency Stop or a controller power-off halts the arm partway through a move.
   - facade: `stopPath` on the facade stops the path
   - controller: the standalone `stopPath` controller stops the path for a host that holds no facade
   - stopping: from the stop request until the arm is at rest, the view model's `path` is in its stopping phase and the committed pose stays the current segment's
   - drops-rest: after a stop request, no further segment starts and neither `pathSegmentReached` nor `pathCompleted` fires

10. As a Student, I want a stopped arm to slow to rest from where it is on screen, so that a stop looks like a robot braking rather than a freeze or a finished move.
    - decelerates: the arm slows from the speed it has on screen and comes to rest within the stop duration
    - on-segment: the arm slows along its current segment and never passes the segment's pose
    - at-rest: an arm in a dwell, or at the start of a segment, stops where it is
    - stabilizer: the stabilizer linkage stays attached while the arm slows

11. As a host, I want the pose a stopped arm rests at committed and announced, so that the view model, `getState()` and my sequencer agree on where the arm is.
    - commits-rest: when the arm comes to rest, the view model and `getState()` hold the pose it rests at
    - stopped-event: `pathStopped` fires once, after the rest pose is committed
    - idle-after: when `pathStopped` fires, the view model reports no path in progress
    - both-surfaces: the event is available through the facade's `onEvent` and through a standalone subscription controller

12. As a host, I want to choose how long a stop takes, so that the stop matches the halt I am showing.
    - default: the default stop duration is 400 ms, and the package exports that number and the stop options type so a host can use the same values
    - per-request: a stop duration passed with the request is used for that stop
    - invalid: a negative or non-finite stop duration is replaced by the default with a warning, and the stop still happens
    - zero: a stop duration of zero stops the arm where it is

13. As a host, I want a stop request that has nothing to stop to change nothing, so that a stop never moves an idle arm or announces a stop that did not happen.
    - idle: with no path in progress, `stopPath` changes nothing and fires no event
    - repeat: a stop request while the arm is already stopping changes nothing, and `pathStopped` still fires once

### Host — pose commands and paths

14. As a host, I want any pose command to cancel a path in progress, so that a slide change or a snap always takes over from a running path.
    - set-pose: `setPose` during a path cancels it; the commanded pose is committed and the arm transitions to it from the angles on screen
    - set-joint: `setJointAngle` during a path cancels it
    - apply-state: `applyState` on the facade and the `applyABB6700State` controller cancel a path in progress
    - snap: a pose command with the snap option during a path cancels it and snaps the arm to the commanded pose
    - silent: a cancelled path fires no further events, and the view model reports no path in progress
    - during-stop: a pose command while the arm is stopping ends the stop; the commanded pose wins and `pathStopped` does not fire

15. As a host, I want a new path to replace the one in progress, so that I can change the program without stopping first.
    - replaces: the new path's first segment is committed and the view model's segment index starts again at 0
    - silent: the replaced path fires no further events
    - from-screen: the new path starts from the angles on screen

16. As a host, I want pose commands, the snap option and the transition duration to behave as before when no path is in progress, so that existing hosts see no change.

### Host — lifecycle and contract

17. As a host, I want a path requested before the view loads to play once it loads, so that I can start a program in the same tick I create the arm.
    - waits: before `load()`, the first segment's pose is committed, the path waits on that segment, and no event fires
    - plays-on-load: once the view attaches, the arm appears directly on the committed pose, that segment counts as reached, and the path plays on from there

18. As a host, I want `destroy()` or a remount during a path to end cleanly, so that tearing down mid-path never throws or writes to disposed nodes.
    - destroy: `destroy()` during a path or a stop never throws, and no event fires afterwards
    - remount: after a remount during a path, the arm appears directly on the committed pose and the path plays on from there; during a stop, the stop ends on that pose

19. As a host, I want the path commands and events to extend the facade without breaking the SmartComponent contract, so that existing hosts compile and run unchanged.
