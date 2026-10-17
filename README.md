# Wordling Island

Original English vocabulary monster battle game for Grade 1 CET/FET, hosted on native GitHub Pages.

Game: https://bbcode1111.github.io/word-monster-island/

## Play

Create a player code and password for cloud saves and the shared leaderboard, or choose a local guest. Pick CET Weeks, FET Lessons, a whole course, or both. Listen to natural American English and choose one of four words or arrange letter tiles. Unlimited and 15/25/40-second modes are available.

Choose Attack, Special, or Catch before answering. Correct words power the move; wrong words trigger a counterattack. Weaken the enemy to 35% HP to try a catch. Each mission has five ordinary encounters and a guardian. Caught monsters can immediately join battle. Build a team of up to three; the warehouse shows individual values, quality, level, XP, HP, MP, Attack, Defense, Special, and abilities. Owned species roam in the Team Park.

## 100 original species

32 Common, 30 Uncommon, 22 Rare, 12 Epic, and 4 Legendary. Uncommon unlocks after 2 cleared missions; Rare 8; Epic 30; Legendary 80. Base rarity weights are 75.85 / 18 / 5 / 1 / 0.15, normalized over unlocked tiers. Spell It increases Rare+ weights by 15%; Mixed by 7.5%. Unlocks never guarantee an encounter. Catch rates per correct weakened-target attempt are 100% / 90% / 60% / 35% / 15%. A monster can escape after three failed catches.

## Course data

231 distinct spellings, 235 word/POS cards, 320 course occurrences, 33 original course groups: 15 CET Week groups and 18 FET Lessons. `dist/data/vocabulary.json` is the website data; `data/vocabulary.sqlite3` and JSON preserve structured backups. Source URLs remain in the data. Supplemental Chinese meanings are learning aids.

## Maintain

- Run `npm start` and open http://localhost:4187.
- Run `npm test` for course, audio, capture, rarity, stats, battle, and migration checks.
- Website: `dist/`. Course selection and screens: `dist/app.js`; shared rules: `dist/rpg.mjs`; sound: `dist/audio.mjs`; animations: `dist/battle.mjs`; park: `dist/park.mjs`.
- Artwork: `dist/assets/monsters-v3.png` plus six `dex-atlas-*.png` sheets, mapped by `dist/data/monsters.json`.
- Backend setup and updates: [backend/README.md](backend/README.md).
- Push to `main` to publish via `.github/workflows/pages.yml`. Enable GitHub Actions as the Pages source in repository settings.

The default music volume is 12%; music is silent during speech and returns softly. All 231 words have US voice recordings. Game instructions use English, with Chinese vocabulary meanings as support.

Only website source, assets, game data, deployment code, and tests belong in this repository. Keep credentials, local authoring tools, design prompts, SKILL.md, and discussion notes outside it.
