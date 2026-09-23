# feat: Pose Interpolation

## Problem Statement

When a slide Activity commands a new pose, every ABB 6700 in the cell jumps to it in a single frame. To a Student watching, the arms cut between slides instead of moving, which reads as a glitch rather than a robot moving, and it hides the motion path an Activity author often wants the Student to see. An author cannot fix this today: the component has no notion of time between two poses, and the host has no access to the joint nodes to move them itself.

Some commands are not slide changes. When an Activity author drags a joint slider, every tick commands a new angle; easing each one makes the arm trail the slider and drift in after the drag ends. Animation is right for a slide change and wrong for direct manipulation, and only the caller knows which one a command is.

## Solution

The ABB 6700 transitions between poses. When a new pose is commanded, the arm travels from wherever it currently is on screen to the target over a short, eased transition, arriving exactly on the commanded angles. The stabilizer linkage stays attached throughout. A pose commanded mid-transition redirects the arm from its current position. The domain is unaffected: the view model and state snapshot always report the commanded target, so persistence and host UI never see a mid-transition pose.

A slide Activity gets a sensible default with no configuration and can tune or disable the transition per arm instance at runtime. The arm never transitions when there is nothing meaningful to transition from: first load and a host remount render the current pose directly.

Each pose command can also say how it is rendered. `setPose`, `setJointAngle` and `applyState` — on the facade and as standalone controllers — accept an optional `{ transition: "none" }` that snaps the whole rendered arm to the commanded target, ending any transition in flight. Leaving the option out, or passing the default `"transition"`, transitions exactly as before, so existing hosts and slide changes are unchanged. The choice is per command rather than a mode on the arm, so a caller never has to remember to switch it back, and it affects only rendering: the committed target, the state snapshot and the transition duration are the same either way.

## User Stories

### Student — watching the arm

1. As a Student, I want the arm to move smoothly from its current pose to a newly commanded pose instead of jumping, so that the motion reads as a robot moving rather than a cut between slides.
   - all six joints travel from their current on-screen angles to the target angles over the transition duration
   - the motion eases in and out, with no abrupt change in speed at the start or end
   - the arm arrives exactly on the target angles when the transition ends, with no residual offset

2. As a Student, I want the stabilizer linkage to stay attached to the arm throughout the transition, so that the robot never looks broken mid-motion.
   - the stabilizer rotational member and prismatic member move continuously with J2 during the transition
   - the stabilizer reaches its derived values in the same frame J2 reaches its target

3. As a Student, I want a pose commanded mid-transition to redirect the arm from where it currently is, so that rapid slide changes never cause a jump back or a stutter.
   - the redirected transition starts from the arm's current on-screen angles, not from the superseded target
   - the redirected transition takes the full transition duration from the moment of the new command
   - only the most recent target is honoured; a superseded target is never revisited

4. As a Student, I want each arm in a cell to transition independently, so that commanding one arm never moves, redirects, or interrupts another.

5. As a Student, I want the arm to appear directly in its authored pose when the scene first loads, so that I never see the arm swing in from a default pose.
   - the first pose rendered after load is the current pose, with no transition
   - a pose commanded before load is rendered directly once the view attaches, with no transition

### Slide Activity — controlling the transition

6. As a slide Activity, I want a sensible default transition, so that arms transition between slide poses with no configuration.
   - the default transition duration is 1 second
   - the default easing is ease-in-out

7. As a slide Activity, I want to set the transition duration per arm instance at any time, so that I can tune the pacing or turn transitions off entirely.
   - a duration of zero disables the transition: subsequently commanded poses are rendered immediately
   - a changed duration applies to the next commanded pose; a transition already in progress keeps the duration it started with
   - a negative or non-finite duration is rejected with a warning and the previous duration is kept
   - a duration set before `load()` is honoured once the view attaches

8. As a slide Activity, I want the view model and state snapshot to report the commanded target pose immediately, so that persistence and host UI never capture a mid-transition pose.
   - the last view model delivered during a pose command carries the target pose, never view-interpolated angles
   - `getState()` returns the target pose while the arm is still in transition
   - the transition duration is not part of `ABB6700State`

9. As a slide Activity, I want `destroy()` during a transition to stop the motion cleanly, so that tearing down mid-transition never throws or writes to disposed nodes.

10. As a slide Activity, I want a remounted view to come up directly in the current pose, so that a host remount never replays a swing.

### Slide Activity — snap or transition, per command

11. As a slide Activity, I want to command a pose or a single joint with an option that snaps the arm instead of transitioning it, so that direct manipulation such as dragging a joint slider tracks the input exactly.
   - snap-pose: `setPose` with the snap option renders the whole arm at the commanded target with no transition
   - snap-joint: `setJointAngle` with the snap option renders the whole arm at the current target, so joints still in transition from an earlier command also land on their targets
   - cancels-in-flight: a snap command issued mid-transition ends that transition; the superseded target is never visited
   - same-target: a snap command whose angles equal the current target still ends any transition in flight
   - controllers: the standalone `setPose` and `setJointAngle` controllers accept the same option as the facade methods

12. As a slide Activity, I want commands without the snap option to keep transitioning exactly as before, so that existing hosts and slide changes are unaffected.
   - default-transitions: omitting the option, or passing `"transition"`, transitions as described in stories 1–3
   - transition-after-snap: a command without the snap option, issued after a snap, transitions from the snapped pose
   - unrecognized: an unrecognized option value is treated as the default and does not throw

13. As a slide Activity, I want `applyState` to accept the same option, so that I can restore a slide's authored configuration either with a transition or instantly.
   - facade-apply: `applyState` with the snap option renders the restored pose with no transition; without it the restored pose transitions
   - controller-apply: `applyABB6700State` accepts the same option with the same behaviour
   - contract: `applyState` stays callable with the snapshot alone and the facade still satisfies the SmartComponent structural convention; the option extends beyond the contract v1's documented `applyState(state)` signature without breaking it

14. As a slide Activity, I want the snap option to change only how the pose is rendered, so that persistence, host UI and pacing are unaffected by it.
   - same-committed-target: a command with the snap option commits the same target to the view model and `getState()` as the same command without it
   - not-in-state: the snap request is not part of `ABB6700State`
   - duration-untouched: a snap command leaves the transition duration unchanged, and the next command without the snap option uses it
   - zero-duration: with a transition duration of zero, commands render immediately whether or not the option is given

15. As a Student, I want a snap on one arm to leave the other arms alone, so that authoring one robot never disturbs another mid-motion.

16. As a slide Activity, I want a snap commanded before the view attaches to have no lasting effect, so that the first command after load without the snap option still transitions.
