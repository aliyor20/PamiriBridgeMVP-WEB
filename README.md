# 🏔️ Pamiri Bridge

> A community-driven dictionary app for preserving endangered Pamiri languages through crowdsourced audio and translations.

[![React Native](https://img.shields.io/badge/React%20Native-Expo-blue.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📖 About

Pamiri Bridge is a mobile application designed to preserve the endangered Pamiri languages—Shughni, Rushani, Wakhi, Yazghulami, Sarikoli, Bartangi, and Ishkashimi—spoken in the high-altitude regions of Central Asia. Unlike traditional dictionary apps, Pamiri Bridge embraces "informal romanization" (the way youth type these languages in chat), making it accessible to the diaspora community.

### Key Features

- 🎙️ **Audio-Enhanced Dictionary** - Hear native pronunciations for authentic learning
- 📝 **Translation-First Contributions** - Add words with meanings (audio optional)
- 🌐 **7 Dialect Support** - Each valley's unique language preserved
- 🏆 **Gamification** - Points, badges, and valley competition leaderboards
- 📱 **Offline-First** - Full dictionary cached locally via SQLite
- 🎨 **6 Beautiful Themes** - Including OLED-optimized dark mode
- 🔄 **Smart Sync** - Delta sync saves Firebase reads

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase project (Spark plan works!)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pamiri-bridge.git
cd pamiri-bridge/PamiriLexiconMVP

# Install dependencies
npm install

# Start development server
npx expo start
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password + Google Sign-In)
3. Enable **Firestore Database**
4. Enable **Storage**
5. Copy your config to `src/firebaseConfig.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📁 Project Structure

```
PamiriLexiconMVP/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── AudioRecorder.js
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Input.js
│   │   └── ThemePicker.js
│   ├── screens/          # App screens
│   │   ├── HomeScreen.js       # Dictionary search
│   │   ├── AddWordScreen.js    # Contribute words
│   │   ├── ReviewScreen.js     # Community review
│   │   ├── ProfileScreen.js    # User stats & badges
│   │   ├── LeaderboardScreen.js
│   │   └── SettingsScreen.js
│   ├── services/         # Business logic
│   │   ├── Database.js         # SQLite local cache
│   │   ├── SyncService.js      # Firebase sync
│   │   ├── AudioService.js     # Audio playback
│   │   └── badgeService.js     # Gamification
│   ├── context/
│   │   └── PreferencesContext.js  # Theme & settings
│   ├── constants/
│   │   └── theme.js            # 6 color themes
│   └── navigation/
│       └── AppNavigator.js
├── assets/
│   └── data/
│       └── dictionary_bundle.json  # Pre-bundled dictionary
├── scripts/
│   └── exportFirestoreToBundle.js  # Database export
└── firestore.indexes.json
```

## 🏗️ Architecture

### Offline-First Design

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User UI   │────▶│   SQLite    │────▶│  Firebase   │
│  (Instant)  │     │  (Cache)    │     │  (Source)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   ▲                   │
       │                   │                   │
       └───────────────────┴───────────────────┘
              Delta Sync (24h or Pull-to-Refresh)
```

### Firebase Cost Optimization (Spark Plan)

| Strategy | Reads Saved |
|----------|-------------|
| Bundled database on fresh install | ~5000 reads/user |
| 24-hour sync window | ~50 reads/day |
| Local SQLite for all searches | 100% of search reads |
| Dual-write for own contributions | Skips during sync |

## 📲 Building for Production

### Export Database Bundle (Weekly)

```bash
# 1. Get service account key from Firebase Console
# 2. Save as scripts/serviceAccountKey.json
# 3. Run export
node scripts/exportFirestoreToBundle.js

# 4. Update BUNDLED_DB_VERSION in src/services/SyncService.js
```

### Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for app stores
eas build --platform android
eas build --platform ios
```

## 🎯 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding a New Theme

Edit `src/constants/theme.js`:

```javascript
export const THEMES = {
  yourTheme: {
    id: 'yourTheme',
    name: 'Your Theme',
    description: 'Description here',
    colors: {
      primary: '#hexcolor',
      // ... other colors
    },
    preview: ['#color1', '#color2', '#color3', '#color4'],
  },
};
```

## 📊 Firestore Schema

### `entries` Collection
```javascript
{
  id: "auto-generated",
  word: "xats",              // Romanized Pamiri
  meaning: "water",          // English translation
  dialect: "Shughni",        // Required dialect tag
  audioURL: "gs://...",      // Optional audio file
  hasAudio: true,            // Audio flag
  status: "pending|verified|deleted",
  contributorId: "uid",
  timestamp: Timestamp,
  search_tokens: ["xats", "khats", "water"],
  _normalized: "xats"
}
```

### `users` Collection
```javascript
{
  uid: "firebase-uid",
  displayName: "PamirPride",
  email: "user@example.com",
  valley_affiliation: "Shughnan",
  points: 42,
  badges: ["pioneer", "first_word"],
  dialects_contributed: ["Shughni", "Wakhi"]
}
```

## 🔒 Security

- Firebase Auth for all user operations
- Service account keys **never** committed (gitignored)
- Audio compressed to 32kbps AAC
- User data exportable per GDPR

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- The Pamiri diaspora community for language preservation efforts
- [Expo](https://expo.dev) for the amazing React Native framework
- [Firebase](https://firebase.google.com) for the generous Spark plan
- [@siteed/expo-audio-studio](https://github.com/siteed/expo-audio-studio) for audio recording

---

<p align="center">
  Made with ❤️ for the Pamiri community
  <br>
  <i>Preserving our heritage, one word at a time</i>
</p>
