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
  lifted to white and blended away, so only the figure shows. **Head lines** (8, 9 or 10 heads) split the figure from crown to
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

Photos are processed on the device and never uploaded. Everything is in `index.html`; no build step.
Needs https for camera access (GitHub Pages provides it).
