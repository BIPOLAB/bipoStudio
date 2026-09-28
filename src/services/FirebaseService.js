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
    setDoc,
    where
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
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
        this.storage = null;
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
            this.storage = getStorage(this.app);
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

    async updateProfile(displayName) {
        const user = this.requireUser();
        const normalized = String(displayName ?? "").trim().slice(0, 80);
        if (!normalized) throw new Error("Profile name is required.");
        try {
            await updateProfile(user, { displayName: normalized });
            await this.ensureUserProfile(user);
            this.emitAuthChanged(user);
            return this.serializeUser(user);
        } catch (error) { this.emitError(error); throw error; }
    }

    async uploadAvatar(file) {
        const user = this.requireUser();
        if (!file) throw new Error("Choose an image first.");
        if (!String(file.type ?? "").startsWith("image/")) throw new Error("Avatar must be an image file.");
        if (Number(file.size ?? 0) > 2 * 1024 * 1024) throw new Error("Avatar must be smaller than 2 MB.");
        try {
            const extension = (String(file.name ?? "").split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "jpg";
            const avatarRef = storageRef(this.storage, `users/${user.uid}/avatar.${extension}`);
            await uploadBytes(avatarRef, file, { contentType: file.type });
            const photoURL = await getDownloadURL(avatarRef);
            await updateProfile(user, { photoURL });
            await this.ensureUserProfile(user);
            this.emitAuthChanged(user);
            return photoURL;
        } catch (error) { this.emitError(error); throw error; }
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
                    category: item.category ?? "DAW",
                    shared: Boolean(item.shared),
                    configuration: item.configuration ?? {},
                    savedAt: item.updatedAt?.toDate?.()?.toISOString?.() ?? item.savedAt ?? null
                }));
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    async savePreset(name, deviceId, model, configuration, category = "DAW") {
        const user = this.requireUser();
        const normalized = String(name ?? "").trim().slice(0, 40);
        const normalizedCategory = ["DAW", "Sequencer", "Synth", "Drums"].includes(category) ? category : "DAW";
        if (!normalized) throw new Error("Preset name is required.");
        try {
            const presetsRef = collection(this.db, "users", user.uid, "presets");
            const existing = await getDocs(presetsRef);
            const match = existing.docs.find(item => item.data()?.name === normalized && item.data()?.deviceId === deviceId);
            const presetRef = match ? match.ref : doc(presetsRef);
            const old = match?.data?.() ?? {};
            await setDoc(presetRef, {
                name: normalized, deviceId: deviceId ?? null, model: model ?? null,
                category: normalizedCategory, shared: Boolean(old.shared),
                configuration: structuredClone(configuration ?? {}), ownerUid: user.uid,
                updatedAt: serverTimestamp(), ...(match ? {} : { createdAt: serverTimestamp() })
            }, { merge: true });
            if (old.shared) await this.publishPreset(presetRef.id);
            return { id: presetRef.id, name: normalized, category: normalizedCategory, shared: Boolean(old.shared) };
        } catch (error) { this.emitError(error); throw error; }
    }

    async updatePreset(presetId, changes = {}) {
        const user = this.requireUser();
        if (!presetId) throw new Error("Preset id is required.");
        try {
            const presetRef = doc(this.db, "users", user.uid, "presets", presetId);
            const snapshot = await getDocs(query(collection(this.db, "users", user.uid, "presets")));
            const match = snapshot.docs.find(item => item.id === presetId);
            if (!match) throw new Error("Preset was not found.");
            const data = match.data();
            const category = ["DAW", "Sequencer", "Synth", "Drums"].includes(changes.category) ? changes.category : (data.category ?? "DAW");
            const shared = changes.shared == null ? Boolean(data.shared) : Boolean(changes.shared);
            await setDoc(presetRef, { category, shared, updatedAt: serverTimestamp() }, { merge: true });
            if (shared) await this.publishPreset(presetId); else await this.unpublishPreset(presetId);
            return { id: presetId, shared, category };
        } catch (error) { this.emitError(error); throw error; }
    }

    async publishPreset(presetId) {
        const user = this.requireUser();
        const snapshot = await getDocs(query(collection(this.db, "users", user.uid, "presets")));
        const source = snapshot.docs.find(item => item.id === presetId);
        if (!source) throw new Error("Preset was not found.");
        const data = source.data();
        const category = ["DAW", "Sequencer", "Synth", "Drums"].includes(data.category) ? data.category : "DAW";
        await setDoc(doc(this.db, "communityPresets", presetId), {
            sourcePresetId: presetId, ownerUid: user.uid,
            ownerName: user.displayName ?? user.email ?? "bipoLab user",
            ownerPhotoURL: user.photoURL ?? "", name: data.name ?? "Untitled",
            deviceId: data.deviceId ?? null, model: data.model ?? null, category,
            shared: true, configuration: structuredClone(data.configuration ?? {}),
            updatedAt: serverTimestamp()
        });
        await setDoc(doc(this.db, "users", user.uid, "presets", presetId), { shared: true, category, updatedAt: serverTimestamp() }, { merge: true });
        return true;
    }

    async unpublishPreset(presetId) {
        const user = this.requireUser();
        await deleteDoc(doc(this.db, "communityPresets", presetId));
        await setDoc(doc(this.db, "users", user.uid, "presets", presetId), { shared: false, updatedAt: serverTimestamp() }, { merge: true });
        return true;
    }

    async listCommunityPresets(category = null) {
        this.requireConfigured();
        try {
            const constraints = [where("shared", "==", true)];
            if (["DAW", "Sequencer", "Synth", "Drums"].includes(category)) constraints.push(where("category", "==", category));
            const snapshot = await getDocs(query(collection(this.db, "communityPresets"), ...constraints));
            return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
                .sort((a,b) => String(b.updatedAt?.toDate?.() ?? "").localeCompare(String(a.updatedAt?.toDate?.() ?? "")))
                .map(item => ({ id:item.id, name:String(item.name ?? "Untitled"), model:item.model ?? null, category:item.category ?? "DAW", ownerUid:item.ownerUid ?? null, ownerName:item.ownerName ?? "bipoLab user", ownerPhotoURL:item.ownerPhotoURL ?? "", configuration:item.configuration ?? {}, savedAt:item.updatedAt?.toDate?.()?.toISOString?.() ?? null }));
        } catch (error) { this.emitError(error); throw error; }
    }

    async deletePreset(presetId) {
        const user = this.requireUser();
        if (!presetId) return false;
        try {
            const presetRef = doc(this.db, "users", user.uid, "presets", presetId);
            const snapshot = await getDocs(query(collection(this.db, "users", user.uid, "presets")));
            const match = snapshot.docs.find(item => item.id === presetId);
            if (!match) return false;
            if (match.data()?.shared) await deleteDoc(doc(this.db, "communityPresets", presetId));
            await deleteDoc(presetRef);
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

    emitAuthChanged(user = this.currentUser) {
        this.eventBus.emit(Events.AUTH_CHANGED, user ? this.serializeUser(user) : null);
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
