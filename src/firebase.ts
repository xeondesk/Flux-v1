import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User
} from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

// Google Auth Provider setup
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});
// Add Workspace Google Tasks API scope
googleProvider.addScope("https://www.googleapis.com/auth/tasks");

// In-memory access token caching as instructed by SKILL.md
let cachedAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
}

// Interactive Google SignIn Handler using Popup as suggested
let isSigningIn = false;

export async function signInWithGoogle() {
  if (isSigningIn) {
    console.warn("⚠️ [Firebase] A sign-in popup request is already in progress. Ignoring duplicate call.");
    return auth.currentUser;
  }
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      console.log("🌸 [Firebase] Google Tasks OAuth token successfully cached in memory.");
    }
    return result.user;
  } catch (error: any) {
    const errCode = error?.code || "";
    const errMsg = error?.message || String(error);
    
    const isCancellation = 
      errCode === "auth/cancelled-popup-request" ||
      errMsg.includes("cancelled-popup-request") ||
      errCode === "auth/popup-closed-by-user" ||
      errMsg.includes("popup-closed-by-user");

    const isNetwork = 
      errCode === "auth/network-request-failed" ||
      errMsg.includes("network-request-failed") ||
      errMsg.includes("network request failed") ||
      errMsg.includes("Failed to fetch") ||
      errMsg.includes("NetworkError") ||
      errMsg.includes("offline");

    if (isCancellation) {
      console.log("ℹ️ [Firebase] Sign-in popup was cancelled or closed by user: ", errCode || errMsg);
    } else if (isNetwork) {
      console.warn("ℹ️ [Firebase] Network request failed. Check internet access or sandbox proxy constraints: ", errCode || errMsg);
    } else {
      console.error("Firebase Sign-In Error: ", error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
}

// Interactive Logout Handler
export async function logOut() {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Firebase Sign-Out Error: ", error);
    throw error;
  }
}

import { onAuthStateChanged } from "firebase/auth";
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

// Connection test helper as specified in SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("⚠️ [Firebase] Router indicates client is offline. Please check your network connection.");
    }
  }
}
testConnection();

// Standard High-Performance Error Handling specification as requested by SKILL.md Section 3
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("❌ Firestore Permission/Operation Error: ", JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}
