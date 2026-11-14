# Lessons from each video (conversation-only until the user says "ثبت الأسلوب")

## Video 1: office test (loud coworker), reviewed after render
Mistakes found by watching the finished video, and the rule that prevents each one:
1. Headphones drawn over the eyes like goggles. Rule: measure the real head size first (head radius 118 px, centre from headCenter) and put props on the right body part: band over the top, cups on the ears.
2. The phone floated at belly height, not in a hand. Rule: compute the hand position of the chosen arm pose and draw held props exactly at the hand.
3. The phone screen faced the camera. Rule: a person looking at a screen means the viewer sees its back; show the light as a glow instead.
4. The mug fell by itself. Rule: every event needs a visible cause (here the coworker slaps the desk while laughing; the mug hops, then falls).
5. Hands glued to the belly while typing. Rule: typing hands stay out of sight on the keyboard behind the desk.
6. Chairs behind characters who were standing. Rule: props must match the pose (standing desks, or seated characters with chairs).
7. The camera cut the coworker's head off during the mug fall. Rule: keep the reacting face in frame when following an object.
8. Loudness -16.4 LUFS instead of -14. Rule: add gain before the final loudness pass and check the number.
9. Reaction came on the same frame as the cause. Rule: a reaction lands 3-5 frames after the cause.

Checklist after every video: watch a 16-frame sheet; check each prop sits on the right body part; check every event has a cause; check faces stay in frame; check loudness; write the new lessons here.

## Sound effects (video 3)
- Synthesized sounds (sine and noise) sounded like test tones. Use real recorded samples for every event (boing, slap, splat, laugh, pop) and keep the synthesized soft "whoom" only.
- Peak-normalising before loudness: a short quiet scene measures about -21 LUFS even at a -1 dBFS peak, so add gain with a limiter (alimiter) before the loudness pass, and check the numbers.
- Source: Mixkit free SFX previews (Mixkit License). Keyboard taps still synthesized: no good free keyboard sample was found.

## Approved (user said "اعتمد هذا الأسلوب")
The style is locked in `STYLE_CARTOON.md`. Lessons above are the checklist for every new scene.
