import { randomUUID } from "node:crypto";

import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";

export interface LogEntry {
  id: string;
  locationId: string;
  message: string;
  timestamp: string;
}

const containerName = process.env.LOG_BLOB_CONTAINER ?? "volcano-logs";
const blobName = process.env.LOG_BLOB_NAME ?? "location-log.json";

let containerClientPromise: Promise<ContainerClient> | undefined;

async function getContainerClient(): Promise<ContainerClient> {
  const connectionString = process.env.AzureWebJobsStorage;

  if (!connectionString) {
    throw new Error("AzureWebJobsStorage is not configured.");
  }

  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = serviceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      return containerClient;
    })();
  }

  return containerClientPromise;
}

async function readJson<T>(blobText: string): Promise<T> {
  if (!blobText.trim()) {
    return [] as T;
  }

  return JSON.parse(blobText) as T;
}

async function loadEntries(): Promise<LogEntry[]> {
  const containerClient = await getContainerClient();
  const blobClient = containerClient.getBlockBlobClient(blobName);

  if (!(await blobClient.exists())) {
    return [];
  }

  const downloadResponse = await blobClient.downloadToBuffer();
  return readJson<LogEntry[]>(downloadResponse.toString("utf-8"));
}

async function saveEntries(entries: LogEntry[]): Promise<void> {
  const containerClient = await getContainerClient();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  const body = JSON.stringify(entries, null, 2);

  await blobClient.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: {
      blobContentType: "application/json"
    }
  });
}

export async function appendLogEntry(locationId: string, message: string): Promise<LogEntry> {
  const entries = await loadEntries();
  const entry: LogEntry = {
    id: randomUUID(),
    locationId,
    message,
    timestamp: new Date().toISOString()
  };

  entries.push(entry);
  await saveEntries(entries);
  return entry;
}

export async function clearLogEntries(): Promise<void> {
  await saveEntries([]);
}

export async function getLogEntries(): Promise<LogEntry[]> {
  return loadEntries();
}