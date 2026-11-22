import { FirebaseError, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Language, UserShopProfile } from '../types/models';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const firebaseInitStatus = {
  firebaseInitialized: Boolean(app && auth && db),
  googleProviderInitialized: googleProvider instanceof GoogleAuthProvider,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export type GoogleSignInErrorKind =
  | 'popup_closed'
  | 'popup_blocked'
  | 'unauthorized_domain'
  | 'operation_not_allowed'
  | 'unsupported_env'
  | 'network'
  | 'generic';

export type GoogleAuthMethod = 'signInWithPopup' | 'signInWithRedirect' | 'getRedirectResult';

export class GoogleSignInFailure extends Error {
  readonly kind: GoogleSignInErrorKind;
  readonly errorCode?: string;
  readonly authMethod?: GoogleAuthMethod;

  constructor(
    kind: GoogleSignInErrorKind,
    message: string,
    errorCode?: string,
    authMethod?: GoogleAuthMethod
  ) {
    super(message);
    this.kind = kind;
    this.errorCode = errorCode;
    this.authMethod = authMethod;
  }
}

export function classifyFirebaseAuthError(
  err: unknown,
  authMethod?: GoogleAuthMethod
): GoogleSignInFailure {
  if (err instanceof GoogleSignInFailure) {
    return authMethod && !err.authMethod
      ? new GoogleSignInFailure(err.kind, err.message, err.errorCode, authMethod)
      : err;
  }
  if (err instanceof FirebaseError) {
    if (
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/user-cancelled' ||
      err.code === 'auth/redirect-cancelled-by-user'
    ) {
      return new GoogleSignInFailure('popup_closed', err.message, err.code, authMethod);
    }
    if (err.code === 'auth/popup-blocked') {
      return new GoogleSignInFailure('popup_blocked', err.message, err.code, authMethod);
    }
    if (err.code === 'auth/unauthorized-domain') {
      return new GoogleSignInFailure('unauthorized_domain', err.message, err.code, authMethod);
    }
    if (err.code === 'auth/operation-not-allowed') {
      return new GoogleSignInFailure('operation_not_allowed', err.message, err.code, authMethod);
    }
    if (
      err.code === 'auth/operation-not-supported-in-this-environment' ||
      err.code === 'auth/web-storage-unsupported'
    ) {
      return new GoogleSignInFailure('unsupported_env', err.message, err.code, authMethod);
    }
    if (err.code === 'auth/network-request-failed') {
      return new GoogleSignInFailure('network', err.message, err.code, authMethod);
    }
    return new GoogleSignInFailure('generic', err.message, err.code, authMethod);
  }
  return new GoogleSignInFailure(
    'generic',
    err instanceof Error ? err.message : 'Google Sign-In failed',
    undefined,
    authMethod
  );
}

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (err) {
    throw classifyFirebaseAuthError(err, 'signInWithPopup');
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (err) {
    throw classifyFirebaseAuthError(err, 'signInWithRedirect');
  }
}

export async function resolveGoogleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err) {
    throw classifyFirebaseAuthError(err, 'getRedirectResult');
  }
}

export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

function clampString(value: string | null | undefined, maxLen: number): string {
  return (value || '').trim().slice(0, maxLen);
}

function timestampToIso(val: unknown, fallback: string): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return fallback;
}

export function isOfflineFirestoreError(error: unknown): boolean {
  if (error instanceof FirebaseError && error.code === 'unavailable') {
    return true;
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('the client is offline') || msg.includes('client is offline');
}

export async function fetchRemoteUserProfile(uid: string): Promise<UserShopProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    const nowIso = new Date().toISOString();
    return {
      uid: String(d.uid || uid),
      email: String(d.email || ''),
      ownerName: String(d.ownerName || ''),
      shopName: String(d.shopName || ''),
      shopPhone: String(d.shopPhone || ''),
      shopAddress: String(d.shopAddress || ''),
      photoUrl: String(d.photoUrl || ''),
      setupCompleted: Boolean(d.setupCompleted),
      language: d.language === 'en' ? 'en' : 'gu',
      createdAt: timestampToIso(d.createdAt, nowIso),
      updatedAt: timestampToIso(d.updatedAt, nowIso),
    };
  } catch (error) {
    if (isOfflineFirestoreError(error)) {
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveRemoteUserProfile(input: {
  uid: string;
  email: string;
  ownerName: string;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  photoUrl: string;
  setupCompleted: boolean;
  language: Language;
}): Promise<UserShopProfile> {
  const path = `users/${input.uid}`;
  const docRef = doc(db, 'users', input.uid);

  const fallbackEmail =
    auth.currentUser?.email || auth.currentUser?.providerData?.find((p) => p.email)?.email || '';
  const sanitizedOwner = clampString(input.ownerName, 120) || 'Shop Owner';
  const sanitizedShop = clampString(input.shopName, 160) || 'Kirana Store';
  const rawDigits = (input.shopPhone || '').replace(/\D/g, '').slice(-10);
  const sanitizedPhone = rawDigits.length === 10 ? rawDigits : '';
  const sanitizedAddress = clampString(input.shopAddress, 300);
  const sanitizedPhoto = clampString(input.photoUrl, 500);
  const sanitizedEmail = clampString(input.email || fallbackEmail, 200);

  let exists = false;
  try {
    const existingSnap = await getDoc(docRef);
    exists = existingSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!exists) {
      await setDoc(docRef, {
        uid: clampString(input.uid, 128),
        email: sanitizedEmail,
        ownerName: sanitizedOwner,
        shopName: sanitizedShop,
        shopPhone: sanitizedPhone,
        shopAddress: sanitizedAddress,
        photoUrl: sanitizedPhoto,
        setupCompleted: Boolean(input.setupCompleted),
        language: input.language,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ownerName: sanitizedOwner,
        shopName: sanitizedShop,
        shopPhone: sanitizedPhone,
        shopAddress: sanitizedAddress,
        photoUrl: sanitizedPhoto,
        setupCompleted: Boolean(input.setupCompleted),
        language: input.language,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  const nowIso = new Date().toISOString();
  return {
    uid: input.uid,
    email: sanitizedEmail,
    ownerName: sanitizedOwner,
    shopName: sanitizedShop,
    shopPhone: sanitizedPhone,
    shopAddress: sanitizedAddress,
    photoUrl: sanitizedPhoto,
    setupCompleted: Boolean(input.setupCompleted),
    language: input.language,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
