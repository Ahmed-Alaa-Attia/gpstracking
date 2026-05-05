# Firebase Email/Password Auth + Onboarding — Design Spec

**Date:** 2026-05-04  
**Scope:** Phase 1 — email/password only. Google/Apple deferred to Phase 2.

---

## Overview

Replace the current AsyncStorage mock auth layer with real Firebase Authentication. Introduce an `AuthContext` that exposes the current Firebase `User` and their Firestore profile via a `useAuth()` hook available anywhere in the app. Add an onboarding screen after signup for avatar, name, and username collection.

---

## Architecture

```
lib/firebase.ts              → add getAuth + getStorage exports
lib/auth.ts                  → signIn / signUp / signOut / resetPassword helpers
context/AuthContext.tsx       → AuthProvider + useAuth() hook
app/_layout.tsx              → wrap Stack with AuthProvider
app/index.tsx                → reads useAuth() to route: onboarding | tabs | signin
app/(auth)/signin.tsx        → calls useAuth().signIn, loading + error states
app/(auth)/signup.tsx        → calls useAuth().signUp → redirects to /onboarding
app/(auth)/onboarding.tsx    → NEW: avatar picker + firstName + lastName + username
app/(auth)/_layout.tsx       → register onboarding screen
app/(tabs)/settings.tsx      → calls useAuth().signOut
lib/authSession.ts           → DELETED (replaced by Firebase state observer)
```

---

## Firebase Modules

`lib/firebase.ts` exports:
- `app` — FirebaseApp (already exists)
- `db` — Firestore (already exists)
- `auth` — `getAuth(app)`
- `storage` — `getStorage(app)`

---

## Auth Helpers (`lib/auth.ts`)

Thin wrappers over Firebase SDK calls. Each returns `{ error?: string }` so screens handle messaging without knowing Firebase error codes.

| Function | Firebase call | Side effects |
|---|---|---|
| `signIn(email, password)` | `signInWithEmailAndPassword` | — |
| `signUp(email, password)` | `createUserWithEmailAndPassword` | — |
| `signOut()` | `signOut` | — |
| `resetPassword(email)` | `sendPasswordResetEmail` | — |

Error codes mapped to user-friendly messages:
- `auth/user-not-found` → "No account found with this email."
- `auth/wrong-password` → "Incorrect password."
- `auth/email-already-in-use` → "An account with this email already exists."
- `auth/weak-password` → "Password must be at least 6 characters."
- `auth/invalid-email` → "Enter a valid email address."
- Fallback → "Something went wrong. Try again."

---

## AuthContext (`context/AuthContext.tsx`)

```ts
type UserProfile = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  photoURL: string | null;
  createdAt: Timestamp;
  onboardingComplete: boolean;
};

type AuthContextValue = {
  user: FirebaseUser | null;         // Firebase Auth user
  profile: UserProfile | null;       // Firestore users/{uid}
  loading: boolean;                  // true until onAuthStateChanged fires
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>; // re-fetch after onboarding saves
};
```

`AuthProvider` subscribes to `onAuthStateChanged` once. When a user is present, it fetches `users/{uid}` from Firestore. Exposes everything via context. `loading` stays `true` until the first auth state event fires — prevents flash of redirect.

---

## Routing Logic (`app/index.tsx`)

```
loading === true                           → blank/loading view (no flash)
user === null                             → <Redirect href="/signin" />
profile === null || !onboardingComplete   → <Redirect href="/onboarding" />
onboardingComplete === true               → <Redirect href="/(tabs)" />
```

---

## Onboarding Screen (`app/(auth)/onboarding.tsx`)

Shown once after `createUserWithEmailAndPassword`. Steps on a single screen:

1. **Avatar** — `expo-image-picker` to pick from library. Shows circular preview. Optional (user can skip, gets `null` photoURL).
2. **First name** — required
3. **Last name** — required
4. **Username** — required, lowercase, no spaces (validated client-side)

On submit:
1. If avatar selected: upload to Firebase Storage at `avatars/{uid}`, get download URL.
2. Write Firestore doc `users/{uid}`:
   ```ts
   { firstName, lastName, username, email, photoURL, createdAt: serverTimestamp(), onboardingComplete: true }
   ```
3. Call `refreshProfile()` on AuthContext.
4. `router.replace("/(tabs)")`.

Submit button shows loading spinner and is disabled while upload/write is in-flight.

Username uniqueness: deferred to Phase 2 (Firestore query before write). For now, just save as-is.

---

## Screen Changes

### `signin.tsx`
- `onSignIn` calls `useAuth().signIn(email, password)`
- Shows inline error string below submit button on failure
- Button shows loading spinner while in-flight, disabled during load
- "Forgot password?" uses the current email field value; if empty, shows an Alert asking the user to enter their email first. On success, shows confirmation Alert "Reset link sent."

### `signup.tsx`
- `onCreateAccount` calls `useAuth().signUp(email, password)`
- Shows inline error string on failure
- Button shows loading spinner while in-flight
- Add password show/hide toggle (matches signin)
- On success: `router.replace("/onboarding")`

### `settings.tsx`
- `onSignOut` calls `useAuth().signOut()` then `router.replace("/signin")`

---

## Firestore `users/{uid}` Document

```ts
{
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  photoURL: string | null;
  createdAt: Timestamp;
  onboardingComplete: boolean;
}
```

This document is the foundation for feed cards, profile screen, likes, and blog authorship in upcoming phases.

---

## Firebase Storage

Avatar path: `avatars/{uid}` (single file per user, overwritten on re-upload).  
Access rules: authenticated users can read/write their own avatar only.

---

## What Is NOT in Scope (Phase 1)

- Google / Apple sign-in
- Username uniqueness check
- Profile editing after onboarding
- Email verification
- Firestore / Storage security rules (deferred — set before production)
