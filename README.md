# 🌿 EcoPoints

**Earn rewards for everyday environmentally friendly actions.**

Hackathon demo app (POWERFEM 2026): log eco-friendly activities (biking, public transport, reusable cup, …), earn points, and redeem them for real-world perks. Client-only web app — no backend, no build step.

## Screens

- **Home** — points balance, daily streak, suggested actions, weekly goal progress
- **Log** — searchable, category-filtered list of eco actions. Logging opens a **validation** step (partner check-in, receipt upload, or honor system) and lets you ★ any action as a tracked habit
- **Rewards** — redeem points for perks; generates a coupon code
- **Impact** — actions logged, estimated CO₂ avoided, full history
- **Profile** — your **leaf rating** (0–5 leaves), validated-action stats, and weekly progress on tracked habits

## Features

- **Task validation with partnership / receipts** — when you log an action you confirm how you can prove it. A partner check-in or receipt upload marks the action ✓ *validated* and earns a **+25% points bonus**; honor-system logging still works with no bonus.
- **Task categories** — every action belongs to a category (Transport, Food, Shopping, Energy, Waste). Filter the Log screen with the category chips.
- **Search** — filter actions on the Log screen by name or category.
- **Profile leaves (like 5 stars)** — a 0–5 leaf rating on the Profile screen, grown by staying consistent (streak), validating your actions, and trying different categories.
- **Trackable habits** — star any action to track it as a weekly goal (3× / week) and watch progress bars on the Profile screen.

## Run it

Any static file server works, e.g.:

```
python -m http.server 4173
```

then open http://localhost:4173. Data is stored in `localStorage`; the **↺ demo reset** button in the header clears it.

## Notes

- CO₂ figures are rough per-action estimates for illustration, not verified measurements.
- Validation is simulated in this demo — choosing "partner check-in" or "receipt upload" marks the action validated without a real integration or file upload. Real partner APIs / receipt scanning are a planned next step.
- Reward partners are placeholders.
