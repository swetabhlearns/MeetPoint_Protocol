# MeetPoint Protocol

A privacy-first utility app that solves the "where to meet" problem using algorithmic venue discovery. Enter two locations, and the app finds fair midpoint venues scored by vibe, accessibility, and quality. Features digital ticket generation for sharing date invites.

## Tech Stack

- **React Native** (Expo Managed Workflow)
- **React Native Skia** – Noise textures & graphics
- **React Native Reanimated** – Smooth animations
- **Ola Maps** – Maps & venue discovery (India-optimized)
- **Supabase** – Backend (PostgreSQL, Auth, Edge Functions)
- **Zustand** – State management
- **Groq SDK** – AI-powered curation

## How to Run

### Prerequisites
- Node.js 18+
- iOS Simulator (macOS) or Android Studio

### Install Dependencies
```bash
npm install
```

### Configure Environment
Create a `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OLA_MAPS_API_KEY=your-ola-maps-key
```

### Run the App

> **Note**: This app requires native code, so Expo Go won't work. You must use a development build.

```bash
# iOS
npx expo prebuild
npx expo run:ios

# Android
npx expo prebuild
npx expo run:android
```

## License

MIT
