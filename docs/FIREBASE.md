# Firebase integration

bipoStudio uses Firebase Authentication for accounts and Cloud Firestore for cloud presets.

## 1. Create/register the Firebase Web App

In Firebase Console:

1. Create or select the bipoLab Firebase project.
2. Register a **Web app**.
3. Enable Authentication providers:
   - Email/Password
   - Google
4. Create a Cloud Firestore database in production/locked mode.
5. Add the rules from `firestore.rules`.

Firebase's web SDK uses the modular API and the web app configuration object. The Firebase web configuration is intended to be used by the client; it is **not** a replacement for access control. Authentication and Firestore Security Rules protect user data.

## 2. Local environment variables

Copy:

```sh
cp .env.example .env.local
```

Then put the values from Firebase Console > Project settings > Your apps > Web app into:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

For example:

```text
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=bipolab-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bipolab-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=bipolab-xxxxx.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Do not put a Firebase Admin SDK service-account JSON, private key, FCM server key, or other server credential in these variables.** There must be no service-account secret in the browser build.

Important: Vite exposes variables prefixed with `VITE_` to the browser bundle. That is intentional for the Firebase Web App configuration. These values must therefore be protected by Firebase Authentication, Security Rules and appropriate API-key restrictions; they are not secrets.

## 3. Google authentication

In Firebase Console > Authentication > Sign-in method, enable Google.

For development/production, add the application's domains under Authentication > Settings > Authorized domains as required.

The bipoStudio Google button uses `signInWithPopup()`.

## 4. Firestore data model

User data is isolated under:

```text
/users/{uid}
/users/{uid}/presets/{presetId}
```

Each preset stores:

- `name`
- `deviceId`
- `model`
- `configuration`
- `ownerUid`
- `createdAt`
- `updatedAt`

The rules require the authenticated Firebase UID to match the path UID and the preset owner UID.

## 5. Local versus cloud presets

Without Firebase configuration or without a signed-in user, bipoStudio continues to work locally.

With Firebase configured and a user signed in:

- account authentication uses Firebase Authentication;
- cloud preset operations use Firestore;
- local mock/device configuration remains local;
- the existing local preset system remains available as a local fallback.

The firmware/device configuration is still not stored in Firebase automatically. This is deliberate: the connected device remains the source of truth for hardware configuration.

## 6. Production deployment

Set the same `VITE_FIREBASE_*` variables in the build/deployment environment instead of committing an `.env.local` file.

Never use Firebase Admin credentials in the Vite client.

For production, also restrict the Firebase Web API key to the APIs/domains appropriate for this project and keep Firestore rules deployed in locked/owner-only form.
