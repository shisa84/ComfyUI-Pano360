# ComfyUI-Pano360

ComfyUI nodes and workflows for 360° equirectangular panoramas (2:1): make one from a single photo, repair its
left/right seam, look around in it, and use it as the location of a MiniMax H3 video.

## Installation

```
cd ComfyUI/custom_nodes
git clone https://github.com/shisa84/ComfyUI-Pano360
```

Restart ComfyUI. The nodes need no extra Python package. The workflows use other custom nodes and models:
each workflow has a note listing them with download links.

## Nodes

All nodes are in the `image/360` category.

### Photo -> 360 canvas (perspective warp) — `PerspToERPCanvas`

Projects a normal photo onto a 2:1 equirectangular canvas, at the place and size a camera with the given field of
view would cover. Everything else is pure green (#00FF00), ready for a 360 outpaint LoRA.

| Input | Default | |
|---|---|---|
| `image` | | the photo |
| `width`, `height` | 1440 × 720 | canvas size (keep 2:1) |
| `h_fov_deg` | 90 | horizontal field of view of the photo: ~70 phone, ~90 interior shot, ~110 ultra-wide. Larger = the photo covers more of the panorama |
| `pitch_deg` | 0 | camera tilt: positive if the photo looks up |

| Output | |
|---|---|
| `canvas` | the photo on the green canvas |
| `photo_mask` | white where the photo is |

### 360 Roll 180 (+ green back band) — `ERPRoll`

Turns a panorama by 180°: what was behind the camera (the left/right seam) moves to the middle. Applying it twice
gives the original back.

| Input | Default | |
|---|---|---|
| `image` | | a 2:1 panorama |
| `green_band` | 0 | width (fraction of the image) of a green band painted in the middle after the turn, for a LoRA to regenerate the area behind the camera. 0 = only turn |

Output: the turned image.

### 360 -> camera views + sheet — `ERPToViews`

Normal camera views taken from the centre of a panorama, turning right from one view to the next.

| Input | Default | |
|---|---|---|
| `image` | | a 2:1 panorama |
| `views` | 6 | number of views around the full turn (360 / views degrees apart) |
| `width`, `height` | 1024 × 576 | size of each view |
| `h_fov_deg` | 90 | field of view of each view; wider than 360 / views makes neighbours overlap |
| `first_yaw_deg` | 0 | direction of view 1: 0 = centre of the panorama, positive = further right |
| `margin` | 24 | white gap around and between the views on the sheet |

| Output | |
|---|---|
| `views` | batch, one image per view |
| `sheet` | the views stacked in one column on a white page |

### Load 360 Image (viewer) — `Load360Image`

Loads a 2:1 panorama and shows it as a 360 view in the node: drag to turn, wheel to zoom. Output: the panorama.

## Workflows

In `workflows/`. Open one, load your image, fill the fields whose title starts with **EDIT ME**, and run.

| Workflow | What it does |
|---|---|
| `photo_to_pano360_klein` | photo → 360 panorama with FLUX.2 Klein 9B, two passes (the second regenerates the area behind the camera and the seam). Fast |
| `photo_to_pano360_krea2` | same with Krea 2; keeps the pixels of the photo |
| `photo_to_pano360_video_h3` | photo → 360 video of the place with MiniMax H3 and the 360 equirect LoRA |
| `pano360_seam_fix_klein` | repairs the left/right seam of any 2:1 panorama with Klein; the rest of the image is kept |
| `pano360_seam_fix_krea2` | same with Krea 2 |
| `pano360_to_views_sheet` | panorama → camera views and a single-column sheet |
| `pano360_to_location_video_h3` | MiniMax H3 video set in a panorama room, the sheet of views being the location reference |

`workflows/experimental/` holds workflows whose results are less reliable: Qwen-Image 2.1, MiniMax H3 image and
P-H3 image (the last two end with the Klein seam repair).

Each workflow saves its result in `ComfyUI/output/`; the two-pass photo → panorama image workflows also save the
first pass.

## Writing the prompts

`skills/` contains two guides, written as Claude Code skills but readable as plain text:

- `pano360-prompting`: how to fill the EDIT ME fields of the photo → panorama workflows (Scene, Style only, Back).
- `h3-location-prompting`: how to prompt a MiniMax H3 shot that uses the camera views of a panorama as its location.
