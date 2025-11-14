// Object Storage Service for YoForex EA file uploads
// Supports Replit sidecar, direct GCS authentication, and Cloudflare R2
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Client as ReplitStorageClient } from "@replit/object-storage";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";
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
    
    // Access objectStorageClient (only used in Replit mode, never null)
    if (!objectStorageClient) {
      throw new Error('Storage client not initialized for Replit mode');
    }
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

class R2Signer implements StorageSigner {
  private s3Client: S3Client;

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.error(
        "[ObjectStorage] R2 mode requires CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
      );
      throw new Error(
        "R2 credentials not configured. " +
        "Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
      );
    }

    try {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      console.log(`[R2Signer] Initialized S3Client for account: ${accountId}`);
    } catch (error: any) {
      console.error("[ObjectStorage] Failed to initialize R2 S3Client:", error.message);
      throw new Error(
        "Failed to initialize Cloudflare R2 client. " +
        "Ensure R2 credentials are set correctly. " +
        "Error: " + error.message
      );
    }
  }

  async signURL(params: SignURLParams): Promise<string> {
    const bucketName = process.env.R2_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME environment variable not set");
    }

    console.log(`[R2Signer] Signing URL for bucket: ${bucketName}, object: ${params.objectName}, method: ${params.method}`);

    let command;
    
    switch (params.method) {
      case 'GET':
      case 'HEAD':
        command = new GetObjectCommand({
          Bucket: bucketName,
          Key: params.objectName,
        });
        break;
      case 'PUT':
        command = new PutObjectCommand({
          Bucket: bucketName,
          Key: params.objectName,
        });
        break;
      case 'DELETE':
        command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: params.objectName,
        });
        break;
      default:
        throw new Error(`Unsupported method: ${params.method}`);
    }

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: params.ttlSec,
      });
      
      console.log(`[R2Signer] Successfully signed URL for ${params.method} ${params.objectName}`);
      return url;
    } catch (error: any) {
      console.error('[R2Signer] Error signing URL:', error.message);
      throw new Error(
        `Failed to sign URL for R2: ${error.message}\n` +
        `Bucket: ${bucketName}, Object: ${params.objectName}`
      );
    }
  }
}

function detectStorageMode(): 'replit' | 'gcs' | 'r2' {
  const explicitMode = process.env.STORAGE_MODE?.toLowerCase();
  
  if (explicitMode === 'replit' || explicitMode === 'gcs' || explicitMode === 'r2') {
    console.log(`[ObjectStorage] Using explicit STORAGE_MODE: ${explicitMode}`);
    return explicitMode;
  }

  const hasR2Credentials = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID
  );

  if (hasR2Credentials) {
    console.log('[ObjectStorage] Auto-detected R2 credentials, using r2 mode');
    return 'r2';
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

function createStorageClient(): Storage | null {
  const mode = detectStorageMode();

  if (mode === 'r2') {
    console.log('[ObjectStorage] R2 mode - Storage client intentionally null (R2 uses S3Client)');
    console.log('[ObjectStorage] R2 code paths should never use objectStorageClient');
    // Return null - R2 code should never use objectStorageClient
    return null as any;
  } else if (mode === 'replit') {
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
  private r2Client: S3Client | null = null;

  constructor() {}

  private getR2Client(): S3Client {
    if (this.r2Client) {
      return this.r2Client;
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'R2 credentials not configured. ' +
        'Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.'
      );
    }

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.r2Client;
  }

  private async checkR2ObjectExists(key: string): Promise<boolean> {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('R2_BUCKET_NAME environment variable not set');
    }

    try {
      const client = this.getR2Client();
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      await client.send(command);
      console.log(`[R2Helper] Object exists: ${key}`);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`[R2Helper] Object not found: ${key}`);
        return false;
      }
      console.error(`[R2Helper] Error checking object existence:`, error);
      throw error;
    }
  }

  private async getR2Object(key: string) {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('R2_BUCKET_NAME environment variable not set');
    }

    const client = this.getR2Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const response = await client.send(command);
    console.log(`[R2Helper] Retrieved object: ${key}, ContentType: ${response.ContentType}, Size: ${response.ContentLength}`);
    return response;
  }

  private async deleteR2Object(key: string): Promise<void> {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('R2_BUCKET_NAME environment variable not set');
    }

    const client = this.getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await client.send(command);
    console.log(`[R2Helper] Deleted object: ${key}`);
  }

  private getStorageSigner(): StorageSigner {
    if (this.signer) {
      return this.signer;
    }

    const mode = detectStorageMode();

    try {
      if (mode === 'r2') {
        console.log('[ObjectStorage] Creating R2Signer');
        this.signer = new R2Signer();
      } else if (mode === 'replit') {
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

    const mode = detectStorageMode();
    console.log('[searchPublicObject] Storage mode:', mode, 'filePath:', filePath);

    if (mode === 'r2') {
      // R2 implementation - NO objectStorageClient usage
      console.log('[searchPublicObject] R2 mode - using S3Client directly');
      
      for (const searchPath of searchPaths) {
        const fullPath = `${searchPath}/${filePath}`;
        // Extract R2 key without using parseObjectPath (which assumes GCS format)
        const key = fullPath.replace(/^\//, '');  // Remove leading slash for R2 key
        
        console.log('[searchPublicObject] R2 checking key:', key);
        
        const exists = await this.checkR2ObjectExists(key);
        if (exists) {
          console.log('[searchPublicObject] R2 object found:', key);
          // Return a minimal mock File object with the key stored in name property
          // R2 operations will extract this key and use S3Client
          return {
            name: key,
            exists: () => Promise.resolve([true]),
          } as any;
        }
      }
      
      console.log('[searchPublicObject] No R2 object found for:', filePath);
      return null;
    }

    // GCS/Replit implementation using objectStorageClient
    if (!objectStorageClient) {
      throw new Error('Storage client not initialized for GCS/Replit mode');
    }
    
    for (const searchPath of searchPaths) {
      const fullPath = `${searchPath}/${filePath}`;
      console.log('[searchPublicObject] Checking path:', fullPath);

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        console.log('[searchPublicObject] GCS/Replit object found:', objectName);
        return file;
      }
    }

    console.log('[searchPublicObject] No public object found for:', filePath);
    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    const mode = detectStorageMode();
    console.log('[downloadObject] Storage mode:', mode);
    
    try {
      if (mode === 'r2') {
        console.log('[downloadObject] Using R2 mode for download');
        
        const objectKey = file.name;
        console.log('[downloadObject] R2 object key:', objectKey);
        
        const r2Response = await this.getR2Object(objectKey);
        
        const contentType = r2Response.ContentType || 'application/octet-stream';
        const contentLength = r2Response.ContentLength || 0;
        
        console.log('[downloadObject] R2 ContentType:', contentType);
        console.log('[downloadObject] R2 ContentLength:', contentLength);
        
        res.set({
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Cache-Control': `private, max-age=${cacheTtlSec}`,
        });
        
        if (r2Response.Body) {
          const stream = r2Response.Body as Readable;
          
          stream.on('error', (err) => {
            console.error('[downloadObject] R2 stream error:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error streaming file from R2' });
            }
          });
          
          stream.pipe(res);
          console.log('[downloadObject] R2 stream started');
        } else {
          console.error('[downloadObject] R2 response has no body');
          res.status(500).json({ error: 'R2 object has no body' });
        }
        return;
      }
      
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
    console.log('[getObjectEntityFile] ========== START ==========');
    console.log('[getObjectEntityFile] Input objectPath:', objectPath);
    
    if (!objectPath.startsWith("/objects/")) {
      console.log('[getObjectEntityFile] ERROR: Path does not start with /objects/');
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    console.log('[getObjectEntityFile] Path parts:', parts);
    
    if (parts.length < 2) {
      console.log('[getObjectEntityFile] ERROR: Not enough path parts');
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    console.log('[getObjectEntityFile] Entity ID:', entityId);
    
    const mode = detectStorageMode();
    console.log('[getObjectEntityFile] Storage mode:', mode);
    
    if (mode === 'r2') {
      // R2 implementation - NO objectStorageClient usage
      console.log('[getObjectEntityFile] R2 mode - using S3Client directly');
      
      // Extract R2 key without using parseObjectPath (which assumes GCS format)
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) {
        entityDir = `${entityDir}/`;
      }
      
      // Build R2 key: remove leading slash from entityDir and append entityId
      const r2Key = `${entityDir.replace(/^\//, '')}${entityId}`;
      
      console.log('[getObjectEntityFile] R2 Key:', r2Key);
      console.log('[getObjectEntityFile] Checking if R2 object exists...');
      
      const exists = await this.checkR2ObjectExists(r2Key);
      
      if (!exists) {
        console.log('[getObjectEntityFile] ERROR: R2 object not found');
        console.log('[getObjectEntityFile] ========== END (NOT FOUND) ==========');
        throw new ObjectNotFoundError();
      }
      
      console.log('[getObjectEntityFile] R2 object exists, creating mock File object');
      
      // Return a minimal mock File that won't be used for actual operations
      // R2 operations use S3Client directly, not File objects
      // Store the R2 key in the name property for downloadObject to use
      const mockFile = {
        name: r2Key,
        exists: () => Promise.resolve([true]),
      } as any;
      
      console.log('[getObjectEntityFile] ========== END (SUCCESS - R2) ==========');
      return mockFile;
    }
    
    // GCS/Replit implementation using objectStorageClient
    if (!objectStorageClient) {
      throw new Error('Storage client not initialized for GCS/Replit mode');
    }
    
    let entityDir = this.getPrivateObjectDir();
    console.log('[getObjectEntityFile] Entity dir (before slash):', entityDir);
    
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    console.log('[getObjectEntityFile] Entity dir (after slash):', entityDir);
    
    const objectEntityPath = `${entityDir}${entityId}`;
    console.log('[getObjectEntityFile] Full object entity path:', objectEntityPath);
    
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    console.log('[getObjectEntityFile] Bucket name:', bucketName);
    console.log('[getObjectEntityFile] Object name:', objectName);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    
    console.log('[getObjectEntityFile] Checking if file exists...');
    const [exists] = await objectFile.exists();
    console.log('[getObjectEntityFile] File exists:', exists);
    
    if (!exists) {
      console.log('[getObjectEntityFile] ERROR: File not found');
      console.log('[getObjectEntityFile] ========== END (NOT FOUND) ==========');
      throw new ObjectNotFoundError();
    }
    
    console.log('[getObjectEntityFile] ========== END (SUCCESS) ==========');
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    const mode = detectStorageMode();
    
    if (mode === 'r2') {
      // R2 implementation - NO parseObjectPath usage
      console.log('[normalizeObjectEntityPath] R2 mode - path:', rawPath);
      
      // Already normalized
      if (rawPath.startsWith('/objects/')) {
        return rawPath;
      }
      
      // Extract private object directory (without using parseObjectPath)
      let objectEntityDir = this.getPrivateObjectDir();
      if (!objectEntityDir.endsWith("/")) {
        objectEntityDir = `${objectEntityDir}/`;
      }
      
      // Remove leading slash for comparison
      const normalizedDir = objectEntityDir.replace(/^\//, '');
      const normalizedPath = rawPath.replace(/^\//, '');
      
      // Check if path starts with the private directory
      if (normalizedPath.startsWith(normalizedDir)) {
        const entityId = normalizedPath.slice(normalizedDir.length);
        const normalized = `/objects/${entityId}`;
        console.log('[normalizeObjectEntityPath] R2 normalized:', rawPath, '->', normalized);
        return normalized;
      }
      
      console.log('[normalizeObjectEntityPath] R2 path unchanged:', rawPath);
      return rawPath;
    }
    
    // GCS/Replit implementation
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

  /**
   * Normalizes any object path (GCS URL or local path) to /objects/... format
   * This is used after uploads to ensure consistent path format in database.
   * 
   * Examples:
   * - Input: https://storage.googleapis.com/bucket-id/content/ea-files/file.ex5
   *   Output: /objects/ea-files/file.ex5
   * 
   * - Input: /e119.../content/ea-files/file.ex5
   *   Output: /objects/ea-files/file.ex5
   * 
   * @param rawPath - The raw path from upload (GCS URL or local path)
   * @returns Normalized path in /objects/... format
   */
  private normalizeToObjectsPath(rawPath: string): string {
    let pathToNormalize = rawPath;
    
    // If it's a GCS URL, extract the pathname
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(rawPath);
      pathToNormalize = url.pathname;
    }
    
    // Get the private object directory (e.g., /e119.../content)
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    
    // Check if the path starts with the private object directory
    if (!pathToNormalize.startsWith(objectEntityDir)) {
      // Path doesn't match expected format, return as-is
      console.warn(
        `[normalizeToObjectsPath] Path doesn't start with private object dir.\n` +
        `  Expected prefix: ${objectEntityDir}\n` +
        `  Actual path: ${pathToNormalize}`
      );
      return pathToNormalize;
    }
    
    // Extract the entity ID (everything after the private directory)
    const entityId = pathToNormalize.slice(objectEntityDir.length);
    
    // Return normalized path
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const mode = detectStorageMode();
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    if (mode === 'r2') {
      console.log('[trySetObjectEntityAclPolicy] R2 mode - skipping ACL policy set (R2 uses bucket-level permissions)');
      console.log('[trySetObjectEntityAclPolicy] ACL policy would be:', JSON.stringify(aclPolicy));
      console.log('[trySetObjectEntityAclPolicy] Note: For R2, use presigned URLs with expiration for access control');
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
    const mode = detectStorageMode();
    
    if (mode === 'r2') {
      console.log('[canAccessObjectEntity] R2 mode - ACL not supported, allowing access');
      console.log('[canAccessObjectEntity] Note: R2 relies on presigned URLs and bucket-level permissions');
      return true;
    }
    
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
    const mode = detectStorageMode();
    const signer = this.getStorageSigner();
    
    if (mode === 'r2') {
      // R2 implementation - NO parseObjectPath usage
      // R2Signer will use R2_BUCKET_NAME from env
      // objectPath should be the R2 key (remove leading slash)
      const objectName = objectPath.replace(/^\//, '');
      
      console.log('[signObjectURL] R2 mode - key:', objectName);
      
      // R2Signer doesn't use bucketName parameter (gets it from env)
      // But we need to pass something to satisfy the interface
      return signer.signURL({
        bucketName: '', // Not used by R2Signer
        objectName,
        method,
        ttlSec,
      });
    }
    
    // GCS/Replit implementation using parseObjectPath
    const { bucketName, objectName } = parseObjectPath(objectPath);
    
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
    console.log('[uploadFromBuffer] ========== START ==========');
    console.log('[uploadFromBuffer] Object path:', objectPath);
    console.log('[uploadFromBuffer] Content type:', contentType);
    console.log('[uploadFromBuffer] Buffer size:', buffer.length);
    
    const mode = detectStorageMode();
    console.log('[uploadFromBuffer] Storage mode:', mode);
    
    let uploadedPath: string;
    
    if (mode === 'r2') {
      // R2 implementation - NO parseObjectPath usage, use S3Client directly
      console.log('[uploadFromBuffer] Using R2 S3 SDK for upload...');
      
      const bucketName = process.env.R2_BUCKET_NAME;
      if (!bucketName) {
        throw new Error('R2_BUCKET_NAME environment variable not set');
      }
      
      try {
        // Use the shared R2 client from getR2Client()
        const s3Client = this.getR2Client();
        
        // Extract R2 key from objectPath without using parseObjectPath
        // Remove leading slash and any bucket prefix
        let objectKey = objectPath.replace(/^\//, '');
        
        // If path starts with bucket name, remove it
        if (objectKey.startsWith(bucketName + '/')) {
          objectKey = objectKey.slice(bucketName.length + 1);
        }
        
        console.log('[uploadFromBuffer] Uploading to R2...');
        console.log('[uploadFromBuffer] Bucket:', bucketName);
        console.log('[uploadFromBuffer] Key:', objectKey);
        console.log('[uploadFromBuffer] Content-Type:', contentType);
        
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: contentType,
        });
        
        await s3Client.send(command);
        console.log('[uploadFromBuffer] R2 upload successful!');
        
        // Use objectPath for normalization (will be converted to /objects/... format)
        uploadedPath = objectPath;
      } catch (error: any) {
        console.error('[uploadFromBuffer] ERROR in R2 mode:');
        console.error('[uploadFromBuffer] Error name:', error.name);
        console.error('[uploadFromBuffer] Error message:', error.message);
        console.error('[uploadFromBuffer] Error stack:', error.stack);
        throw error;
      }
    } else if (mode === 'replit') {
      // On Replit: Use official Replit SDK with contentType support
      console.log('[uploadFromBuffer] Using Replit SDK for upload...');
      
      try {
        // The Replit SDK handles bucket mapping internally - we just pass the full path
        // Path format: /bucket-id/content/... → SDK translates bucket-id to actual GCS bucket
        const client = new ReplitStorageClient();
        
        console.log('[uploadFromBuffer] Uploading via Replit SDK...');
        console.log('[uploadFromBuffer] Path:', objectPath);
        console.log('[uploadFromBuffer] Content-Type:', contentType);
        console.log('[uploadFromBuffer] Note: Replit SDK does not support setting contentType during upload');
        
        // Upload the buffer using Replit SDK
        // Note: UploadOptions only supports compress option, not contentType
        const result = await client.uploadFromBytes(objectPath, buffer);
        
        console.log('[uploadFromBuffer] Replit SDK upload returned:', result);
        
        // CRITICAL: Verify file actually exists after upload
        // Replit SDK claims success but files may not exist
        if (!objectStorageClient) {
          throw new Error('Storage client not initialized for Replit mode');
        }
        
        const { bucketName, objectName } = parseObjectPath(objectPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        
        console.log('[uploadFromBuffer] Verifying upload...');
        console.log('[uploadFromBuffer] Checking bucket:', bucketName);
        console.log('[uploadFromBuffer] Checking object:', objectName);
        
        const [exists] = await file.exists();
        console.log('[uploadFromBuffer] File exists after upload:', exists);
        
        if (!exists) {
          throw new Error('Upload claimed success but file does not exist in storage');
        }
        
        console.log('[uploadFromBuffer] Upload verified successfully!');
        
        // Use the object path for normalization
        uploadedPath = objectPath;
      } catch (error: any) {
        console.error('[uploadFromBuffer] ERROR in Replit mode:');
        console.error('[uploadFromBuffer] Error name:', error.name);
        console.error('[uploadFromBuffer] Error message:', error.message);
        console.error('[uploadFromBuffer] Error stack:', error.stack);
        throw error;
      }
    } else {
      // On non-Replit: Use Storage SDK directly
      console.log('[uploadFromBuffer] Using GCS SDK direct upload...');
      
      if (!objectStorageClient) {
        throw new Error('Storage client not initialized for GCS mode');
      }
      
      const { bucketName, objectName } = parseObjectPath(objectPath);
      
      try {
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);

        await file.save(buffer, {
          contentType,
          metadata: {
            contentType,
          },
        });

        // Use GCS URL for normalization
        uploadedPath = `https://storage.googleapis.com/${bucketName}/${objectName}`;
        console.log('[uploadFromBuffer] GCS upload successful! URL:', uploadedPath);
      } catch (error: any) {
        console.error('[uploadFromBuffer] Upload FAILED:');
        console.error('[uploadFromBuffer] Error name:', error.name);
        console.error('[uploadFromBuffer] Error message:', error.message);
        console.error('[uploadFromBuffer] Error stack:', error.stack);
        throw error;
      }
    }
    
    // Normalize the path to /objects/... format for both modes
    // This ensures consistent database storage and download endpoint compatibility
    const normalizedPath = this.normalizeToObjectsPath(uploadedPath);
    
    console.log('[uploadFromBuffer] ========== PATH NORMALIZATION ==========');
    console.log('[uploadFromBuffer]   Raw uploaded path:', uploadedPath);
    console.log('[uploadFromBuffer]   Normalized path:', normalizedPath);
    console.log('[uploadFromBuffer]   Private object dir:', this.getPrivateObjectDir());
    console.log('[uploadFromBuffer] ========== END ==========');
    
    return normalizedPath;
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
