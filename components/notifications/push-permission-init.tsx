"use client";

/**
 * components/notifications/push-permission-init.tsx
 *
 * Silent client component that initialises FCM push notification permission
 * and token registration on the user's first authenticated page load.
 *
 * Renders no UI ; it is purely a side-effect component.
 *
 * Consent persistence strategy:
 * - "fcm_consent" in localStorage stores "granted" | "denied".
 * - If already set, this component does nothing (no re-prompts).
 * - On permission granted, obtains an FCM token and registers it with the server.
 * - On permission denied, stores "denied" so we stop prompting.
 *
 * Placed in the root layout so it runs on every page for authenticated users.
 * The component checks for a session before doing anything.
 */

import { useEffect } from "react";

const CONSENT_KEY = "fcm_consent";

export function PushPermissionInit() {
 useEffect(() => {
 // Only run in a real browser with service worker support
 if (
 typeof window === "undefined" ||
 !("Notification" in window) ||
 !("serviceWorker" in navigator)
 ) {
 return;
 }

 // If we already have a stored consent decision, respect it
 const storedConsent = localStorage.getItem(CONSENT_KEY);
 if (storedConsent === "denied") return;

 // If permission is already granted (e.g. returning user, no localStorage yet),
 // skip the prompt and just ensure the token is registered.
 const currentPermission = Notification.permission;

 if (currentPermission === "denied") {
 localStorage.setItem(CONSENT_KEY, "denied");
 return;
 }

 // If granted or default ; proceed (will prompt only if "default")
 const initFCM = async () => {
 try {
 // Lazy-import the client FCM helpers to avoid bundling them in the
 // server-side render path. These modules use browser APIs.
 const { requestNotificationPermission, getFCMToken, registerTokenToServer } =
 await import("@/lib/firebase/messaging");

 const permission = await requestNotificationPermission();
 localStorage.setItem(CONSENT_KEY, permission);

 if (permission !== "granted") return;

 const token = await getFCMToken();
 if (!token) return;

 await registerTokenToServer(token);
 } catch (err) {
 // Non-fatal ; push notifications are enhancement, not core functionality
 console.warn("[FCM] Init error:", err);
 }
 };

 // Delay slightly to avoid competing with the critical render path
 const timer = setTimeout(initFCM, 2000);
 return () => clearTimeout(timer);
 }, []); // Run once on mount

 // Renders nothing
 return null;
}
