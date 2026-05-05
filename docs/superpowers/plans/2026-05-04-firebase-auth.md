# Firebase Email/Password Auth + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AsyncStorage mock auth layer with real Firebase Authentication, wire `AuthContext` + `useAuth()` throughout the app, and add an onboarding screen for avatar/name/username collection.

**Architecture:** `AuthContext` wraps the app root, subscribes to `onAuthStateChanged`, and fetches `users/{uid}` from Firestore before resolving `loading`. All screens call `useAuth()`. `app/index.tsx` drives routing based on auth + onboarding state. `lib/authSession.ts` is deleted.

**Tech Stack:** Firebase JS SDK v12 (`firebase/auth`, `firebase/storage`, `firebase/firestore`), Expo Router, expo-image-picker, React Native, NativeWind / Tailwind

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Install | `expo-image-picker` | image selection on onboarding |
| Modify | `lib/firebase.ts` | export `auth` and `storage` |
| Create | `lib/auth.ts` | signIn / signUp / signOut / resetPassword + error mapping |
| Create | `context/AuthContext.tsx` | AuthProvider + useAuth() hook |
| Modify | `app/_layout.tsx` | wrap Stack with AuthProvider |
| Modify | `app/index.tsx` | routing via useAuth() |
| Modify | `app/(auth)/signin.tsx` | real signIn, loading, inline error, forgot password |
| Modify | `app/(auth)/signup.tsx` | real signUp, loading, inline error, password toggle |
| Create | `app/(auth)/onboarding.tsx` | avatar + name + username + Firestore write |
| Modify | `app/(auth)/_layout.tsx` | register onboarding screen |
| Modify | `app/(tabs)/settings.tsx` | real signOut via useAuth() |
| Delete | `lib/authSession.ts` | no longer needed |
| Create | `__tests__/lib/auth.test.ts` | unit tests for error mapping |

---

## Task 1: Install expo-image-picker

**Files:**
- Modify: `package.json` (via npx expo install)

- [ ] **Step 1: Install the package**

```bash
npx expo install expo-image-picker
```

Expected output includes: `+ expo-image-picker@...`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-image-picker"
```

---

## Task 2: Export `auth` and `storage` from firebase.ts

**Files:**
- Modify: `lib/firebase.ts`

- [ ] **Step 1: Update the file**

Replace the entire contents of `lib/firebase.ts` with:

```ts
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(config);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
```

- [ ] **Step 2: Commit**

```bash
git add lib/firebase.ts
git commit -m "feat(firebase): export auth and storage"
```

---

## Task 3: Create lib/auth.ts with helpers and error mapping

**Files:**
- Create: `lib/auth.ts`
- Create: `__tests__/lib/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/auth.test.ts`:

```ts
import { mapFirebaseError } from '@/lib/auth';

describe('mapFirebaseError', () => {
  it('maps auth/user-not-found', () => {
    expect(mapFirebaseError({ code: 'auth/user-not-found' })).toBe(
      'No account found with this email.'
    );
  });

  it('maps auth/wrong-password', () => {
    expect(mapFirebaseError({ code: 'auth/wrong-password' })).toBe(
      'Incorrect password.'
    );
  });

  it('maps auth/email-already-in-use', () => {
    expect(mapFirebaseError({ code: 'auth/email-already-in-use' })).toBe(
      'An account with this email already exists.'
    );
  });

  it('maps auth/weak-password', () => {
    expect(mapFirebaseError({ code: 'auth/weak-password' })).toBe(
      'Password must be at least 6 characters.'
    );
  });

  it('maps auth/invalid-email', () => {
    expect(mapFirebaseError({ code: 'auth/invalid-email' })).toBe(
      'Enter a valid email address.'
    );
  });

  it('falls back for unknown codes', () => {
    expect(mapFirebaseError({ code: 'auth/unknown' })).toBe(
      'Something went wrong. Try again.'
    );
  });

  it('falls back when no code present', () => {
    expect(mapFirebaseError({})).toBe('Something went wrong. Try again.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/auth.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Create lib/auth.ts**

```ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase';

export function mapFirebaseError(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    default:
      return 'Something went wrong. Try again.';
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ error?: string }> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return {};
  } catch (e) {
    return { error: mapFirebaseError(e) };
  }
}

export async function signUp(
  email: string,
  password: string
): Promise<{ error?: string }> {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    return {};
  } catch (e) {
    return { error: mapFirebaseError(e) };
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(
  email: string
): Promise<{ error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return {};
  } catch (e) {
    return { error: mapFirebaseError(e) };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/lib/auth.test.ts --no-coverage
```

Expected: PASS — 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts __tests__/lib/auth.test.ts
git commit -m "feat(auth): add Firebase auth helpers with error mapping"
```

---

## Task 4: Create context/AuthContext.tsx

**Files:**
- Create: `context/AuthContext.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p context
```

Create `context/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { signIn, signUp, signOut, resetPassword } from '@/lib/auth';

export type UserProfile = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  photoURL: string | null;
  onboardingComplete: boolean;
};

type AuthContextValue = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await fetchProfile(firebaseUser.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchProfile(user.uid);
    setProfile(p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "feat(auth): add AuthContext with useAuth hook"
```

---

## Task 5: Wrap root layout with AuthProvider

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update app/_layout.tsx**

Add the import at the top (after existing imports):

```tsx
import { AuthProvider } from '@/context/AuthContext';
```

Wrap the return value — replace the `<GestureHandlerRootView ...>` block with:

```tsx
return (
  <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#10141a' }}>
    <SafeAreaProvider>
      <AuthProvider>
        <BottomSheetModalProvider>
          {fontsReady ? (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#10141a' },
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="session" options={{ presentation: 'card' }} />
              <Stack.Screen
                name="session/[id]"
                options={{ presentation: 'card' }}
              />
            </Stack>
          ) : null}
          {!splashDone && (
            <AnimatedSplash onAnimationComplete={handleSplashComplete} />
          )}
        </BottomSheetModalProvider>
      </AuthProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(auth): wrap root layout with AuthProvider"
```

---

## Task 6: Update app/index.tsx to use useAuth()

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceContainerLowest }} />
    );
  }

  if (!user) {
    return <Redirect href="/signin" />;
  }

  if (!profile || !profile.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/index.tsx
git commit -m "feat(auth): route from index via useAuth state"
```

---

## Task 7: Update signin.tsx — real auth, loading, errors, forgot password

**Files:**
- Modify: `app/(auth)/signin.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import {
  AuthSocialDivider,
  LabeledField,
} from '@/components/auth/AuthFormFields';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { AuthSocialButtons } from '@/components/auth/AuthSocialButtons';
import { useAuth } from '@/context/AuthContext';
import { fontFamily } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

export default function SignInScreen() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/(tabs)');
  };

  const onForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email address above, then tap Forgot password.');
      return;
    }
    const result = await resetPassword(email.trim());
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Reset link sent', 'Check your inbox for a password reset email.');
    }
  };

  return (
    <AuthScreenLayout>
      <Text
        className="text-left text-primary text-label-md mt-26 mb-1"
        style={{ fontFamily: fontFamily.semibold }}
      >
        Member portal
      </Text>
      <Text
        className="text-left text-3xl font-bold text-on-surface uppercase tracking-wide mt-4 mb-8"
        style={{ fontFamily: fontFamily.bold }}
      >
        Welcome{'\n'}back
      </Text>

      <LabeledField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="runner@trackooo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <LabeledField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        rightAccessory={
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={12}
            className="p-1"
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        }
      />

      <Pressable onPress={onForgotPassword} className="self-end mb-6">
        <Text
          className="text-[11px] font-semibold tracking-[0.12em] text-on-surface-variant uppercase"
          style={{ fontFamily: fontFamily.semibold }}
        >
          Forgot password?
        </Text>
      </Pressable>

      {error ? (
        <Text
          className="text-sm text-error mb-4 text-center"
          style={{ fontFamily: fontFamily.regular }}
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={onSignIn}
        disabled={loading}
        className="rounded-[12px] bg-primary py-[18px] px-6 active:opacity-90"
        style={{
          opacity: loading ? 0.7 : 1,
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-center gap-2">
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text
                className="text-base font-bold uppercase tracking-[0.14em] text-on-primary"
                style={{ fontFamily: fontFamily.bold }}
              >
                Sign in
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
            </>
          )}
        </View>
      </Pressable>

      <AuthSocialDivider />
      <AuthSocialButtons />

      <View className="flex-row flex-wrap items-center justify-center gap-1 mt-10">
        <Text
          className="text-sm text-on-surface-variant uppercase tracking-wide"
          style={{ fontFamily: fontFamily.regular }}
        >
          New to the track?
        </Text>
        <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
          <Text
            className="text-sm font-bold uppercase tracking-wide text-primary"
            style={{ fontFamily: fontFamily.bold }}
          >
            Create account
          </Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/signin.tsx
git commit -m "feat(auth): wire real Firebase signIn with loading and error states"
```

---

## Task 8: Update signup.tsx — real auth, loading, errors, password toggle

**Files:**
- Modify: `app/(auth)/signup.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import {
  AuthSocialDivider,
  LabeledField,
} from '@/components/auth/AuthFormFields';
import { AuthSocialButtons } from '@/components/auth/AuthSocialButtons';
import { useAuth } from '@/context/AuthContext';
import { fontFamily } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onCreateAccount = async () => {
    if (!email.trim() || !password) {
      setError('Fill in your email and password.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the terms to continue.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await signUp(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/onboarding');
  };

  return (
    <AuthScreenLayout>
      <Text
        className="text-center text-3xl font-bold text-on-surface uppercase tracking-wide mt-6 mb-8"
        style={{ fontFamily: fontFamily.bold }}
      >
        Join the elite
      </Text>

      <LabeledField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="user@protocol.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <LabeledField
        label="Security protocol (password)"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        rightAccessory={
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={12}
            className="p-1"
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        }
      />

      <Pressable
        onPress={() => setAgreed((a) => !a)}
        className="flex-row gap-3 items-start mb-8 mt-1"
      >
        <View
          className="mt-0.5 w-[22px] h-[22px] rounded-full items-center justify-center border-2"
          style={{
            borderColor: colors.primary,
            backgroundColor: agreed ? colors.primary : 'transparent',
          }}
        >
          {agreed ? (
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
          ) : null}
        </View>
        <Text
          className="flex-1 text-[11px] leading-5 text-on-surface-variant uppercase tracking-wide"
          style={{ fontFamily: fontFamily.regular }}
        >
          I agree to the{' '}
          <Text className="text-primary font-bold" style={{ fontFamily: fontFamily.bold }}>
            terms of engagement
          </Text>
          {' '}and{' '}
          <Text className="text-primary font-bold" style={{ fontFamily: fontFamily.bold }}>
            data protocols.
          </Text>
        </Text>
      </Pressable>

      {error ? (
        <Text
          className="text-sm text-error mb-4 text-center"
          style={{ fontFamily: fontFamily.regular }}
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={onCreateAccount}
        disabled={loading}
        className="rounded-[12px] bg-primary py-[18px] px-6 active:opacity-90"
        style={{
          opacity: loading ? 0.7 : 1,
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text
            className="text-center text-base font-bold uppercase tracking-[0.14em] text-on-primary"
            style={{ fontFamily: fontFamily.bold }}
          >
            Create account
          </Text>
        )}
      </Pressable>

      <AuthSocialDivider />
      <AuthSocialButtons />

      <View className="flex-row flex-wrap items-center justify-center gap-1 mt-10">
        <Text
          className="text-sm text-on-surface-variant uppercase tracking-wide"
          style={{ fontFamily: fontFamily.regular }}
        >
          Already registered?
        </Text>
        <Pressable onPress={() => router.push('/signin')} hitSlop={8}>
          <Text
            className="text-sm font-bold uppercase tracking-wide text-primary"
            style={{ fontFamily: fontFamily.bold }}
          >
            Login to hub
          </Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/signup.tsx
git commit -m "feat(auth): wire real Firebase signUp with loading, error, password toggle"
```

---

## Task 9: Create onboarding screen

**Files:**
- Create: `app/(auth)/onboarding.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { LabeledField } from '@/components/auth/AuthFormFields';
import { useAuth } from '@/context/AuthContext';
import { fontFamily } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import { db, storage } from '@/lib/firebase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const onComplete = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setError('First name, last name, and username are required.');
      return;
    }
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (cleanUsername !== username.trim()) {
      setError('Username must be lowercase with no spaces.');
      return;
    }
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      let photoURL: string | null = null;

      if (avatarUri) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: cleanUsername,
        email: user.email ?? '',
        photoURL,
        createdAt: serverTimestamp(),
        onboardingComplete: true,
      });

      await refreshProfile();
      router.replace('/(tabs)');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <Text
        className="text-left text-primary text-label-md mt-26 mb-1"
        style={{ fontFamily: fontFamily.semibold }}
      >
        One last step
      </Text>
      <Text
        className="text-left text-3xl font-bold text-on-surface uppercase tracking-wide mt-4 mb-8"
        style={{ fontFamily: fontFamily.bold }}
      >
        Build your{'\n'}profile
      </Text>

      {/* Avatar picker */}
      <Pressable onPress={pickAvatar} className="self-center mb-8">
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            className="w-24 h-24 rounded-full"
          />
        ) : (
          <View
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surfaceContainerHigh }}
          >
            <Ionicons name="camera-outline" size={32} color={colors.onSurfaceVariant} />
          </View>
        )}
        <Text
          className="text-center text-[11px] mt-2 text-primary uppercase tracking-wide"
          style={{ fontFamily: fontFamily.semibold }}
        >
          {avatarUri ? 'Change photo' : 'Add photo'}
        </Text>
      </Pressable>

      <LabeledField
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Your first name"
        autoCapitalize="words"
      />

      <LabeledField
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        placeholder="Your last name"
        autoCapitalize="words"
      />

      <LabeledField
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="yourhandle"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? (
        <Text
          className="text-sm text-error mb-4 text-center"
          style={{ fontFamily: fontFamily.regular }}
        >
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={onComplete}
        disabled={loading}
        className="rounded-[12px] bg-primary py-[18px] px-6 active:opacity-90 mt-2"
        style={{
          opacity: loading ? 0.7 : 1,
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-center gap-2">
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text
                className="text-base font-bold uppercase tracking-[0.14em] text-on-primary"
                style={{ fontFamily: fontFamily.bold }}
              >
                Let's go
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
            </>
          )}
        </View>
      </Pressable>
    </AuthScreenLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/onboarding.tsx
git commit -m "feat(auth): add onboarding screen with avatar, name, username"
```

---

## Task 10: Register onboarding in auth layout

**Files:**
- Modify: `app/(auth)/_layout.tsx`

- [ ] **Step 1: Update the file**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/_layout.tsx
git commit -m "feat(auth): register onboarding screen in auth layout"
```

---

## Task 11: Update settings.tsx — real Firebase signOut

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Replace the signOut logic**

Replace the entire contents of `app/(tabs)/settings.tsx`:

```tsx
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
  const { signOut } = useAuth();

  const onSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-6 pt-6 bg-surface">
          <Text className="text-label-md text-on-surface-variant">
            Neon Cartographer
          </Text>
          <Text className="text-display-lg text-on-surface mt-2">
            System{'\n'}
            <Text className="text-primary">Settings.</Text>
          </Text>
          <Text className="text-body-md text-on-surface-variant mt-4">
            Configure data frequency, unit systems, and cloud synchronization.
          </Text>

          <Pressable
            onPress={onSignOut}
            className="mt-10 self-start rounded-xl border border-outline px-5 py-3 active:opacity-80"
          >
            <Text className="text-label-md text-on-surface-variant">
              Sign out
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/settings.tsx
git commit -m "feat(auth): wire real Firebase signOut in settings"
```

---

## Task 12: Delete lib/authSession.ts

**Files:**
- Delete: `lib/authSession.ts`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "authSession" --include="*.ts" --include="*.tsx" .
```

Expected: no output (all imports were replaced in previous tasks).

- [ ] **Step 2: Delete the file**

```bash
git rm lib/authSession.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(auth): remove authSession mock — replaced by Firebase auth state"
```

---

## Manual Testing Checklist

After all tasks are complete, run the app and verify:

- [ ] App launches → redirected to `/signin` (not logged in)
- [ ] Sign up with a new email → redirected to `/onboarding`
- [ ] Onboarding: skip avatar, fill name + username → taps "Let's go" → redirected to `/(tabs)`
- [ ] Onboarding: pick avatar, fill name + username → taps "Let's go" → profile pic visible (check Firestore + Storage in Firebase Console)
- [ ] Sign out from Settings → redirected to `/signin`
- [ ] Sign in with correct credentials → redirected to `/(tabs)` (skips onboarding since `onboardingComplete: true`)
- [ ] Sign in with wrong password → shows "Incorrect password." inline error
- [ ] Sign in with non-existent email → shows "No account found with this email."
- [ ] Sign up with already-used email → shows "An account with this email already exists."
- [ ] Forgot password → type email → shows Alert confirmation
- [ ] Forgot password → empty email field → shows "Enter your email" alert
- [ ] Kill app mid-session → relaunch → stays logged in (Firebase persists session)
