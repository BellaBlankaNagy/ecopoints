# 🌿 EcoPoints

**Earn rewards for everyday environmentally friendly actions.**

Hackathon demo app (POWERFEM 2026): log eco-friendly activities (biking, public transport, reusable cup, …), earn points, and redeem them for real-world perks. Client-only web app — no backend, no build step.

## Screens

- **Home** — points balance, daily streak, suggested actions, weekly goal progress
- **Log** — one-tap logging of 8 eco actions, each with points and an estimated CO₂ value
- **Rewards** — redeem points for perks; generates a coupon code
- **Impact** — actions logged, estimated CO₂ avoided, full history

## Run it

Any static file server works, e.g.:

```
python -m http.server 4173
```

then open http://localhost:4173. Data is stored in `localStorage`; the **↺ demo reset** button in the header clears it.

## Notes

- CO₂ figures are rough per-action estimates for illustration, not verified measurements.
- Activity logging is honor-system in this demo; verification (e.g. photo or transit-pass integration) is a planned next step.
- Reward partners are placeholders.
