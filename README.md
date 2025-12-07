# MeetPoint Protocol

A high-design, privacy-first dating utility that solves "where to meet" using algorithmic venue discovery based on fairness and vibe filters. Features a Digital Ticket generator for sharing date invites.

## Design Philosophy

**"Code meets Vogue"** - High-Contrast Editorial aesthetic with:
- **Typography**: Playfair Display (Serif) for headings, JetBrains Mono for data
- **Palette**: Deep black (#050505) with Skia noise overlay, terracotta accents (#E07A5F)
- **Components**: Brutalist borders, sharp corners, staggered animations

## Tech Stack

- **Frontend**: React Native (Expo Managed Workflow)
- **Graphics**: React Native Skia (noise textures), Reanimated (motion)
- **Sharing**: react-native-view-shot, Expo Sharing
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Maps**: MapLibre GL React Native (Open Source)
- **Data**: Overpass API (OpenStreetMap) & Nominatim

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Studio
- Supabase account

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
The `.env` file should contain:
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set Up Supabase Database
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL script in `supabase_schema.sql`

### 5. Build and Run

**Important**: MapLibre requires native code, so you cannot use Expo Go. You must create a development build:

#### iOS
```bash
npx expo prebuild
npx expo run:ios
```

#### Android
```bash
npx expo prebuild
npx expo run:android
```

#### Web (Limited functionality - no maps)
```bash
npm run web
```

## Project Structure

```
MeetPoint_Protocol/
├── app/                    # Routes and screens
│   ├── (tabs)/            # Tab navigation
│   │   └── index.tsx      # Map screen
│   └── _layout.tsx        # Root layout with fonts
├── components/            # Reusable components
│   ├── VenueTicket.tsx   # Digital ticket component
│   └── NoiseBackground.tsx # Skia noise overlay
├── services/             # External API integrations
│   ├── overpass.ts       # OpenStreetMap venue fetching
│   └── dates.ts          # Supabase date operations
├── utils/                # Helper functions
│   ├── ScoreVenue.ts     # Venue scoring algorithm
│   └── supabase.ts       # Supabase client
└── .env                  # Environment variables
```

## Core Features

### Venue Discovery
- Fetches real-world venues from OpenStreetMap via Overpass API
- Algorithmic scoring based on:
  - Opening hours (+20 points)
  - Website presence (+15 points)
  - Vibe keywords: "Roastery", "Garden", "Lounge", etc. (+10 points)

### Interactive Map
- User location tracking
- Color-coded markers (score > 50 = terracotta, else gray)
- Tap to view venue details

### Date Confirmation Flow
1. Select venue on map
2. View details and score
3. Press "CONFIRM DATE"
4. Date saved to Supabase
5. Digital Ticket generated
6. Share via system share sheet

### Digital Ticket
- Captures venue name, time, location
- Designed for screenshot/sharing
- Uses `react-native-view-shot` for PNG export

## Development Notes

### Fonts
Fonts are loaded asynchronously in `_layout.tsx`. The splash screen remains visible until fonts are ready.

### Noise Background
The Skia `FractalNoise` component creates a film grain effect. Adjust `freqX`, `freqY`, and `octaves` in `NoiseBackground.tsx` to customize.

### Map Style
Currently using MapLibre's demo tiles. For production, consider:
- MapTiler (free tier available)
- Stadia Maps
- Custom style JSON

### Overpass API
Rate limits apply. For production, consider:
- Caching responses
- Using a dedicated Overpass instance
- Implementing debounced fetching

## Troubleshooting

### "StyleURL of null" error
This occurs in Expo Go. You must use a development build (`npx expo run:ios/android`).

### Fonts not loading
Ensure `expo-font` is installed and fonts are imported correctly in `_layout.tsx`.

### Supabase connection fails
1. Verify `.env` credentials
2. Check Supabase project is active
3. Ensure RLS policies allow operations

### Map not rendering
1. Verify MapLibre installation: `npm list @maplibre/maplibre-react-native`
2. Check location permissions are granted
3. Ensure native build (not Expo Go)

## Future Enhancements

- [ ] Midpoint calculation between two users
- [ ] Vibe filters (Aesthetic, Diet, Type)
- [ ] Authentication system
- [ ] Chat/messaging
- [ ] Push notifications for date reminders
- [ ] Custom map markers with venue photos
- [ ] Offline mode with cached venues

## License

MIT
