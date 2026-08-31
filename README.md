# DEMOWALL

A curated wall of technology demos. Short clips of real things working, captured at
conferences, meetups and in the wild, each with a one-line hook, a longer write-up and
field notes on why the demo works. Clips are hosted unlisted on the DevsCentral YouTube
channel and embedded here.

Demo Wall is an independent project. Recorded and curated by tech demo enthusiasts.

## How it works

- **Public wall** (`index.html`) is a collage of demo cards (masonry, mixed aspect
  ratios, category filters) with a featured spotlight.
- **Demo page** (`demo.html?id=<id>`) embeds the unlisted YouTube video with a
  click-to-play poster, the full description, field notes, metadata and share links
  (LinkedIn, X, copy link, open on YouTube).
- **Admin panel** (`admin.html`) is password-protected and works in desktop and mobile
  browsers. Add a YouTube link, title, tagline, description, notes, attribution,
  thumbnail (YouTube or a custom upload), publish/feature and reorder demos.
- **Data** lives in [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs),
  read and written through two serverless functions. No database to manage, changes
  appear on the wall immediately.

```
demo-wall/
  index.html              public wall
  demo.html               single demo page
  admin.html              password-protected panel
  about.html              404.html  robots.txt
  assets/                 css, js, fonts, favicon (all self-hosted)
  netlify/
    functions/
      _lib.js             shared store + auth + seed data
      demos.js            public API (list, single, custom thumbnails)
      admin.js            protected API (login, CRUD, upload)
  netlify.toml            redirects, headers, publish config
```

## Local development

```bash
npm install
cp .env.example .env          # set DEMO_WALL_PASSWORD to something long
npm run dev                   # starts netlify dev at http://localhost:8888
```

The wall starts seeded with a few placeholder demos so it is never empty. Delete or
replace them from the admin panel at `/admin.html`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEMO_WALL_PASSWORD` | yes | Password for the `/admin` panel |

On Netlify, set it under **Site settings > Environment variables**. There is no other
secrets or configuration.

## Deploy to Netlify

The site has no build step; static files and functions are deployed as-is.

**Option A, Git (recommended):**

1. Push this repo to GitHub.
2. Netlify > Add new site > Import from Git.
3. Build command: leave empty. Publish directory: `.`.
4. Add the `DEMO_WALL_PASSWORD` environment variable.
5. Deploy.

**Option B, drag and drop:**

1. `netlify deploy` from the project root (requires Netlify CLI login) or drag the
   folder onto app.netlify.com/drop.
2. Add `DEMO_WALL_PASSWORD` in site settings.

After deploying, open `/admin.html`, sign in, and replace the seed demos with real ones.

## Using the admin panel

1. Open `/admin.html` and sign in with `DEMO_WALL_PASSWORD`.
2. **New demo**: title, company, event, one-line hook, description, notes, and the
   unlisted YouTube link. Paste any YouTube URL; the video id and thumbnail resolve
   automatically.
3. **Thumbnail**: uses the YouTube thumbnail by default. Upload a custom image (PNG,
   JPEG or WebP, under 4 MB) to override it.
4. **Placement**: toggle published/featured, and use the up/down arrows or the order
   field to arrange the wall.
5. Changes save to Netlify Blobs and appear on the public wall immediately.

## API

- `GET /api/demos` - published demos, sorted
- `GET /api/demos?id=<id>` - a single demo
- `GET /api/demos?thumb=<key>` - a custom thumbnail
- `POST /api/admin?action=login|list|save|delete|upload` - admin operations (bearer token required)

## Notes

- Fonts (Archivo, Schibsted Grotesk, Phosphor icons) are self-hosted; no CDN
  dependencies and no monospace "developer tool" styling.
- YouTube thumbnails load from `i.ytimg.com`; videos embed from
  `youtube-nocookie.com` for privacy-friendly playback.
- Unlisted videos embed fine. Private videos will not play.