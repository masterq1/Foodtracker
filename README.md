# FoodTracker

A mobile food tracking app built with React Native and Expo. Take a photo of your meal and let Google's Gemini AI instantly identify the food, estimate calories, and break down macronutrients — or enter meals manually if you prefer.

---

## Features

- **AI Food Analysis** — Photograph a meal and Gemini AI identifies ingredients, estimates calories, protein, carbs, fat, and total weight
- **Manual Entry** — Add meals without a photo by entering nutrition info directly
- **Daily Summary** — See today's total calories, macros, and progress toward your daily goal
- **Meal History** — Browse past meals by date
- **Edit Meals** — View and edit any logged meal including nutrition values, ingredients, date, and time
- **Smart Model Fallback** — Uses Gemini 2.5 Flash (higher quality) for the first 20 requests per day, then automatically falls back to Gemini 3.1 Flash Lite for unlimited additional requests
- **Local Storage** — All data is stored on-device using AsyncStorage, no account required

---

## How It Works

1. You take a photo (or pick one from your gallery) of your meal
2. The image is sent to the Google Gemini API
3. Gemini identifies the food, lists ingredients with portion estimates, and returns structured nutrition data (calories, protein, carbs, fat, weight)
4. You can review and edit any of the values before saving
5. The meal is saved to your daily log

---

## Setup

### Requirements

- [Node.js](https://nodejs.org) v18+
- [Expo Go](https://expo.dev/go) app on your Android or iOS device
- A free Google AI API key from [aistudio.google.com](https://aistudio.google.com)

### Run Locally

```bash
git clone https://github.com/masterq1/Foodtracker.git
cd Foodtracker
npm install
npx expo start --clear
```

Scan the QR code with Expo Go on your phone.

### API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API key** → **Create API key**
4. Open the app → **Settings** → paste your key → tap **Save Key**

---

## Install APK (Android)

Download and install the latest APK directly — no app store required:

**[Download FoodTracker.apk](https://expo.dev/artifacts/eas/gXHfNRwAwXMjbYbvHm8hJV.apk)**

To install:
1. Download the APK to your Android phone
2. Go to **Settings → Apps → Special app access → Install unknown apps**
3. Enable installs for your browser or file manager
4. Open the downloaded APK and tap Install

---

## Project Structure

```
food-tracker/
├── App.js                          # Entry point
├── app.json                        # Expo config
├── eas.json                        # EAS Build config
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js         # Tab + stack navigation
│   ├── screens/
│   │   ├── HomeScreen.js           # Today's meals + daily summary
│   │   ├── AnalysisScreen.js       # AI analysis results + editing
│   │   ├── HistoryScreen.js        # Past meals by date
│   │   ├── EditMealScreen.js       # View/edit a saved meal
│   │   ├── ManualAddScreen.js      # Manual meal entry
│   │   └── SettingsScreen.js       # API key + calorie goal
│   ├── services/
│   │   ├── geminiApi.js            # Gemini API calls + model fallback logic
│   │   └── storage.js              # AsyncStorage helpers
│   └── theme/
│       └── index.js                # Colors, spacing, font sizes
└── assets/                         # App icons and splash screen
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React Native + Expo | Mobile app framework |
| React Navigation | Screen navigation |
| Google Gemini API | AI food analysis |
| AsyncStorage | Local data persistence |
| expo-image-picker | Camera + gallery access |
| expo-file-system | Image file management |
| EAS Build | APK / App Bundle compilation |



---

## Building Your Own APK

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Build: `eas build --platform android --profile preview`

The build runs on Expo's servers and produces a downloadable `.apk` file.

---

## License

MIT
