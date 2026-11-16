---
name: h3-location-prompting
description: Write a MiniMax H3 reference-to-video prompt that uses the camera views of a 360 panorama (the "360 -> camera views + sheet" node) as the location of the video, either as one sheet image or as several separate reference images. Use when asked to prompt an H3 shot set in a panorama room, a camera pan or first-person walk in it, or when the video scrolls a flat panorama, shows a grid, duplicates furniture or invents furniture.
---

# Prompting MiniMax H3 with a panorama as the location

H3 copies its reference images; it does not understand a spherical projection. Given the raw 2:1
panorama it scrolls the flat picture sideways. Give it normal camera views instead, made by the
`360 -> camera views + sheet` node (6 views, 90 degree field of view: each view shares 30 degrees with
its neighbours).

| Setup | What goes into `MiniMaxH3ReferenceToVideo` | `ref_image_size` |
|---|---|---|
| Sheet | the `sheet` output on `ref_image_0` -> `<Picture 1>` | `max` |
| Separate views | each image of the `views` batch on its own input, in order -> `<Picture 1>` ... `<Picture N>` | `match` |

Both gave the same quality. With the sheet, `match` would shrink the whole sheet to the video's pixel
count and leave almost no detail per view. Keep the workflow's CFG 1; a higher CFG only helped with the
raw panorama. Test at 0.2 MP and 5-10 s before rendering larger.

## Before writing

Look at every view and note, left to right, what it shows and what continues into the next view. Name
each large object the same way everywhere. Count the unique objects (one sun lounger, two TV walls).

Write the six H3 sections in English: `subject_definitions`, `summary` (starting with
`[reference generation]`), `retention_analysis`, `detailed_description`, `overall_soundscape`,
`non_diegetic_music`.

## subject_definitions

Define the room as `<Subject 1>`, then explain the pictures, then describe each view.

Sheet:

> `<Subject 1>` is one single `<room>`. `<Picture 1>` is the location reference sheet: six separate
> full-frame photographs of the room stacked in one vertical column on a white page, separated by white
> margins. Each photograph is one complete frame, at the framing and scale a frame of the video has.
> The white margins and the column layout are only the page; they are not part of the room. The six
> photographs were taken from the same spot at the centre of the room with the same lens, turning the
> camera 60 degrees to the right between each one, so each photograph overlaps its neighbours, and
> View 6 overlaps View 1, closing the full circle. Reading order: View 1 is the top photograph, then
> View 2 ... and View 6 is the bottom photograph.

Separate views: same paragraph, with `<Picture 1>` to `<Picture 6>` instead of "the top photograph ...
the bottom photograph", and without the sentences about the page.

Then one line per view: `View 3 (third photograph), to the right of View 2: <contents, left to right>.`
(or `<Picture 3>, to the right of <Picture 2>: ...`). For the last one, say which part is the left side
of View 1.

If the shot is exactly a turn through the views, call the sheet "a storyboard of the shot: six
keyframes in time order from top to bottom" instead of a reference sheet.

## retention_analysis

> `<Subject 1>` (appears in [Shot 1]): partially_preserved - every object, its position, colors,
> materials and lighting are kept exactly as in the photographs, joined into one continuous room where
> each object exists only once; the layout of `<Picture 1>`, its column of photographs and its white
> margins are not kept at all.

With separate views use `fully_preserved` and drop the layout clause.

## detailed_description

- Say the video "fills the whole frame with a single view of the room".
- Anchor the shot to views with timestamps: `At 00:02.500 the whole frame matches View 4: <contents>.`
  For a full turn of T seconds over N views, view k comes at (k - 1) x T / N and View 1 again at T.
- State the camera rules: same field of view throughout, no zoom, no pull back.
- End with the exclusions. Sheet: `The video never shows the reference sheet itself: no column, no
  panels, no white borders or margins, no split screen.` Both setups: `Objects seen in two neighbouring
  views are the same single object. No cuts, no cross-fades, no repeated furniture, no text.`

## Shots that work

**Pan on the spot** - start on one view, name the views crossed in order, end on a named view.

**Walk or first-person shot** - start on a view the sheet contains, then describe the path through the
room and what grows or leaves the frame. To keep a first-person view, never write "a woman walks":
H3 then films her from behind. Either describe only "the camera" and forbid any person on screen, or
allow only "her own hands, lap and knees at the bottom of the frame" and state "she is never seen from
the outside, the camera never detaches from her eyes". Add "the natural field of view of human sight,
not a wide-angle or action-camera lens, the horizon kept level" or the result looks like a GoPro.
Keep to two or three actions in 10 seconds.

## Limits

- The shot must start where the views were taken, near the centre of the room. A start somewhere else
  (seated on a far sofa) makes H3 build new furniture around the camera, whatever the prompt says. Use
  a panorama taken from that spot instead.
- Keep the sheet as one column. In a grid H3 stitches side-by-side views into one wide shot: duplicated
  objects with overlapping views, an ultra-wide bent view without overlap.
- A bad left/right seam in the panorama shows in the view that looks backwards (View 4 of 6). Fix the
  panorama, not the prompt.
- Detail per view is the panorama width x field of view / 360: a 2000 px panorama gives 500 px views.

## Example (sheet, 10 s pan, dark seaside living room)

Only the parts that change from the templates above:

- View lines: `View 1 (first photograph, top) faces the main lounge: two dark sectional sofas around a
  low coffee table on a rug, tall sea windows on the left, a black marble TV wall on the right.` ...
  `View 6 (sixth photograph, bottom), to the right of View 5: the marble TV wall on the left, a wooden
  pillar, a tall vase, then the sea windows and the sofas of the main lounge, which are the left side
  of View 1.`
- summary: `[reference generation] A 10-second single continuous full-frame shot filmed from the centre
  of <Subject 1>, in which the camera pans to the right through one full turn, passing in order through
  View 1 to View 6 of <Picture 1> and back to View 1.`
- Shot: `The camera stands at eye level in the centre of the room and pans to the right on the spot at
  one constant speed, turning exactly 360 degrees in 10 seconds. At 00:00.000 the whole frame matches
  View 1 ... At 00:01.700 ... View 2 ... At 00:10.000 the whole frame matches View 1 again. Between
  these moments the view slides smoothly from one photograph to the next through their shared
  overlapping part, like a real camera turning.`
