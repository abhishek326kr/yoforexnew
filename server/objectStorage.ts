// Object Storage Service for YoForex EA file uploads
// Supports both Replit sidecar and direct GCS authentication
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface SignURLParams {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}

interface StorageSigner {
  signURL(params: SignURLParams): Promise<string>;
}

class ReplitSidecarSigner implements StorageSigner {
  async signURL(params: SignURLParams): Promise<string> {
    console.log(`[ReplitSidecarSigner] Signing URL via Storage SDK for bucket: ${params.bucketName}, object: ${params.objectName}`);
    
    // Access objectStorageClient lazily (it's created later in the module)
    const bucket = objectStorageClient.bucket(params.bucketName);
    const file = bucket.file(params.objectName);

    const actionMap: Record<string, 'read' | 'write' | 'delete'> = {
      GET: 'read',
      HEAD: 'read',
      PUT: 'write',
      DELETE: 'delete',
    };

    try {
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: actionMap[params.method] || 'read',
        expires: Date.now() + (params.ttlSec * 1000),
      });

      return url;
    } catch (error: any) {
      console.error('[ReplitSidecarSigner] Error signing URL:', error.message);
      throw new Error(
        `Failed to sign URL via Replit sidecar: ${error.message}\n` +
        `Bucket: ${params.bucketName}, Object: ${params.objectName}`
      );
    }
  }
}

class DirectGCSSigner implements StorageSigner {
  private storage: Storage;

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId && !keyFilename) {
      console.warn(
        "[ObjectStorage] Warning: Running in GCS mode but credentials not configured. " +
        "Set GOOGLE_APPLICATION_CREDENTIALS and GCS_PROJECT_ID environment variables."
      );
      console.warn(
        "[ObjectStorage] Falling back to default Google Cloud credentials (Application Default Credentials)."
      );
    }

    try {
      this.storage = new Storage({
        projectId: projectId || undefined,
        keyFilename: keyFilename || undefined,
      });
    } catch (error: any) {
      console.error(
        "[ObjectStorage] Failed to initialize Google Cloud Storage client:",
        error.message
      );
      throw new Error(
        "Failed to initialize Google Cloud Storage. " +
        "Ensure GOOGLE_APPLICATION_CREDENTIALS and GCS_PROJECT_ID are set correctly. " +
        "Error: " + error.message
      );
    }
  }

  async signURL(params: SignURLParams): Promise<string> {
    const bucket = this.storage.bucket(params.bucketName);
    const file = bucket.file(params.objectName);

    const actionMap: Record<string, 'read' | 'write' | 'delete'> = {
      GET: 'read',
      HEAD: 'read',
      PUT: 'write',
      DELETE: 'delete',
    };

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: actionMap[params.method] || 'read',
      expires: Date.now() + (params.ttlSec * 1000),
    });

    return url;
  }
}

function detectStorageMode(): 'replit' | 'gcs' {
  const explicitMode = process.env.STORAGE_MODE?.toLowerCase();
  
  if (explicitMode === 'replit' || explicitMode === 'gcs') {
    console.log(`[ObjectStorage] Using explicit STORAGE_MODE: ${explicitMode}`);
    return explicitMode;
  }

  const isReplit = !!(
    process.env.REPL_ID ||
    process.env.REPL_SLUG ||
    process.env.REPLIT_DEPLOYMENT ||
    process.env.REPLIT_DB_URL
  );

  const mode = isReplit ? 'replit' : 'gcs';
  console.log(`[ObjectStorage] Auto-detected storage mode: ${mode} (REPL_ID=${!!process.env.REPL_ID})`);
  
  return mode;
}

function createStorageClient(): Storage {
  const mode = detectStorageMode();

  if (mode === 'replit') {
    console.log('[ObjectStorage] Initializing Replit sidecar storage client');
    return new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  } else {
    const projectId = process.env.GCS_PROJECT_ID;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId || !keyFilename) {
      console.warn(
        '[ObjectStorage] GCS mode detected but credentials not configured. ' +
        'Set GCS_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS environment variables. ' +
        'Falling back to default credentials.'
      );
      return new Storage();
    }

    console.log('[ObjectStorage] Initializing direct GCS storage client');
    return new Storage({
      projectId,
      keyFilename,
    });
  }
}

export const objectStorageClient = createStorageClient();

export class ObjectStorageService {
  private signer: StorageSigner | null = null;

  constructor() {}

  private getStorageSigner(): StorageSigner {
    if (this.signer) {
      return this.signer;
    }

    const mode = detectStorageMode();

    try {
      if (mode === 'replit') {
        console.log('[ObjectStorage] Creating ReplitSidecarSigner');
        this.signer = new ReplitSidecarSigner();
      } else {
        console.log('[ObjectStorage] Creating DirectGCSSigner');
        this.signer = new DirectGCSSigner();
      }
    } catch (error: any) {
      console.error('[ObjectStorage] Failed to initialize signer:', error.message);
      throw new Error(
        `Failed to initialize storage signer in ${mode} mode: ${error.message}`
      );
    }

    return this.signer;
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      console.warn(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Public object serving disabled."
      );
      return [];
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var.\n" +
          "On Replit: Use bucket ID format (e.g., /xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/content)\n" +
          "On other servers: Use bucket name format (e.g., /your-bucket-name/content)"
      );
    }
    
    // Validate bucket ID format on Replit
    const mode = detectStorageMode();
    if (mode === 'replit') {
      const { bucketName } = parseObjectPath(dir);
      const isBucketIdFormat = /^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(bucketName);
      
      if (!isBucketIdFormat) {
        console.error(
          `[ObjectStorage] ERROR: PRIVATE_OBJECT_DIR must use bucket ID on Replit.\n` +
          `Current value: "${dir}"\n` +
          `Bucket extracted: "${bucketName}" (invalid - looks like display name)\n` +
          `Required format: /xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/content\n` +
          `Fix: Update PRIVATE_OBJECT_DIR in Replit Secrets with your bucket ID from the Object Storage panel.`
        );
        throw new Error(
          `Invalid PRIVATE_OBJECT_DIR: Must use bucket ID (not display name) on Replit.\n` +
          `Current: "${bucketName}" → Expected: "xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`
        );
      }
    }
    
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    if (searchPaths.length === 0) {
      return null;
    }

    for (const searchPath of searchPaths) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    return this.signObjectURL({
      objectPath: fullPath,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async signObjectURL({
    objectPath,
    method,
    ttlSec = 900,
  }: {
    objectPath: string;
    method: "GET" | "PUT" | "DELETE" | "HEAD";
    ttlSec?: number;
  }): Promise<string> {
    const { bucketName, objectName } = parseObjectPath(objectPath);
    
    const signer = this.getStorageSigner();
    
    return signer.signURL({
      bucketName,
      objectName,
      method,
      ttlSec,
    });
  }

  async uploadFromBuffer(
    objectPath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const mode = detectStorageMode();
    
    if (mode === 'replit') {
      // On Replit: Use sidecar-signed URL for upload (sidecar handles bucket ID translation)
      console.log('[ObjectStorage] Using Replit sidecar for buffer upload');
      
      // Get signed PUT URL from sidecar
      const signedURL = await this.signObjectURL({
        objectPath,
        method: 'PUT',
        ttlSec: 900, // 15 minutes
      });
      
      // Upload buffer to signed URL
      const response = await fetch(signedURL, {
        method: 'PUT',
        body: buffer,
        headers: {
          'Content-Type': contentType,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to upload to signed URL: ${response.status} ${response.statusText}\n${errorText}`
        );
      }
      
      const { bucketName, objectName } = parseObjectPath(objectPath);
      return `https://storage.googleapis.com/${bucketName}/${objectName}`;
    } else {
      // On non-Replit (GCS with service account): Use direct SDK upload
      console.log('[ObjectStorage] Using direct GCS SDK for buffer upload');
      
      const { bucketName, objectName } = parseObjectPath(objectPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      await file.save(buffer, {
        contentType,
        metadata: {
          contentType,
        },
      });

      return `https://storage.googleapis.com/${bucketName}/${objectName}`;
    }
  }
}

export function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
