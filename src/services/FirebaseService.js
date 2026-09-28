import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    browserLocalPersistence,
    browserPopupRedirectResolver,
    createUserWithEmailAndPassword,
    initializeAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile
} from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { Events } from "../core/Events.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const REQUIRED_CONFIG = ["apiKey", "authDomain", "projectId", "appId"];

export default class FirebaseService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.app = null;
        this.auth = null;
        this.db = null;
        this.configured = REQUIRED_CONFIG.every(key => Boolean(firebaseConfig[key]));
        this.unsubscribeAuth = null;
    }

    initialize() {
        if (!this.configured) return false;

        try {
            this.app = getApps()[0] ?? initializeApp(firebaseConfig);

            try {
                this.auth = initializeAuth(this.app, {
                    persistence: [browserLocalPersistence],
                    popupRedirectResolver: browserPopupRedirectResolver
                });
            } catch (error) {
                if (error?.code === "auth/already-initialized") this.auth = getAuth(this.app);
                else throw error;
            }

            this.db = getFirestore(this.app);
            this.unsubscribeAuth = onAuthStateChanged(this.auth, user => {
                this.eventBus.emit(Events.AUTH_CHANGED, user ? this.serializeUser(user) : null);
            });

            return true;
        } catch (error) {
            this.emitError(error);
            return false;
        }
    }

    isConfigured() {
        return this.configured && Boolean(this.auth && this.db);
    }

    get currentUser() {
        return this.auth?.currentUser ?? null;
    }

    get user() {
        return this.currentUser ? this.serializeUser(this.currentUser) : null;
    }

    async register(email, password, displayName = "") {
        this.requireConfigured();
        try {
            const result = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
            const name = String(displayName ?? "").trim().slice(0, 80);

            if (name) await updateProfile(result.user, { displayName: name });

            await this.ensureUserProfile(result.user);
            return this.serializeUser(result.user);
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async signIn(email, password) {
        this.requireConfigured();
        try {
            const result = await signInWithEmailAndPassword(this.auth, email.trim(), password);
            await this.ensureUserProfile(result.user);
            return this.serializeUser(result.user);
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async signInWithGoogle() {
        this.requireConfigured();
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(this.auth, provider);
            await this.ensureUserProfile(result.user);
            return this.serializeUser(result.user);
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async signOut() {
        this.requireConfigured();
        try {
            await signOut(this.auth);
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async listPresets(deviceId = null) {
        const user = this.requireUser();
        try {
            const presetsRef = collection(this.db, "users", user.uid, "presets");
            const snapshot = await getDocs(query(presetsRef, orderBy("updatedAt", "desc")));
            return snapshot.docs
                .map(item => ({ id: item.id, ...item.data() }))
                .filter(item => !deviceId || item.deviceId === deviceId)
                .map(item => ({
                    id: item.id,
                    name: String(item.name ?? "Untitled"),
                    deviceId: item.deviceId ?? null,
                    model: item.model ?? null,
                    configuration: item.configuration ?? {},
                    savedAt: item.updatedAt?.toDate?.()?.toISOString?.() ?? item.savedAt ?? null
                }));
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async savePreset(name, deviceId, model, configuration) {
        const user = this.requireUser();
        const normalized = String(name ?? "").trim().slice(0, 40);
        if (!normalized) throw new Error("Preset name is required.");

        try {
            const presetsRef = collection(this.db, "users", user.uid, "presets");
            const existing = await getDocs(presetsRef);
            const match = existing.docs.find(item => item.data()?.name === normalized && item.data()?.deviceId === deviceId);
            const presetRef = match ? match.ref : doc(presetsRef);

            await setDoc(presetRef, {
                name: normalized,
                deviceId: deviceId ?? null,
                model: model ?? null,
                configuration: structuredClone(configuration ?? {}),
                ownerUid: user.uid,
                updatedAt: serverTimestamp(),
                ...(match ? {} : { createdAt: serverTimestamp() })
            }, { merge: true });

            return { id: presetRef.id, name: normalized };
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async deletePreset(presetId) {
        const user = this.requireUser();
        if (!presetId) return false;

        try {
            await deleteDoc(doc(this.db, "users", user.uid, "presets", presetId));
            return true;
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async ensureUserProfile(user = this.currentUser) {
        if (!user || !this.db) return;
        const userRef = doc(this.db, "users", user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            photoURL: user.photoURL ?? null,
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    requireConfigured() {
        if (!this.isConfigured()) {
            throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* variables to your local environment.");
        }
    }

    requireUser() {
        this.requireConfigured();
        if (!this.currentUser) throw new Error("You must be signed in to use this feature.");
        return this.currentUser;
    }

    emitError(error) {
        console.error("[Firebase]", error);
        this.eventBus.emit(Events.AUTH_ERROR, error);
    }

    serializeUser(user) {
        return {
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? "",
            photoURL: user.photoURL ?? "",
            emailVerified: Boolean(user.emailVerified)
        };
    }

    destroy() {
        this.unsubscribeAuth?.();
        this.unsubscribeAuth = null;
    }
}
