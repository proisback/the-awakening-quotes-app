# Hitaarth — Daily Wisdom (PWA)

A lightweight, installable quotes web app. Pure HTML/CSS/JS, no build step.

## Edit content
All quotes live in `quotes.json`. Each item:
`{ "id", "text", "author", "source", "lesson", "category" }`

## Deploy
Hosted on Netlify, auto-deploys on every push to `main`.
Static site: no build command, publish directory is the repo root.

## Local preview (Windows)
`python -m http.server 8000` then open http://localhost:8000
