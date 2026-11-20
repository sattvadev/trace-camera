# NUMOTIFSTUDIO - Trace

NU Motif Studio's camera tracing app, styled with the NU Motif design tokens (Oxblood: warm paper, wine accent, DM Sans).
Brand assets are in `assets/` (white wordmark, app icons).

A browser tool for tracing a picture onto paper. The phone's camera shows your paper live,
and your chosen photo floats see-through on top, so you can draw while watching your pencil on screen.

- Modes: the photo itself, **Outlines** (sketch strokes in the style of Coherent Line Drawing / flow-based DoG with
  XDoG-style soft thresholding: long, continuous lines that follow the form, heavier on strong edges, tapering at the ends),
  or **Values**: a breakdown strip of every value from lightest (1, paper) to darkest,
  shown as a breakdown: the whole picture in greys with the current step filled in a bright colour (coral, blue, green
  or yellow). With Show earlier steps on, a step fills the area painted at that step (that value and darker); off fills exactly that value; All shows the greys.
  Shapes have smooth, anti-aliased edges with a clean contour stroke. Numbered grey swatches pick the step, lightest (1) to darkest.
- Values are found with an edge-preserving filter (keeps edges crisp, no halo rings), grouped by the photo's own tones,
  then cleaned of slivers and specks so each value is a solid stencil. A second 'details' pass from a lightly smoothed
  photo keeps small features the broad shapes would flatten: eye openings, nostrils, ear holes, the lip line, catchlights.
  A Simplify slider trades detail for bolder shapes.
- **AI sketch** (optional, in Outlines): the "OpenSketch" model from *Informative Drawings* by Caroline Chan, Frédo Durand
  and Phillip Isola (CVPR 2022, MIT License, https://github.com/carolineec/informative-drawings), run on the phone with
  onnxruntime-web: WebGPU where available, else WebAssembly. The 17 MB model downloads once and is kept on the device.
  See `models/README.md` and `models/LICENSE-informative-drawings`.
- Drawing screen: a top bar (Home, undo, redo, Help, Tools) and, at the bottom, a **step strip** plus Move, Hide and Opacity.
  The step strip shows in Values and AI outlines: tap any number (1 lightest first) to jump straight to that step, or All.
  Picture / Grid choices appear only while Move is on and the grid is shown.
- **Tools** opens a short panel under the top bar (View, Grid, Strobe, Camera, Light) with the drawing still visible.
  The button turns into **Done**; tapping the picture or the phone's back gesture also closes it. Rarely used options
  (line style, show earlier steps, fit, mirror, new photo) sit under More options.
- **Home** asks before leaving the drawing. The browser back gesture closes Tools or Help first, and asks before leaving.
- With **Move** on, drag, pinch and twist the picture (or drag the grid). Magnifying only works with the picture locked:
  turn Move off, then pinch to zoom the camera view with the picture on it, so the picture stays on the paper.
  A Locked badge shows the zoom; tap it to unlock. Double-tap to zoom back out. The browser's own page zoom is blocked.
- AI sketch comes in three layers, traced in passes: 1 main lines, 2 secondary lines, 3 light lines and texture
  (strokes grouped by how firmly they are drawn). Show earlier steps (on by default) builds the steps up; off shows one step alone.
- **Grid on the photo** (default): square cells fixed to the picture, with its outline and optional diagonals. It moves,
  scales, turns and mirrors with the photo, so proportions and perspective stay lined up while you place it. Choose how many
  squares go across; Hide leaves the grid showing. A screen grid (fixed to the screen, draggable) is still available.
- Strobe blinks the picture to compare with your drawing; the grid has adjustable colour and opacity; Camera can pause or switch cameras; Flashlight turns on the torch where the browser allows it.
- Opacity, mirror and line colour; the screen is kept awake.

## For fashion designers (release 1)

- **Base layer:** load your own croquis or flat block (front and back) under everything, fixed to the paper. Scanned paper is
  lifted to white and turned see-through (alpha from darkness, colour un-mixed from white), so only the figure shows. **Head lines** (8, 9 or 10 heads) split the figure from crown to
  soles and are numbered down the side. Move it with **Move → Base**; undo/redo works per layer.
- **Flats:** a centre-front line you can place (or line up with the base), and a **live mirror**: draw one half and your own
  pencil lines appear flipped on the other side, extracted from the camera 15 times a second (paper and desk are filtered out).
  **Front/Back** switches the base; with no back base the front shows faintly. **Ghost** keeps a faint wine copy of a
  finished sheet so the next look in a line-up is drawn to match.
- **Boards:** save the base (front and back), its placement, head lines, centre line and grid under a name, and reuse it for
  every sheet of a collection. Stored on the phone (IndexedDB).
- **Autosave:** the photo, bases, ghost and placements are saved as you work; the start screen offers *Continue where you left off*.
- **Export:** capture the sheet, the paper's corners are found automatically (Otsu threshold, largest bright region) and can be
  dragged; the sheet is straightened with a perspective (homography) warp and cleaned to lines by dividing out the paper's own
  shading. Save a transparent PNG, an SVG (vectorised with imagetracerjs 1.2.6, public domain, loaded from jsDelivr on demand),
  the straightened photo as JPG, or use the lines as your next base. Files go through the share sheet on iPhone.

## For fashion designers (release 2: on-phone AI)

Runs Google MediaPipe Tasks for Web 1.2.2 (Apache-2.0, from jsDelivr) with model files from Google's model storage, each
downloaded on first use and kept in Cache Storage. Nothing leaves the phone.

- **Show → Clothes / Person** (View tab): the Selfie Multiclass segmenter (16 MB) masks the photo to the garments or the person;
  the mask applies to every view (photo, values, AI outlines; slightly grown for outlines so the silhouette line survives).
- **Show → Tap pieces:** tap a garment to pick only it. Magic Touch (6 MB) finds the tapped object; inside the clothes mask a
  competitive watershed splits garments: the tap seeds the piece, clothes in a clearly different colour, or on the other side of
  the hips (from the pose) in a different colour, seed the competition, and both flood outward by edge strength, so shading and
  folds stay inside one garment. Tap a picked piece to remove it.
- **Croquis from photo pose** (Base tab): Pose Landmarker full (9 MB) reads 33 landmarks; a 9-head fashion figure is rebuilt with
  the photo's joint directions and fashion lengths (about shoulders 1.4, waist 2.9, hip 3.9, knee 5.9, ankle 8.3, toes 8.8 heads from
  the crown), foreshortened only by how much each limb points at the camera (3D world landmarks), drawn with continuous contours,
  centre-front, bust/waist/hip marks and a balance line, then placed over the photo by its hips and torso.
- **Face guide:** the classic proportions inside the first head (hairline, brow, eye line half way, nose at three quarters,
  mouth), following the head's tilt.
- **Check symmetry** (Flats tab): compares the two halves of the sheet across the centre line; green matches (within about
  1.5 mm), red is missing on the checked side, orange has no partner; gives a percentage.
- **Time-lapse** (Export tab): a camera frame every 1, 2 or 5 seconds, played back at 30 frames a second (at least 3 s) and
  recorded with MediaRecorder to MP4 (WebM where MP4 is not available); saved through the share sheet.

## For fashion designers (release 3)

- **Grey markers** (View → Values → Markers): each value step is labelled with a marker number on the usual 0 (light) to
  10 (dark) grey scale: cool C, neutral N, warm W, or % greys. The number comes from that step's real average tone in the
  photo, not its position in the strip. Shown on the step buttons and in the step label.
- **Sheen: leave white:** small, very bright, colourless spots well above their surroundings (shine on satin, leather,
  sequins, glass) are hatched in blue on the values view, so the paper is kept white there.
- **Lock to paper** (Camera tab): the sheet's corners are found about 7 times a second (Otsu threshold, largest bright
  region, extreme corners), smoothed, and a perspective (homography) transform keeps the photo, base, head lines, grid on
  the photo and ghost registered to the sheet when the phone or the paper moves. Holds still if the sheet is lost and says
  so; turns off on rotation. Taps (Pick) are mapped back through it.

Photos are processed on the device and never uploaded. Everything is in `index.html`; no build step.
Needs https for camera access (GitHub Pages provides it).
