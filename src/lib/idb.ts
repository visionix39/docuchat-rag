import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Chunk, DocMeta } from "./types";

interface RagDB extends DBSchema {
  docs: { key: string; value: DocMeta };
  chunks: { key: string; value: Chunk; indexes: { docId: string } };
  kv: { key: string; value: unknown };
}

const DB_NAME = "docuchat-rag";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RagDB>> | null = null;

function db() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable in this browser context.");
  }
  dbPromise ??= openDB<RagDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("docs")) {
        database.createObjectStore("docs", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("chunks")) {
        const store = database.createObjectStore("chunks", { keyPath: "id" });
        store.createIndex("docId", "docId");
      }
      if (!database.objectStoreNames.contains("kv")) {
        database.createObjectStore("kv");
      }
    },
  });
  return dbPromise;
}

export async function putDoc(doc: DocMeta) {
  await (await db()).put("docs", doc);
}

export async function allDocs(): Promise<DocMeta[]> {
  const docs = await (await db()).getAll("docs");
  return docs.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putChunks(chunks: Chunk[]) {
  const database = await db();
  const tx = database.transaction("chunks", "readwrite");
  await Promise.all(chunks.map((chunk) => tx.store.put(chunk)));
  await tx.done;
}

export async function allChunks(): Promise<Chunk[]> {
  return (await db()).getAll("chunks");
}

export async function chunksForDoc(docId: string): Promise<Chunk[]> {
  return (await db()).getAllFromIndex("chunks", "docId", docId);
}

export async function deleteDoc(docId: string) {
  const database = await db();
  const keys = await database.getAllKeysFromIndex("chunks", "docId", docId);
  const tx = database.transaction(["chunks", "docs"], "readwrite");
  await Promise.all(keys.map((key) => tx.objectStore("chunks").delete(key)));
  await tx.objectStore("docs").delete(docId);
  await tx.done;
}

export async function clearAll() {
  const database = await db();
  const tx = database.transaction(["chunks", "docs"], "readwrite");
  await Promise.all([tx.objectStore("chunks").clear(), tx.objectStore("docs").clear()]);
  await tx.done;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db()).get("kv", key) as Promise<T | undefined>;
}

export async function kvSet(key: string, value: unknown) {
  await (await db()).put("kv", value, key);
}

/** Bytes used / available, when the browser exposes the Storage API. */
export async function storageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
