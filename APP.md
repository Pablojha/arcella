# Arcella for Android

The Android app is the same React build wrapped by [Capacitor](https://capacitorjs.com) (app id `com.arcella.app`). The API's CORS settings already allow the app's origins (`https://localhost` on Android, `capacitor://localhost` on iOS).

## What you need

- [Android Studio](https://developer.android.com/studio), which includes the Android SDK and a JDK
- The API deployed on **HTTPS** (for example Render). Android blocks plain `http://` calls by default.
- Node.js 20.12+ and `npm install` already run in `frontend/`

## Build the app

1. **Point the app at your API.** In `frontend/.env`:

   ```bash
   VITE_API_URL=https://arcella-api.onrender.com
   ```

2. **Create the Android project** (first time only). This adds `frontend/android/`, which you should commit:

   ```bash
   cd frontend
   npx cap add android
   ```

3. **Generate icons and splash screens** from the ready-made images in `frontend/assets/`:

   ```bash
   npx @capacitor/assets generate --android
   ```

4. **Build, sync and open Android Studio:**

   ```bash
   npm run android
   ```

   This runs `vite build`, copies `dist/` into the Android project (`cap sync android`) and opens Android Studio. Repeat it after every web change.

5. **Try it.** Pick a device or emulator in Android Studio and press **Run**, or run `npx cap run android` from the terminal.

## Make a release build

1. In `android/app/build.gradle`, set `versionCode` (a whole number that must go up with every upload) and `versionName` (what users see, e.g. `1.0.0`).
2. In Android Studio choose **Build → Generate Signed App Bundle / APK → Android App Bundle**.
3. Create a new keystore when asked. **Back up the `.jks` file and its passwords.** You need them for every future update, and Play App Signing only protects you if you keep this upload key safe.
4. Choose the `release` variant. The bundle is written to `android/app/release/app-release.aab`.

## Publish on Google Play

1. **Developer account:** sign up at [play.google.com/console](https://play.google.com/console). There is a one-time registration fee and identity verification.
2. **Create the app:** name "Arcella", default language, type *App*, *Free*.
3. **Store listing:**
   - Short description (up to 80 characters) and a full description
   - App icon 512 × 512: `frontend/assets/play-store-icon-512.png`
   - Feature graphic 1024 × 500
   - At least two phone screenshots (Home, a portfolio, a college group)
4. **App content** (all required):
   - **Privacy policy URL:** `https://<your-vercel-app>/privacy`. Review that page first and set `VITE_CONTACT_EMAIL`.
   - **Data safety:** declare name, email, photos and videos, files and docs (verification documents, deleted after review), messages and other user-generated content, all encrypted in transit.
   - **Account deletion:** in the app at **More → Settings → Delete account**. For the web link Play asks for, use `https://<your-vercel-app>/settings` (members sign in, then delete).
   - **User-generated content:** Arcella has in-app reporting, blocking and an admin moderation queue (**Admin → Reports**), which Google's policy for social apps requires.
   - **Content rating** questionnaire, **target audience** (choose honestly; many members are college students aged 17 and up) and the **ads** declaration (no ads).
5. **Testing:** new personal developer accounts must first run a *closed test* with at least 12 opted-in testers for 14 days before they can apply for production access. Check the current rule in Play Console, since Google changes it from time to time.
6. **Release:** upload `app-release.aab` to the track, add release notes and send it for review. The first review usually takes a few days.
7. **Updates:** raise `versionCode`, run `npm run android`, generate a new signed bundle and upload it to the same track.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| The app opens but data never loads | Check `VITE_API_URL` points at the HTTPS API, then rebuild with `npm run android` |
| "Can't reach the server" on the first launch | Render's free tier is waking up; it retries fine after 30–60 seconds |
| CORS error in `chrome://inspect` | Make sure the API runs the current code; it always allows `https://localhost` |
| Old screens after an update | Run `npm run android` again; `cap sync` copies the new `dist/` |
