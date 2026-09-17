# BC Dining

A installable web app (PWA) showing live hours for Boston College dining halls and cafés — Newton excluded, built from the posted schedule for the week of September 13, 2026.

No build step, no dependencies. It's plain HTML/CSS/JS.

## Run it locally

```
cd app
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Get it onto your phone, without the App Store

A PWA needs to be served over HTTPS to install properly (plain `file://` won't let iOS/Android add it as a real home-screen app). Easiest free options, using this repo:

1. **GitHub Pages** — push this repo (or just the `app/` folder) to GitHub, enable Pages on the branch, and it'll get a free `https://<you>.github.io/...` URL.
2. **Netlify / Vercel** — drag-and-drop the `app` folder onto Netlify's "Deploy" page (netlify.com/drop), or `vercel deploy` if you have their CLI. Either gives you a free HTTPS URL in about a minute, no account setup beyond signing in.

Once it's live at an HTTPS URL, on your phone:

- **iPhone (Safari):** open the link → Share icon → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app** (or **Add to Home screen**).

It'll launch full-screen with its own icon, no browser chrome — same as a real app, just never submitted anywhere.

## Updating the hours

All schedule data lives in `data.js`. Each location is one line: id, display name, sub-label, group (`hall`/`cafe`), and an array of 7 day schedules (Sun–Sat), each a list of `{ label, start, end }` periods. Times are `"H:MM"` 24-hour strings.
