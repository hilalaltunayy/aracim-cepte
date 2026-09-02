# REV-007 — Professional 3D Vehicles + Photo Persistence

## 3D visual problem
Current 3D Sedan still looks like primitive block geometry.
Production quality is unacceptable.

Need credible visuals for all supported body types:
Sedan, Hatchback, Crossover, SUV, Station Wagon, Coupe, Cabrio, Roadster, Pickup, MPV/Minivan, Van, Sports Car, Campervan, Minibus.

Internal body-family mapping is okay, but each visible result must fit its category.

Prefer optimized local GLB/GLTF assets if practical/licensable/size-safe.
If procedural, significantly improve mesh.

Need:
- smooth silhouette
- believable automotive proportions
- proper wheels
- clean materials/windows/lights
- selected vehicle color
- professional neutral lighting/floor
- no toy/block appearance

## Gestures
Physical bug:
- one-finger drag unreliable
- pinch unreliable
- 360 inspection difficult

Required:
- reliable horizontal/vertical orbit
- near-360 inspection
- reliable pinch zoom
- scroll arbitration
- safe zoom limits
- no mesh penetration/upside-down camera
- normal touch immediately responds

Performance:
demand rendering, optimized polys, no idle high-FPS loop, correct resource disposal.

## Vehicle photo persistence
Physical bug:
Free user uploaded 1 allowed vehicle photo, it appeared in-session, but after logout/relogin the photo disappeared and generic icon returned.

Trace:
- upload
- `vehicle_photos`
- primary flag
- Storage object
- signed URL expiry/regeneration
- session hydration/query
- cache/local state

Desired:
private stored photo persists across logout/login/app restart.
Generic icon only if no saved photo.

Security:
keep private Storage/RLS/owner isolation.
