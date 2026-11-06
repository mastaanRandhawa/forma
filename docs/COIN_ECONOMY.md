# Forma coin economy

The design for how coins enter and leave a Forma wallet. It was written before the
code, and the code should follow it. If a number here changes, change it in all three
places: `backend/src/data/economy.ts`, `backend/src/data/customization.ts`, and
`frontend/src/lib/economyConfig.ts` / `frontend/src/lib/data.ts`. The spec
`frontend/tests/e2e/economy.spec.ts` fails if the server and client disagree.

## 1. What existed before

### Ways to earn

| Source | Amount | Paid by | Problem |
| --- | --- | --- | --- |
| Finish a workout | 40 + `volume / 125`, max 120 | client | Pays for an empty workout. `volume` is in the user's unit, so kg users earned less. |
| Personal record | 50 per PR, no cap | client | A lift's first log counts as a PR. The API writes up to three PR rows per lift, so a first workout could pay 900 coins. |
| Open the app | 15 a day | client | No problem. |
| Streak milestone | 30–400 at 3/7/14/30/60/100 days | client | Milestones were checked by exact match. |
| Weekly challenges | 4 at a time, 150–220 each | client | 710 coins a week on their own, more than the rest combined. |
| Achievements | 50–200, four keys only | server | The seed has about 50 achievements and the evaluator only knew 4. A broken streak re-locked an achievement, and regaining it paid again. |
| Goals, weekly target | listed but never paid | nobody | `grantGoalReward` had no caller. |
| Registration | 100 coins | server | No ledger entry. Local mode starts at 0. |

### Ways to spend

Only cosmetics, through `POST /customization/buy` (safe under concurrency): effects
140–260, Kai looks 150–900, chat skins 100–200, frames 120–1,200, titles 150–800, badges
100–500, fonts 80–140. The older `POST /store/items/:id/buy` catalogue (voices,
personalities) has no screen in the web app.

### Bugs this design fixes

1. **`POST /store/wallet/earn` lets a client mint coins.** Any signed-in client could
   post `{amount: 1000}` as often as it liked. The "server-authoritative" wallet was
   really a mirror of whatever the browser claimed.
2. **Grants live in `localStorage`.** Idempotency keys weren't on the server, so clearing
   storage or using a second device paid the same rewards again. The wallet blob also
   survived sign-out, so the next account on that browser inherited its grants.
3. **Chat skins, titles and badges do nothing.** They could be bought and equipped, but
   nothing read them, even though the title's blurb promises "shows under your name
   across the app".
4. **Local mode doesn't auto-equip on buy but API mode does**, so the two modes disagree.
5. **Prices don't match income.** A committed user earned about 1,500 coins a week, so
   the most expensive item in the store (1,200) cost less than a week of training.

## 2. Principles

- **The server decides.** In API mode no request carries an amount. The client asks the
  server to settle, and the server works out what is owed from data it already holds
  (sessions, sets, food logs, check-ins).
- **Same rules in both modes.** Local mode runs the same table against `localStore`.
  It can't be tamper-proof, because the user owns the storage, but the economy there is
  single-user with nothing at stake.
- **Pay for training first.** Workouts and weekly consistency are about 55% of income.
  Logging habits pay small amounts, so nobody can earn much without lifting.
- **Reward effort, not load.** A beginner squatting 95 lb should earn the same as an
  advanced lifter on 405, so workout coins scale with working sets, not volume.
- **Every item does what it says.** If a card makes a promise, code keeps it.

## 3. Ways to earn

| Rule | Trigger | Coins | Daily cap | Weekly cap |
| --- | --- | --- | --- | --- |
| `workout` | Finish with at least 3 working sets and at least 5 minutes on the clock | 30 + 2 per working set (max +30), so 36–60 | 2 | 7 |
| `pr` | Beat your previous best on a lift. First logs don't count | 25 per lift, max 3 per workout | none | 4 lifts (100) |
| `visit` | First app open of the day | 5 | 1 | 7 |
| `checkin` | Log a recovery check-in | 10 | 1 | 7 |
| `food` | Log 2 or more food items today | 10 | 1 | 7 |
| `protein` | Reach your protein target today | 10 | 1 | 7 |
| `week` | Reach your weekly training target | 25 × target, target clamped to 2–5, so 50–125 | none | 1 |
| `challenge` | Finish one of this week's 3 challenges | 40–70 | none | 3 |
| `streak` | Reach a streak of 3/7/14/30/60/100 trained days | 10/25/50/100/175/300 | once each, ever | |
| `achievement` | Unlock an achievement | 25–400 | once each, ever | |
| `welcome` | A new account (API), or finishing onboarding (local) | 100 | once, ever | |

**Weekly challenges.** Three a week, picked from a pool of 10 by hashing the week and
item id, so the rotation is stable and needs no storage: 4 workouts (60), 50,000 lb of
volume (70), 2 sessions before 9am (50), 5 muscle groups (60), 60 working sets (60), 1 PR
(50), food logged 4 days (50), 4 recovery check-ins (40), a weekend session (40), 2
sessions of 45+ minutes (50).

### How a streak works

A streak counts trained days, and it lasts as long as the user can still hit their plan.
A 7-day streak means 7 days of training with nothing missed, not 7 calendar days.

- **The plan** is how many days a week the user means to train. That's their weekly
  target (`trainingFrequencyTarget` on the server, `daysPerWeek` locally), or how many
  weekdays they've picked if there's no target (an active program's `preferredWeekdays`,
  or `preferredDays` locally).
- **Rest days.** Planning N days leaves 7 − N rest days in each Monday-to-Sunday week. A
  day off uses one up, bridges the streak without adding to it, and costs nothing.
- **Misses.** A day off beyond that is a miss, which makes it exactly the day the week's
  target stops being reachable. A miss breaks the streak unless a Freeze or Repair covers
  it. A covered day doesn't use up a rest day.
- **Starting over.** Days before a first session don't count against anything. Training
  again after a miss starts a new run with its rest days back for that week.

**Why a count and not fixed weekdays.** A fixed schedule would charge someone a freeze for
training on Tuesday instead of Monday, even though they hit their week. The count allows
everything a schedule would: Mon/Wed/Fri on a 3-day plan leaves exactly the 4 rest days
that week needs. It also behaves the same in both modes, because the server doesn't store
preferred weekdays.

**Users with no plan** are held to 3 days a week (`DEFAULT_PLANNED_DAYS`), the same as the
casual user in section 5. Having no plan shouldn't cost more than having one, and 3 is
still a low bar that means something. Onboarding asks for a target, so this mostly covers
accounts that never finished it.

**Streaks already in progress** need no migration, because a streak is worked out from
sessions and protected days every time it's read:

- Everyone's history is re-read under this rule the next time it's read. A streak can only
  get longer, since every day that bridged before still bridges.
- Someone whose streak broke on rest days may see it jump. Any milestones they've now
  passed pay on the next settle at the new amounts, 660 coins at the very most, and only
  for days they really trained.
- Milestones already paid stay paid at the old amounts. Freezes on hand stay on hand, and
  days already covered stay covered. Freezes already spent on what would now be rest days
  aren't refunded.

**Changing the plan.** History is read under the current plan, so raising a target would
turn past rest days into misses and could break a long streak. Lowering one can shorten a
streak too, if the run restarted mid-week after a miss and the lighter plan would have
used up that week's rest before the restart. So before a new target is saved, any day it
would call a miss in the current run is saved as a protected day (source `plan`). The
streak you have stays whole, and the new plan applies from today on. Rest already taken
this week still counts against the new plan, so a change doesn't free up more rest, and a
streak that's already broken has nothing saved for it.

## 4. Things to buy

### Price tiers

| Tier | Price | Committed user | Casual user |
| --- | --- | --- | --- |
| Small | 60–300 | Whenever | Most weeks |
| Mid | 400–800 | About 1 a week | Every 2–3 weeks |
| High | 900–1,600 | Every 1–2 weeks | Every 3–5 weeks |
| Top | 2,600–3,000 | About a month | 8–9 weeks |
| Prestige | 4,950 (bundle) | About 6 weeks | 15 weeks |

### New items

| Item | Price | What it really does |
| --- | --- | --- |
| **Streak Freeze** `cs-freeze` | 100, hold 2 | Used automatically when a missed training day would break a streak of 3+ days. Rest days in the plan never use one. The day bridges the streak but doesn't add to it. |
| **Streak Repair** `cs-repair` | 450, once a week | Restores a streak lost to 1–3 missed training days, if the earlier run was 3+ days and the last miss was in the last 3 days. Charged only when it can be applied. |
| **Challenge Reroll** `cs-reroll` | 60, hold 3, 2 uses a week | Swaps an unfinished challenge for one you haven't already met. |
| **Kai Deep Review** `cs-review` | 300, hold 3 | A 28-day report: training frequency, volume trend, lift progress, PRs, muscle balance and one concrete next step. It's saved to your Kai chat in API mode, and Kai adds a written take when the AI service is configured. |
| **Kai personas** `ps-drill` `ps-zen` `ps-analyst` `ps-hype` | 600 each | Changes Kai's voice: Kai's chat instructions in API mode, and the in-workout cues in both modes. |
| **Rest-timer sounds** `rs-bell` `rs-arcade` `rs-sonar` `rs-bowl` | 120–240 | Replaces the end-of-rest chime. Synthesised with Web Audio, with a preview in the store. |
| **Celebrations** `cl-sparks` `cl-coins` `cl-fireworks` | 200–800 | Replaces the confetti after a PR, weekly target or streak milestone. |
| **Premium programs** `pl-powerbuilding` `pl-arms` `pl-glutes` | 900–1,500 | Multi-day plans with their own sessions. Visible in the plan library, locked until bought. |
| **Bundles** `bn-neon` `bn-zen` `bn-champion` | 25% off what you don't own | Grants every item in the bundle. The price drops as you own more of it, and it can't be bought once you own everything. |

### Repriced items

Small items keep their prices so the store stays reachable from week one. Everything
else moves up to fit the tiers:

| Item | Old | New | Item | Old | New |
| --- | --- | --- | --- | --- | --- |
| `fx-aurora` | 200 | 400 | `fr-laurel` | 300 | 500 |
| `fx-particles` | 220 | 450 | `fr-flame` | 350 | 600 |
| `fx-scanlines` | 260 | 600 | `fr-prism` | 700 | 1,400 |
| `l-nebula`, `l-jade` | 220 | 450 | `fr-crown` | 1,200 | 3,000 |
| `l-mono` | 260 | 500 | `ti-relentless`, `ti-machine` | 250 | 500 |
| `l-gold` | 600 | 1,400 | `ti-legend` | 800 | 1,600 |
| `l-holo` | 900 | 2,600 | `bd-star` | 200 | 400 |
| `t-ink` | 200 | 400 | `bd-diamond` | 500 | 1,200 |

Anything already bought stays owned.

### Weekly deals

Three cosmetic or program items are 25% off each week, chosen by the same hash as the
challenges. They expire on Monday, which gives saved-up coins a reason to move.

## 5. Balance

### Earn-rate model

| Source | Casual: 3 workouts, 10 sets each | Committed: 5 workouts, 16 sets each | Everything capped |
| --- | --- | --- | --- |
| Workouts | 3 × 50 = 150 | 5 × 60 = 300 | 7 × 60 = 420 |
| PRs | 0.5 lifts = 12 | 2 lifts = 50 | 100 |
| Daily visit | 4 days = 20 | 7 days = 35 | 35 |
| Recovery check-in | 1 day = 10 | 5 days = 50 | 70 |
| Food logged | 2 days = 20 | 6 days = 60 | 70 |
| Protein target | 0 | 3 days = 30 | 70 |
| Weekly target | 75, 3 weeks in 4 = 56 | 125 | 125 |
| Challenges | 0.5 at 55 = 27 | 2 at 60 = 120 | 190 (top 3 in the pool) |
| **Recurring total** | **about 295** | **about 770** | **1,080** |
| Streak milestones, averaged over 12 weeks | 185 ÷ 12 = about 15 | 360 ÷ 12 = 30 | |
| Other one-offs, averaged over 12 weeks | about 15 | about 30–50 | |
| **Per week** | **about 325** | **about 840** | |

The `Everything capped` column is a hard ceiling on recurring income. Even at that rate a
3,000-coin item takes nearly 3 weeks, so nothing at the top can be bought in one week.

**Streak milestones are easier to reach.** Training to plan now earns them with no
freezes at all:

| Trained days | 3 | 7 | 14 | 30 | 60 | 100 |
| --- | --- | --- | --- | --- | --- | --- |
| Coins | 10 | 25 | 50 | 100 | 175 | 300 |
| Reached on 5 days a week | Week 1 | Week 2 | Week 3 | Week 6 | Week 12 | Week 20 |
| Reached on 3 days a week | Week 1 | Week 3 | Week 5 | Week 10 | Week 20 | Week 34 |

Holding one used to cost 300 coins a week in freezes, so the milestones rarely paid. Almost
everyone reaches them now, so the amounts came down by about 30% (935 to 660 in total) to
keep them a small bonus on top of training. They pay once each, and all of them have paid
by about week 20 of a committed user's training.

### Checking against the goals

- **Mid-tier about weekly (committed):** 840 a week against mid prices of 400–800. Yes.
- **Top item in about a month (committed):** 3,000 ÷ 840 = 3.6 weeks. Yes.
- **Casual users aren't locked out:** 325 a week buys a small item most weeks, a mid item
  every 2–3 weeks, and the top item in about 9 weeks.

### Sinks

The whole one-time catalogue costs about 27,000 coins at list price, about 32 weeks of
committed income. Recurring sinks keep coins moving after that:

| Sink | Weekly use | Cost a week |
| --- | --- | --- |
| Streak Freeze | 1 missed training day a month | about 25 |
| Challenge Reroll | 1 | 60 |
| Kai Deep Review | Monthly | about 75 |
| Streak Repair | Occasional | Up to 450 |

That is about 160 a week, about a fifth of committed income. It was 435 when freezes paid
for rest days, so the catalogue now takes about 40 weeks to finish rather than well over a
year. That is the cost of not charging for rest, and it's worth paying. Weekly deals and
the 4,950-coin Champion bundle give saved-up coins somewhere to go.

**Why a freeze costs 100.** A freeze now only covers a real miss, such as a week off sick,
so it works as insurance and should be cheap enough to keep one in the kit. 100 is a third
of a casual week and under a quarter of a Repair, which covers the same thing after the
fact. Raising the price to win back the lost sink would charge most the people having a
bad week.

**No balance cap.** A wallet cap or decay punishes the most committed users for doing
what the app asks. It is worth revisiting only if real balances grow past about 10,000.

## 6. Exploits and how they are closed

| Exploit | Defence |
| --- | --- |
| Mint coins with `POST /store/wallet/earn` | The client no longer calls it, and the route returns 404 in production. It survives outside production only so tests can fund a wallet. |
| Start and abandon workouts | Abandoning pays nothing. Only finishing can pay. |
| Finish empty workouts in a loop | Needs 3+ working sets and 5+ minutes, measured on the server clock, not client-sent duration. The daily (2) and weekly (7) caps still apply. |
| An empty workout keeps a streak alive | Streaks only count sessions with a completed working set. |
| Replay a reward, or use a second device | A unique `(walletId, key)` index in the database. The same key can't pay twice. |
| Race two requests to beat a cap | Each grant takes a row lock on the wallet, so cap checks and payouts run one at a time. |
| First-log "PRs" | Only records with a previous value pay. One lift pays once, however many record types it beat. |
| Inflate a lift by a kilo each session | At most 3 lifts a workout and 4 a week. |
| Lower the weekly target to 1 | The target is clamped to at least 2, and the reward is 25 × target, so a lower target pays less. |
| Change time zone for an extra daily reward | Daily rules key on the local date, and `visit` also needs 20 hours since the last one. The offset is clamped to real values. |
| Add and delete food logs | Paid once per day per rule, and the key stays spent if the log is deleted. |
| Regain an achievement after a broken streak | Achievements no longer re-lock, and `ach:<key>` pays once. |
| Buy your way to a streak milestone | Frozen and repaired days bridge a streak but never add to its length. |
| Lower your target so days off stop counting | A streak only counts days really trained, so a lower target can't add to it or reach a milestone sooner, and it pays less for the weekly target. |
| Change your target to avoid paying for a Freeze or Repair | Accepted. History is read under the current plan, so lowering a target can rejoin an old gap, and raising then lowering it each week can hold a streak with no training. Neither adds a day that wasn't trained, and milestones pay once each (660 coins in total), so all it saves is the cost of a Freeze or Repair. Closing it would mean storing every past plan. |
| Waste a freeze on a tiny streak | A freeze only fires on a streak of 3+ days and only if it covers every miss in the gap. |
| Reroll onto a challenge you've already met | Replacements skip anything already complete, and rerolled-away challenges don't come back that week. |
| Buy at a stale deal price | The server charges its own price and rejects a mismatched `expectedPrice`. |
| Buy two items with the same coins, or one item twice | Guarded balance decrement and optimistic lock, as before, now shared by every purchase. |
| Inventory over the limit | The hold limit is checked inside the purchase transaction. |

Local mode applies the same rules, but anyone can edit their own `localStorage`. That is
accepted, because those coins buy nothing beyond that browser.

## 7. How it's built

### API mode

```
App open / check-in / food log ─► POST /economy/settle ─► pays whatever is owed
Finish workout ─► POST /sessions/:id/finish ─► pays workout + PRs, then settles
Store ─► POST /economy/buy, /economy/challenges/:id/reroll,
         /economy/streak-repair, /economy/kai-review
```

Each returns the full economy snapshot, which the client mirrors. `walletStore.earn`
never runs in API mode.

New data: `Wallet.lifetimeEarned`, `WalletTransaction.kind` and `.key`, `User.tzOffsetMin`,
and the tables `UserInventory`, `StreakProtection` and `ChallengeWeek`.

### Local mode

`lib/rewards.ts` runs the same rules against `localStore`, with caps and idempotency keys
held in `forma.wallet.v2`. Inventory, protected days and challenge state live in
`forma.economy.v1`.

### Time

The server stores the browser's UTC offset and uses it to work out the user's calendar
day and week (Monday first). Week keys match the client format, such as `w2026-11-02`.

## 8. Known limits and follow-ups

- **The store is locked for brand-new API accounts.** The progression gate opens `/store`
  after a first PR row and a coin in the wallet, which normally means after the first
  workout. Until then the wallet pill links to a locked page. That gate predates this work
  and hasn't changed, but it's worth revisiting now that the store sells useful things.
- **Preferred weekdays aren't on the server.** They stay in the browser, so they're lost on
  sign-out and API-mode streaks never read them. The weekly target decides the plan in both
  modes, so a user whose target and picked weekdays disagree is held to the target. The
  streak rule doesn't need the weekdays, but the calendar's "planned" dots would benefit
  from a server column.
- **Voices aren't sold.** The app has no text-to-speech, so a voice pack wouldn't do
  anything yet. The old catalogue stays unused until it does.
- **Only achievements with a real evaluator can pay.** Those needing data the app doesn't
  record yet, such as readiness, deload weeks and voice mode, stay locked and pay nothing.
