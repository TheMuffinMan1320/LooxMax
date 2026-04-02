# MogApp

An AI-powered facial analysis and looksmaxxing tracker built with React Native and Expo. Upload a photo, get scored on 6 facial features by Claude Vision, track your progress over time, and compete on leaderboards with friends.

---

## Features

- **AI Face Scanning** — Claude Vision analyzes your photo and scores jawline, cheekbones, canthal tilt, skin quality, facial symmetry, and hair (each 0–10) with written reasoning per trait
- **Body Composition Score** — Automatically calculated from your height and weight (BMI → normalized score)
- **Composite Rating** — Overall score combines all 7 metrics into a single tier (Elite / High Tier / Above Average / Average / Below Average)
- **Scan History Calendar** — Monthly calendar showing your best scan score per day, color-coded by performance
- **Improvement Modules** — Each trait has 3–4 evidence-based strategies you can act on
- **Leaderboard** — National, local (geolocation-based), and custom invite-code groups; tap any user to view their latest scan photo
- **Profile & Location** — Store height, weight, city/state, and GPS coordinates for local rankings
- **Weekly Reminders** — Push notification every Monday at 10am prompting you to scan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo SDK 54 (managed workflow) |
| Routing | Expo Router (file-based) |
| Language | TypeScript 5.9 (strict mode) |
| State | React Context API + hooks |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) via Supabase Edge Function |
| Auth | Google OAuth via Supabase |
| Location | Expo Location + reverse geocoding |
| Images | Expo Image Picker (base64 output) |
| Notifications | Expo Notifications |
| Testing | Jest + ts-jest |

---

## Project Structure

```
mog-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # My Stats — feature cards, body stats, overall rating
│   │   ├── scan.tsx           # Face Scan — camera/gallery, analysis, calendar history
│   │   └── leaderboard.tsx    # Leaderboard — national / local / group tabs
│   ├── feature/[id].tsx       # Feature detail — score, Claude reasoning, improvement modules
│   ├── login.tsx              # Google OAuth sign-in
│   └── _layout.tsx            # Root layout with auth + profile providers
├── components/
│   ├── FeatureCard.tsx        # Score card with progress bar
│   └── ui/                    # Icon, collapsible, tab primitives
├── context/
│   ├── auth.tsx               # Session, user, sign-out
│   └── ProfileContext.tsx     # Height, weight, location — reads/writes profiles table
├── constants/
│   ├── features.ts            # Feature definitions + improvement module content
│   └── theme.ts               # Color palette
├── utils/
│   ├── scoring.ts             # bmiToScore() — BMI to 0-10 score curve
│   └── distance.ts            # Haversine distance for local leaderboard
├── lib/
│   └── supabase.ts            # Supabase client (AsyncStorage session persistence)
├── types/
│   └── index.ts               # Feature, UserProfile, LeaderboardUser, etc.
├── database/
│   └── migrations/            # SQL migrations (reference — applied via Supabase MCP)
├── supabase/
│   └── functions/analyze-face # Edge function (Deno) — calls Claude Vision API
└── tests/
    └── analyzeWithClaude.test.ts
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Height, weight, city, state, lat/lng — one row per auth user |
| `scans` | Scan history — `scores` (JSONB), `reasoning` (JSONB), `overall_score`, `scanned_at` |
| `leaderboard_groups` | Named groups with unique invite codes |
| `group_members` | Join table — group to user |
| `user_photos` | Latest scan photo URL per user (public read) |

All tables use Row Level Security. Users can only read/write their own data, with the exception of group membership and leaderboard photos which are readable by any authenticated user.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go (for device testing) or a simulator

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create `.env.local` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Configure Supabase

- Enable **Google OAuth** in your Supabase project under Authentication → Providers
- Apply the database migrations from `database/migrations/` in order
- Set the Anthropic API key as a Supabase secret:

```bash
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

- Deploy the edge function:

```bash
supabase functions deploy analyze-face
```

### 4. Start the app

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `i` / `a` to open in a simulator.

---

## How the Scan Works

1. User picks a front-facing photo from camera or gallery
2. Photo is base64-encoded on device
3. Request is sent to the `analyze-face` Supabase Edge Function
4. Edge function calls Claude Vision API with a structured prompt
5. Claude returns JSON scores (0–10) and written reasoning per feature
6. Scores and reasoning are saved to the `scans` table
7. Photo is uploaded to the `scan-photos` Supabase Storage bucket
8. My Stats page and leaderboard update with the new scores

**Cost estimate (`claude-sonnet-4-6`):** ~$0.01 per scan — approximately $8.60/month for 200 weekly active users.

---

## Scoring

### Facial Features (via Claude Vision)

| Feature | What is evaluated |
|---|---|
| Jawline | Definition, angularity, fat distribution |
| Cheekbones | Prominence, width, midface structure |
| Canthal Tilt | Eye corner angle — positive tilt reads as dominant |
| Skin Quality | Clarity, tone, texture, signs of aging |
| Facial Symmetry | Balance between left and right sides |
| Hair | Density, style, health, hairline |

### Body Composition (via BMI)

BMI is calculated from stored height and weight. It maps to a 0–10 score on a curve that peaks around BMI 21–22 (lean-muscular range) and tapers toward underweight or obese extremes.

### Overall Rating

The composite score averages all available feature scores. The calendar and leaderboard both use this value.

| Score | Tier |
|---|---|
| 8.5+ | Elite |
| 7.5–8.4 | High Tier |
| 6.5–7.4 | Above Average |
| 5.5–6.4 | Average |
| < 5.5 | Below Average |

---

## Running Tests

Integration tests hit the live Supabase edge function. Add a test user to your Supabase project, then:

```bash
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=yourpass npx jest tests/analyzeWithClaude.test.ts
```

Test coverage:
- All 6 feature keys returned and scores within 0–10
- Error returned when request body is missing
- 401 returned without auth token

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Yes (Supabase secret) | Anthropic API key for Claude Vision |
| `TEST_USER_EMAIL` | Tests only | Email of a Supabase test account |
| `TEST_USER_PASSWORD` | Tests only | Password of that test account |

---

## Production Build

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

Requires an [Expo EAS](https://expo.dev/eas) account and `eas.json` configuration.
