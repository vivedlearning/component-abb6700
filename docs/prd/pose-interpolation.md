# feat: Pose Interpolation

## Problem Statement

When a slide Activity commands a new pose, every ABB 6700 in the cell jumps to it in a single frame. To a Student watching, the arms cut between slides instead of moving, which reads as a glitch rather than a robot moving, and it hides the motion path an Activity author often wants the Student to see. An author cannot fix this today: the component has no notion of time between two poses, and the host has no access to the joint nodes to animate them itself.

## Solution

The ABB 6700 animates between poses. When a new pose is commanded, the arm travels from wherever it currently is on screen to the target over a short, eased transition, arriving exactly on the commanded angles. The stabilizer linkage stays attached throughout. A pose commanded mid-transition redirects the arm from its current position. The domain is unaffected: the view model and state snapshot always report the commanded target, so persistence and host UI never see a mid-transition pose.

A slide Activity gets a sensible default with no configuration and can tune or disable the transition per arm instance at runtime, for example turning it off while an author drags a joint slider. The arm never animates when there is nothing meaningful to animate from: first load and a host remount render the current pose directly.

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

6. As a slide Activity, I want a sensible default transition, so that arms animate between slide poses with no configuration.
   - the default transition duration is 1 second
   - the default easing is ease-in-out

7. As a slide Activity, I want to set the transition duration per arm instance at any time, so that I can tune the pacing or turn animation off entirely.
   - a duration of zero disables the transition: subsequently commanded poses are rendered immediately
   - a changed duration applies to the next commanded pose; a transition already in progress keeps the duration it started with
   - a negative or non-finite duration is rejected with a warning and the previous duration is kept
   - a duration set before `load()` is honoured once the view attaches

8. As a slide Activity, I want the view model and state snapshot to report the commanded target pose immediately, so that persistence and host UI never capture a mid-transition pose.
   - `onViewModel` delivers the target pose when the command is issued, not the interpolated angles
   - `getState()` returns the target pose while the arm is still in transition
   - the transition duration is not part of `ABB6700State`

9. As a slide Activity, I want `destroy()` during a transition to stop the motion cleanly, so that tearing down mid-animation never throws or writes to disposed nodes.

10. As a slide Activity, I want a remounted view to come up directly in the current pose, so that a host remount never replays a swing.
