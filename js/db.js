// db.js - tiny IndexedDB wrapper for Memory Vault
const DB_NAME = "MemoryVaultDB";
const DB_VER = 1;
let _dbPromise = null;

function openDatabase() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "email" });
      }
      if (!db.objectStoreNames.contains("files")) {
        const fs = db.createObjectStore("files", { keyPath: "id" });
        fs.createIndex("by_owner", "owner", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

// Users
async function addUser(user) {
  const db = await openDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const req = store.add(user);
    req.onsuccess = () => res(true);
    req.onerror = (e) => rej(e.target.error);
  });
}
async function getUser(email) {
  const db = await openDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.get(email);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// Files
async function putFile(rec) {
  const db = await openDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const req = store.put(rec);
    req.onsuccess = () => res(true);
    req.onerror = (e) => rej(e.target.error);
  });
}
async function getFilesByOwner(owner) {
  const db = await openDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const idx = store.index("by_owner");
    const req = idx.getAll(owner);
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
async function getFileById(id) {
  const db = await openDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const req = store.get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function deleteFile(id) {
  const db = await openDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    const req = store.delete(id);
    req.onsuccess = () => res(true);
    req.onerror = (e) => rej(e.target.error);
  });
}
async function clearFilesByOwner(owner) {
  const files = await getFilesByOwner(owner);
  for (const f of files) await deleteFile(f.id);
  return true;
}
