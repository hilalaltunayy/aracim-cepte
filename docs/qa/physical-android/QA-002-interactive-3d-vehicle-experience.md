# QA-002 — Interactive 3D Vehicle Experience

## Goal
Replace the current placeholder-looking 3D vehicle experience with a professional, responsive and performant implementation.

## Current problems
- Only Sedan has a 3D view; other supported body types show `3D görünüm bu gövde tipi için henüz hazır değil.`
- The Sedan model looks like stacked cuboids/boxes instead of a credible vehicle.
- One-finger orbit is mostly unresponsive.
- Pinch zoom is very hard to trigger and feels almost non-touchable.

## Required changes

### Body-type coverage
Provide production-appropriate 3D coverage for supported body types. To control size/performance, use a body-family mapping instead of 14 heavy unique models where sensible:
- Sedan
- Hatchback
- SUV/Crossover
- Station Wagon
- Coupe/Sports/Roadster
- Pickup
- MPV/Minivan/Van/Minibus
- Cabrio/Campervan mapped appropriately

No normal supported type should show `3D not ready`.

### Visual quality
- Replace the crude box model.
- Use credible automotive proportions, cleaner silhouettes, proper wheel placement, better materials, lighting and camera framing.
- Prefer optimized local GLTF/GLB if suitable; otherwise improve procedural geometry substantially.
- Do not ship another cuboid placeholder.

### Gestures
- One-finger drag must reliably orbit.
- Vertical/diagonal drag must work predictably.
- Pinch must reliably zoom.
- Prevent parent scroll from stealing gestures inside the viewport.
- Add safe zoom/orbit limits.
- Camera must not flip or enter the mesh.

### Performance
- Render on demand where possible.
- Avoid continuous high-FPS idle rendering.
- Reuse/dispose graphics resources correctly.
- No progressive lag/crash after repeated entry/exit.

## Acceptance criteria
- [ ] Sedan looks credible.
- [ ] SUV/Crossover and other supported body types show an appropriate model.
- [ ] One-finger rotate works consistently.
- [ ] Pinch zoom works consistently.
- [ ] Physical Android remains smooth.
