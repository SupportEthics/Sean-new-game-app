# Soulforge Knight — Social Media Starter Pack

Everything to launch @soulforgeknight across TikTok / Instagram / YouTube /
X. Primary platform: **TikTok** (dev-log + gameplay clips); cross-post the
same vertical videos to YouTube Shorts and Instagram Reels.

## Handles & assets

- Handle everywhere: **@soulforgeknight** (fallbacks: @soulforgeknightgame,
  @playsoulforge)
- Avatar (all platforms): `resources/icon-1024.png`
- X/Twitter header: `screenshots/social/x-header-1500x500.png`
- YouTube channel art: `screenshots/social/youtube-banner-2560x1440.png`
- Instagram/TikTok have no banner — avatar + bio only.
- Link in bio: the App Store link now; swap to a linktr.ee (or the Netlify
  site) once Android is live so one link serves both stores.

## Bios (copy-paste)

**TikTok / Instagram (short):**
> ⚔️ Solo-dev dark idle RPG. Merge swords. Hatch pets. Slay the horde.
> 📱 Out now on iPhone — Android soon!

**YouTube (about):**
> Soulforge Knight is a dark-fantasy idle RPG made by one person. Merge
> swords into legendary steel, hatch pets, raid dungeons and build your
> town — even while you sleep. Dev-logs, update news and gameplay here.
> Download on the App Store; Android coming soon.

**X/Twitter:**
> ⚔️ A dark idle RPG by a solo dev. Merge swords, hatch pets, slay the
> horde — even offline. Out on iOS, Android soon. Built in public.

## Voice rules

- First person, honest, slightly self-deprecating. "I" not "we".
- Show numbers (downloads, revenue, rejections) — transparency IS the
  content for indie dev-logs.
- Every video: hook in the first line ON SCREEN within 1 second.
- 15–30 seconds. Vertical. Big captions (viewers watch muted).
- Reply to every comment in week one — the algorithm rewards it and the
  commenters become your community.

## Launch-fortnight content calendar (10 posts)

| # | Post | Hook (first line on screen) |
|---|------|------------------------------|
| 1 | Dev-log intro: face or voiceover optional, gameplay behind | "I spent months building a game where you never stop fighting — even when you sleep" |
| 2 | The Apple saga | "Apple rejected my game twice in 48 hours. Here's what they flagged." |
| 3 | Pure gameplay: merge chain up to a legendary sword, satisfying sfx | "The most satisfying part of my game is this" |
| 4 | The Town tour (it demos beautifully) | "There's a whole village hiding inside my idle game" |
| 5 | Launch day post (when 1.0.6 / Android goes live) | "It's live. One person made this. Here's 20 seconds of it." |
| 6 | Dragon boss clip (Daily Dungeon jaw-snap) | "I gave my game a boss that eats the screen" |
| 7 | Numbers dev-log | "My game made £X in week one. Full breakdown:" |
| 8 | The pets: hatch → evolve → all five fighting | "You can hatch five pets and they all fight beside you" |
| 9 | Community gift code (Android/web only!) | "First 100 people to redeem LAUNCH50 get free gems" |
| 10 | Rebirth explainer | "Deleting all my progress on purpose (it makes you stronger)" |

Post 2–3x/week. Re-post the best performer with a new hook after two
weeks — repeat winners, don't chase novelty.

## Caption template

> [One-line hook — same as on-screen text]
>
> [One sentence of context or a question to invite comments]
>
> 🔗 Link in bio
> #indiegame #idlegame #pixelart #gamedev #indiedev #mobilegame
> #incrementalgames #solodev [+ #iosgames or #androidgames]

Keep 6–9 hashtags. Mix one big (#gamedev), a few medium (#idlegame,
#pixelart), one niche (#incrementalgames).

## Gift codes — IMPORTANT platform rule

Community promo codes (e.g. LAUNCH50) work on **Android and the web
version only**. Apple prohibits redeem codes in iOS apps (Guideline
3.1.1 — we removed the feature from iOS after review). Never post a code
captioned as redeemable on iPhone; phrase codes as "Android players:
redeem LAUNCH50 in Shop > Deals". For iOS giveaways use App Store
**offer codes** for the Knight's Membership subscription (created in App
Store Connect > Subscriptions > Offer Codes).

Adding a new community code is a one-line change in
`src/config/promoCodes.ts` (ask Claude) and ships with the next update.

## What NOT to do

- Don't buy followers or run paid social ads yet — wait for the
  post-1.0.6 revenue-per-install data (2–3 weeks) before spending.
- Don't post store screenshots as posts — video only; stills die in feed.
- Don't announce dates you don't control (reviews slip) — announce when
  things ARE live.
- Don't spread across 4 platforms actively — record once for TikTok,
  cross-post everywhere, engage on TikTok.

## Recording clips (zero extra tooling)

iPhone screen-record the live game (Control Centre ⏺), AirDrop to Mac,
trim in Photos/iMovie or straight in the TikTok app. The web build works
for capturing too (browser at 390x844). Sound: keep the game's chiptune
audio — it's distinctive — and add trending audio at low volume when it
helps reach.
