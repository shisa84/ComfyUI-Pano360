---
name: pano360-prompting
description: Write the text fields of the ComfyUI-PerspToERP 360 panorama workflows (Krea 2, FLUX.2 Klein 9B, Qwen-Image 2.1) from a single interior photo. Use when asked to prompt, fill in or fix the "EDIT ME" fields of equirectangular_krea2, equirectangular_klein_rapide or equirectangular_qwen21, or when a generated panorama shows duplicated furniture, odd objects or a bad area behind the camera.
---

# Prompting the 360 panorama workflows

Each workflow turns one photo into a 2:1 equirectangular panorama. The LoRA trigger sentence is already
in the workflow: write only the "EDIT ME" fields, in English, as plain sentences.

Look at the photo first and note: the room type, the materials and colours (floor, walls, ceiling), the
light, and the large unique objects (bed, dining table, TV, sofa group, fireplace, shower).

| Workflow | Model + LoRA | Fields to write |
|---|---|---|
| `equirectangular_krea2` | Krea 2 Turbo + `krea2_oedit_360_erp_outpaint_lora_v1` | Scene, Style only, Back |
| `equirectangular_klein_rapide` | FLUX.2 Klein 9B + `flux-2-klein-9B-360-erp-outpaint-lora_V1` | Scene |
| `equirectangular_qwen21` | Qwen-Image 2.1 + `pano360_qwen21_edit_v1` | Scene |

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

## FLUX.2 Klein 9B (one pass)

One field, **Scene**, written exactly like the Krea 2 Scene (same four sentences). The negative prompt
is fixed in the workflow.

Klein did not duplicate furniture in testing, but it leaves the invented walls bare and redraws the
photo instead of keeping it pixel for pixel. If the room should not look empty, name one or two large
elements in sentence 4 (`Behind the camera: a white dining area with a round glass table and four chairs.`).

## Qwen-Image 2.1 (one pass, photo given directly)

One field, **Scene**. The workflow prepends
`Transform this set of images into an equirectangular 360 panorama. Scene:`.

Write a single sentence of about 15 to 35 words: the place and its main features first, then the
lighting, optionally the mood. Describe the whole surrounding space, not only what the photo shows.
Do not use `<image1>` references or edit instructions ("keep", "fill", "extend").

Example: `A dark luxury dining room with black marble floor, rough slate stone walls, bronze panels and a walnut ceiling, a single dining table and a bronze door behind the viewer, lit by warm amber lights.`

This is the weakest of the three: invented areas come out dark, soft or with odd panels. Removing the
door, asking for even lighting, and rendering at 2048x1024 were tried and did not fix it, so do not
spend prompt iterations on those; switch to Krea 2 or Klein instead.

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
| Walls too bare (Klein) | Name one or two large elements behind the camera |
