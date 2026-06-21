declare const Buffer: {
  byteLength(value: string, encoding?: string): number;
};

declare const process: {
  env: Record<string, string | undefined>;
};

declare module "@azure/functions" {
  export interface HttpRequest {
    json(): Promise<unknown>;
  }

  export interface HttpResponseInit {
    status?: number;
    headers?: Record<string, string>;
    jsonBody?: unknown;
    body?: string;
  }

  export interface InvocationContext {
    log(...args: unknown[]): void;
  }

  export const app: {
    http(name: string, options: {
      methods: string[];
      authLevel: string;
      route: string;
      handler: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> | HttpResponseInit;
    }): void;
  };
}

declare module "@azure/storage-blob" {
  export class BlobServiceClient {
    static fromConnectionString(connectionString: string): {
      getContainerClient(name: string): ContainerClient;
    };
  }

  export interface ContainerClient {
    createIfNotExists(): Promise<void>;
    getBlockBlobClient(name: string): BlockBlobClient;
  }

  export interface BlockBlobClient {
    exists(): Promise<boolean>;
    downloadToBuffer(): Promise<{
      toString(encoding?: string): string;
    }>;
    upload(body: string, length: number, options?: {
      blobHTTPHeaders?: {
        blobContentType?: string;
      };
    }): Promise<void>;
  }
}

declare module "node:crypto" {
  export function randomUUID(): string;
}