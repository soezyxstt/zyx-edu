/**
 * lib/firebase/client.ts
 *
 * Firebase client-side app singleton.
 * Must only be imported in client components or inside `useEffect` /
 * dynamic imports ; never at the top level of a Server Component.
 *
 * Config values are read from NEXT_PUBLIC_* env vars so they are safely
 * embedded in the browser bundle.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
 apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
 authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
 projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
 storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
 messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
 appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
 measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Returns the existing Firebase app instance or creates a new one.
 * Safe to call multiple times ; never registers the app twice.
 */
export function getFirebaseApp(): FirebaseApp {
 return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}
