# The featured image

Higgsfield, `generate_image`, model `soul_cinematic`, `aspect_ratio: "16:9"`,
`quality: "2k"`.

⚠️ **Parameters nest inside a `params` object.** `generate_image({ params: {
model, prompt, aspect_ratio, quality } })`. Flat arguments are rejected.
`soul_cinematic` ignores `batch_size` and does not accept `quality: "1080p"` —
only `1.5k` or `2k`.

## The house look

Gritty cinematic stadium realism. Night game, floodlights, rain or haze in the
beams, deep teal shadows against hot amber highlights, anamorphic flare, heavy
35mm grain. Friday Night Lights atmosphere with arcade-game intensity.

The recap's cover is read at 200px tall on a phone. It has to work as a *mood*
at that size, not as a scene you study.

## Two rules learned the hard way

**1. Silhouettes, never faces.** The original spec asked for NBA Jam-style
caricatured players with oversized heads and big grins. It rendered, three
times, as claymation clowns — uncanny and off-tone, nothing like arcade
football. Players rim-lit to silhouette inside their helmets produce the
intended energy every time and cannot fail this way. Say it explicitly:
*"rendered as a dark rim-lit SILHOUETTE, face completely hidden inside the
helmet, no facial features visible at all."*

**2. Ask for no text, then remove what would carry text.** Models render
scoreboards as garbled pseudo-digits, and a negative instruction alone does
not stop it — the first cover came back with a jumbotron full of nonsense
despite an explicit prohibition. Keep both halves:

- the prohibition: *"absolutely no text, no numbers, no digits, no letters, no
  words, no logos, no jersey numbers anywhere"*
- and the removal: *"no scoreboard, no jumbotron, no signage, no banners"*

If the week's story genuinely needs a scoreboard, blow it out into white glare
rather than trying to make it legible.

## What shipped for week 1

> Gritty cinematic low-angle shot from the turf of a night football stadium. A
> single football player in full pads and helmet powers toward the camera
> through heavy rain, rendered as a dark rim-lit SILHOUETTE with a hot amber
> edge from the floodlights directly behind — his face completely hidden inside
> the helmet, no facial features visible at all. Explosive spray of water and
> turf kicking up around his cleats. Enormous floodlight beams flare through
> the rain behind him, blowing out the top third of the frame into white glare.
> Blurred dark crowd, tiny phone flashes. Deep teal shadows, hot amber
> highlights, anamorphic lens flare, heavy 35mm film grain, dramatic
> sports-documentary atmosphere. No scoreboard, no jumbotron, no signage, no
> banners. IMPORTANT: absolutely no text, no numbers, no digits, no letters, no
> words, no logos, no jersey numbers anywhere.

Vary the subject each week so the covers do not become a series of the same
photograph — the week's defining visual, in silhouette. A lone runner. A line
of players on a sideline. A kicker's follow-through. Hands on a loose ball.

## Composition

`RecapCover` burns **"Weekly Recap"** and **"Week N"** over the bottom-left and
a ghosted jersey numeral over the bottom-right, under a dark gradient. Leave
the lower third relatively quiet and keep the subject centred or high.

## Saving it

```bash
curl -sL -o /tmp/cover.png "<rawUrl>"
sips -Z 1600 /tmp/cover.png --out /tmp/cover-1600.png
sips -s format jpeg -s formatOptions 80 /tmp/cover-1600.png --out public/recaps/week-N.jpg
```

1600px wide at quality 80 lands around 350–450KB, which is the right trade for
a hero image nobody zooms into. **Never hotlink** the generator's CloudFront
URL — those expire, and a recap published in September should still have its
cover in January.

Then set `coverImage: '/recaps/week-N.jpg'` on the recap entry. Without it the
cover falls back to the generated field treatment, which is a fine outcome and
not worth blocking a publish over.

## The author portrait

Generated once and reused: `public/authors/bunsen-blitzer.jpg`. Do not
regenerate it per week — a byline whose face changes every Tuesday is not a
byline. If it ever does need redoing, the working prompt asked for a **tight
centred head-and-shoulders** portrait with "comfortable margin on all sides,
suitable for cropping to a circle"; earlier, looser framings put the face too
low and lost the chin to the circular crop.
