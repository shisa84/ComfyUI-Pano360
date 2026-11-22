---
name: pano360-prompting
description: Write the text fields of the ComfyUI-Pano360 360 panorama workflows (Krea 2, FLUX.2 Klein 9B, Qwen-Image 2.1) from a single interior photo. Use when asked to prompt, fill in or fix the "EDIT ME" fields of photo_to_pano360_krea2, photo_to_pano360_klein or photo_to_pano360_qwen21, or when a generated panorama shows duplicated furniture, odd objects or a bad area behind the camera.
---

# Prompting the 360 panorama workflows

Each workflow turns one photo into a 2:1 equirectangular panorama. The LoRA trigger sentence is already
in the workflow: write only the "EDIT ME" fields, in English, as plain sentences.

Look at the photo first and note: the room type, the materials and colours (floor, walls, ceiling), the
light, and the large unique objects (bed, dining table, TV, sofa group, fireplace, shower).

| Workflow | Model + LoRA | Fields to write |
|---|---|---|
| `photo_to_pano360_krea2` | Krea 2 Turbo + `krea2_oedit_360_erp_outpaint_lora_v1` | Scene, Style only, Back |
| `photo_to_pano360_klein` | FLUX.2 Klein 9B + `flux-2-klein-9B-360-erp-outpaint-lora_V1` | Scene, Style only, Back |
| `experimental/photo_to_pano360_qwen21` | Qwen-Image 2.1 + `pano360_qwen21_edit_v1` | Scene, Style only, Back |

All three run a second pass: the panorama is turned by 180 degrees, the middle third (what is behind the
camera, around the left/right seam) is regenerated from Style only + Back, then turned back.

## Krea 2 (two passes)

These LoRAs repeat what they see in the photo. Pass 1 tends to put a copy of the main furniture behind
the camera; pass 2 regenerates that back area. The three fields have different jobs.

**Scene** (pass 1) — four sentences, in this order:

1. Style: room type, materials, colours, light.
2. Unique objects: `Only one <object> and only one <object> in the whole room, the ones in the image.`
3. Sides: `On both sides of the image the <material> walls simply continue, plain and empty.`
4. Back: `Behind the camera: a <material> wall with one <door>.`

**Style only** (pass 2) — one sentence with materials, colours and light, and nothing else.
Do not name furniture, and do not name the room by its furniture: write "interior" or "interior hall",
not "dining room" or "bedroom". Naming an object here brings the duplicate back behind the camera.

**Back** (pass 2) — what replaces the green band:
`The green area is a plain <material> wall with one <door> and empty <floor> in front of it.`
Ask for one door at most; the area may already contain one.

Example (dark dining room; this set removed the second table and second fireplace):

- Scene: `A dark luxury dining room, black marble floor, rough slate stone, bronze panels, walnut ceiling, warm amber lighting. Only one dining table and only one fireplace in the whole room, the ones in the image. On both sides of the image the walls simply continue with the same materials, plain and empty. Behind the camera: a long black marble wall with one bronze door.`
- Style only: `A dark luxury interior hall, black marble floor, rough slate stone, bronze panels, walnut ceiling, warm amber lighting.`
- Back: `The green area is a plain black marble wall with one bronze door and empty black marble floor in front of it.`

Known limits, not fixed by prompting so far:

- A duplicate right next to the photo (second bed, second TV wall) comes from pass 1 and is outside the
  area pass 2 regenerates. It is most frequent with portrait photos.
- Decoration words become objects: "cherry blossom decorations" produced a full tree. Leave small
  decorations out of every field.
- Saying "no table" did not prevent a table. Describe what should be there instead.

## FLUX.2 Klein 9B (two passes)

The three fields are written exactly like the Krea 2 ones (Scene = same four sentences; Style only;
Back starting with `The green area is ...`). The negative prompt is fixed in the workflow.

Klein did not duplicate furniture in testing, but it leaves the invented walls bare and redraws the
photo instead of keeping it pixel for pixel. If the room should not look empty, name one or two large
elements in Back, but only elements the photo does not already show: a dining area in Back next to the
dining table of the photo gave a second dining area.

Put the door only in Back. With Klein, sentence 4 of Scene must stay `Behind the camera: a plain <material> wall.`:
a door there is drawn in pass 1 next to the photo, and pass 2 then adds the Back door, giving two or three
doors. Also leave out of Scene and Style any material that only covers one wall of the photo (a wood panel
wall behind a bed): Klein spreads it as a strip inside the other walls. Name only the material that should
continue all around, and write `the <material> walls simply continue unbroken, plain and empty`.
Tested on a dark bedroom (stone walls, walnut wall behind the bed): door in Scene + walnut in Style gave two
doors and a walnut strip in the stone; door only in Back and no walnut gave one door behind the camera.

## Qwen-Image 2.1 (two passes, photo given directly) - experimental

Results are often incoherent: pass 1 invents volumes that make no sense around the photo (glass
cylinders, stone pillars, doors stuck to columns), and no prompt fixed it. Pass 2 only repairs the seam
and the area behind the camera. When the user wants a usable panorama, recommend Klein or Krea 2.

**Scene** (pass 1). The workflow prepends
`Transform this set of images into an equirectangular 360 panorama. Scene:`.

Write a single sentence of about 15 to 35 words: the place and its main features first, then the
lighting, optionally the mood. Describe the whole surrounding space, not only what the photo shows.
Do not use `<image1>` references or edit instructions ("keep", "fill", "extend").

Example: `A dark luxury dining room with black marble floor, rough slate stone walls, bronze panels and a walnut ceiling, a single dining table and a bronze door behind the viewer, lit by warm amber lights.`

**Style only** and **Back** (pass 2): written like the Krea 2 ones. Back starts with `The green area is ...`:
pass 2 uses Qwen-Image 2.1 without the 360 LoRA as an editor that fills the green band, and the workflow
wraps the two fields in "Fill the green area ..." and "Match the lighting ...".

Pass 2 tends to repeat a striking material of pass 1 (a rough stone wall came back as a stone pillar in
the band). If that happens, name a plain material in Back or change the pass 2 seed.

This is the weakest of the three for pass 1: invented areas come out dark, soft or with odd panels.
Removing the door, asking for even lighting, and rendering at 2048x1024 were tried and did not fix it, so
do not spend prompt iterations on those; switch to Krea 2 or Klein instead.

## Field of view (`h_fov_deg`, Krea 2 and Klein)

Set it with the prompt: 90 for a normal interior photo, 110 for a wide-angle one, 65 for a portrait
photo. A larger value makes the photo cover more of the panorama.

## When a result is wrong

| Symptom | Change |
|---|---|
| Copy of the main furniture behind the camera (Krea 2) | Remove every furniture and room-type word from Style only and Back |
| Two doors behind the camera (Krea 2) | Drop the door from Back, or from sentence 4 of Scene |
| Duplicate next to the photo | Add the object to the "Only one ..." sentence; if it stays, try another seed or Klein |
| Unwanted object (tree, statue, rug) | Find the word that names or suggests it and delete it |
| Walls too bare (Klein) | Name one or two large elements in Back |
| Left/right seam still visible | Check that the pass 2 group is not bypassed; try another pass 2 seed |
