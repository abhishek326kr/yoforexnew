// Object Storage Service for YoForex EA file uploads
// Cloudflare R2 storage implementation only
import { Response } from "express";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";
import {
  ObjectAclPolicy,
  ObjectPermission,
} from "./objectAcl";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Mock File interface for backward compatibility with existing code
// R2 uses S3Client directly, but routes.ts expects File objects
interface MockFile {
  name: string; // Stores the R2 key
  exists: () => Promise<[boolean]>;
}

export class ObjectStorageService {
  private s3Client: S3Client | null = null;

  constructor() {
    // Initialize S3Client on first use via getS3Client()
  }

  private getS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Cloudflare R2 credentials not configured.\n' +
        'Required environment variables:\n' +
        '  - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID\n' +
        '  - R2_ACCESS_KEY_ID: R2 access key ID\n' +
        '  - R2_SECRET_ACCESS_KEY: R2 secret access key\n' +
        '  - R2_BUCKET_NAME: R2 bucket name\n' +
        'Please set these environment variables to use object storage.'
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
      console.log(`[ObjectStorage] Initialized R2 S3Client for account: ${accountId}`);
    } catch (error: any) {
      console.error("[ObjectStorage] Failed to initialize R2 S3Client:", error.message);
      throw new Error(
        "Failed to initialize Cloudflare R2 client. " +
        "Ensure R2 credentials are set correctly. " +
        "Error: " + error.message
      );
    }

    return this.s3Client;
  }

  private getBucketName(): string {
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error(
        'R2_BUCKET_NAME environment variable not set.\n' +
        'Please set R2_BUCKET_NAME to your Cloudflare R2 bucket name.'
      );
    }
    return bucketName;
  }

  private async checkR2ObjectExists(key: string): Promise<boolean> {
    try {
      const client = this.getS3Client();
      const bucketName = this.getBucketName();
      
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      await client.send(command);
      console.log(`[ObjectStorage] Object exists: ${key}`);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`[ObjectStorage] Object not found: ${key}`);
        return false;
      }
      console.error(`[ObjectStorage] Error checking object existence:`, error);
      throw error;
    }
  }

  private async getR2Object(key: string) {
    const client = this.getS3Client();
    const bucketName = this.getBucketName();
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const response = await client.send(command);
    console.log(`[ObjectStorage] Retrieved object: ${key}, ContentType: ${response.ContentType}, Size: ${response.ContentLength}`);
    return response;
  }

  private async deleteR2Object(key: string): Promise<void> {
    const client = this.getS3Client();
    const bucketName = this.getBucketName();
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await client.send(command);
    console.log(`[ObjectStorage] Deleted object: ${key}`);
  }

  private async signR2URL({
    objectName,
    method,
    ttlSec,
  }: {
    objectName: string;
    method: "GET" | "PUT" | "DELETE" | "HEAD";
    ttlSec: number;
  }): Promise<string> {
    const client = this.getS3Client();
    const bucketName = this.getBucketName();

    console.log(`[ObjectStorage] Signing R2 URL for bucket: ${bucketName}, object: ${objectName}, method: ${method}`);

    let command;
    
    switch (method) {
      case 'GET':
        command = new GetObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        });
        break;
      case 'HEAD':
        command = new HeadObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        });
        break;
      case 'PUT':
        command = new PutObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        });
        break;
      case 'DELETE':
        command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    try {
      const url = await getSignedUrl(client, command, {
        expiresIn: ttlSec,
      });
      
      console.log(`[ObjectStorage] Successfully signed URL for ${method} ${objectName}`);
      return url;
    } catch (error: any) {
      console.error('[ObjectStorage] Error signing URL:', error.message);
      throw new Error(
        `Failed to sign R2 URL: ${error.message}\n` +
        `Bucket: ${bucketName}, Object: ${objectName}`
      );
    }
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
        "PRIVATE_OBJECT_DIR not set.\n" +
        "Set PRIVATE_OBJECT_DIR environment variable to your R2 storage directory.\n" +
        "Example: /my-app/content"
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<MockFile | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    if (searchPaths.length === 0) {
      return null;
    }

    console.log('[ObjectStorage] Searching for public object:', filePath);
    
    for (const searchPath of searchPaths) {
      const fullPath = `${searchPath}/${filePath}`;
      // Extract R2 key (remove leading slash)
      const key = fullPath.replace(/^\//, '');
      
      console.log('[ObjectStorage] Checking R2 key:', key);
      
      const exists = await this.checkR2ObjectExists(key);
      if (exists) {
        console.log('[ObjectStorage] Public object found:', key);
        // Return a mock File object with the key stored in name property
        return {
          name: key,
          exists: () => Promise.resolve([true]),
        };
      }
    }
    
    console.log('[ObjectStorage] No public object found for:', filePath);
    return null;
  }

  async downloadObject(file: MockFile, res: Response, cacheTtlSec: number = 3600) {
    console.log('[ObjectStorage] Downloading R2 object');
    
    try {
      const objectKey = file.name;
      console.log('[ObjectStorage] R2 object key:', objectKey);
      
      const r2Response = await this.getR2Object(objectKey);
      
      const contentType = r2Response.ContentType || 'application/octet-stream';
      const contentLength = r2Response.ContentLength || 0;
      
      console.log('[ObjectStorage] ContentType:', contentType);
      console.log('[ObjectStorage] ContentLength:', contentLength);
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': contentLength.toString(),
        'Cache-Control': `private, max-age=${cacheTtlSec}`,
      });
      
      if (r2Response.Body) {
        const stream = r2Response.Body as Readable;
        
        stream.on('error', (err) => {
          console.error('[ObjectStorage] Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file from R2' });
          }
        });
        
        stream.pipe(res);
        console.log('[ObjectStorage] Stream started');
      } else {
        console.error('[ObjectStorage] R2 response has no body');
        res.status(500).json({ error: 'R2 object has no body' });
      }
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

  async getObjectEntityFile(objectPath: string): Promise<MockFile> {
    console.log('[ObjectStorage] ========== getObjectEntityFile START ==========');
    console.log('[ObjectStorage] Input objectPath:', objectPath);
    
    // Get private directory for path normalization
    let privateDir = this.getPrivateObjectDir();
    if (!privateDir.endsWith("/")) {
      privateDir = `${privateDir}/`;
    }
    
    let entityId: string;
    
    // Handle normalized paths (/objects/...)
    if (objectPath.startsWith("/objects/")) {
      const parts = objectPath.slice(1).split("/");
      console.log('[ObjectStorage] Path parts (normalized):', parts);
      
      if (parts.length < 2) {
        console.log('[ObjectStorage] ERROR: Not enough path parts');
        throw new ObjectNotFoundError();
      }
      
      entityId = parts.slice(1).join("/");
      console.log('[ObjectStorage] Entity ID from normalized path:', entityId);
    }
    // Handle legacy paths with private directory prefix
    else if (objectPath.startsWith(privateDir) || objectPath.startsWith(privateDir.replace(/\/$/, ''))) {
      console.log('[ObjectStorage] Path contains private directory prefix (legacy format)');
      // Strip the private directory prefix to get entityId
      const normalizedPrivateDir = privateDir.replace(/\/$/, '');
      if (objectPath.startsWith(normalizedPrivateDir + '/')) {
        entityId = objectPath.substring((normalizedPrivateDir + '/').length);
      } else {
        entityId = objectPath.substring(normalizedPrivateDir.length);
      }
      console.log('[ObjectStorage] Entity ID from legacy path:', entityId);
    }
    else {
      console.log('[ObjectStorage] ERROR: Path does not start with /objects/ or private directory');
      console.log('[ObjectStorage] Expected: /objects/... or', privateDir);
      throw new ObjectNotFoundError();
    }
    
    // Build R2 key: remove leading slash from privateDir and append entityId
    const r2Key = `${privateDir.replace(/^\//, '')}${entityId}`;
    
    console.log('[ObjectStorage] R2 Key:', r2Key);
    console.log('[ObjectStorage] Checking if R2 object exists...');
    
    const exists = await this.checkR2ObjectExists(r2Key);
    
    if (!exists) {
      console.log('[ObjectStorage] ERROR: R2 object not found');
      console.log('[ObjectStorage] ========== END (NOT FOUND) ==========');
      throw new ObjectNotFoundError();
    }
    
    console.log('[ObjectStorage] R2 object exists, creating mock File object');
    
    // Return a mock File object with R2 key
    const mockFile: MockFile = {
      name: r2Key,
      exists: () => Promise.resolve([true]),
    };
    
    console.log('[ObjectStorage] ========== END (SUCCESS) ==========');
    return mockFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    console.log('[ObjectStorage] Normalizing path:', rawPath);
    
    // Already normalized
    if (rawPath.startsWith('/objects/')) {
      return rawPath;
    }
    
    // Extract private object directory
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
      console.log('[ObjectStorage] Normalized:', rawPath, '->', normalized);
      return normalized;
    }
    
    console.log('[ObjectStorage] Path unchanged:', rawPath);
    return rawPath;
  }

  /**
   * Normalizes any object path to /objects/... format
   * This is used after uploads to ensure consistent path format in database.
   * 
   * Examples:
   * - Input: /my-app/content/ea-files/file.ex5
   *   Output: /objects/ea-files/file.ex5
   * 
   * @param rawPath - The raw path from upload
   * @returns Normalized path in /objects/... format
   */
  private normalizeToObjectsPath(rawPath: string): string {
    console.log('[ObjectStorage] ========== normalizeToObjectsPath START ==========');
    console.log('[ObjectStorage] Input rawPath:', rawPath);
    
    // Get the private object directory (e.g., /my-app/content)
    let objectEntityDir = this.getPrivateObjectDir();
    console.log('[ObjectStorage] Private object dir (before slash):', objectEntityDir);
    
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    console.log('[ObjectStorage] Private object dir (after slash):', objectEntityDir);
    
    // Check if the path starts with the private object directory
    if (!rawPath.startsWith(objectEntityDir)) {
      // Path doesn't match expected format, return as-is
      console.warn(
        `[ObjectStorage] ERROR: Path doesn't start with private object dir.\n` +
        `  Expected prefix: ${objectEntityDir}\n` +
        `  Actual path: ${rawPath}\n` +
        `  This indicates the upload path was not constructed correctly!`
      );
      console.log('[ObjectStorage] ========== END (ERROR) ==========');
      return rawPath;
    }
    
    // Extract the entity ID (everything after the private directory)
    const entityId = rawPath.slice(objectEntityDir.length);
    console.log('[ObjectStorage] Extracted entityId:', entityId);
    
    // Return normalized path
    const normalized = `/objects/${entityId}`;
    console.log('[ObjectStorage] Normalized path:', normalized);
    console.log('[ObjectStorage] ========== END (SUCCESS) ==========');
    
    return normalized;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    console.log('[ObjectStorage] trySetObjectEntityAclPolicy called');
    console.log('[ObjectStorage] R2 uses bucket-level permissions - ACL policy not applied');
    console.log('[ObjectStorage] ACL policy would be:', JSON.stringify(aclPolicy));
    console.log('[ObjectStorage] Note: For R2, use presigned URLs with expiration for access control');
    
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: MockFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    console.log('[ObjectStorage] canAccessObjectEntity called');
    console.log('[ObjectStorage] R2 mode - ACL not supported, allowing access');
    console.log('[ObjectStorage] Note: R2 relies on presigned URLs and bucket-level permissions');
    console.log('[ObjectStorage] User ID:', userId);
    console.log('[ObjectStorage] Requested permission:', requestedPermission);
    
    // R2 access control is handled via presigned URLs
    // Always return true here; actual access control happens at URL signing time
    return true;
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
    // Extract R2 key (remove leading slash)
    const objectName = objectPath.replace(/^\//, '');
    
    console.log('[ObjectStorage] Signing URL for R2 key:', objectName);
    
    return this.signR2URL({
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
    console.log('[ObjectStorage] ========== uploadFromBuffer START ==========');
    console.log('[ObjectStorage] Object path:', objectPath);
    console.log('[ObjectStorage] Content type:', contentType);
    console.log('[ObjectStorage] Buffer size:', buffer.length);
    
    const bucketName = this.getBucketName();
    console.log('[ObjectStorage] R2 bucket name:', bucketName);
    
    try {
      const s3Client = this.getS3Client();
      
      // Extract R2 key from objectPath (remove leading slash and bucket prefix if present)
      let objectKey = objectPath.replace(/^\//, '');
      console.log('[ObjectStorage] Object key (after removing leading slash):', objectKey);
      
      // If path starts with bucket name, remove it
      if (objectKey.startsWith(bucketName + '/')) {
        const beforeStrip = objectKey;
        objectKey = objectKey.slice(bucketName.length + 1);
        console.log('[ObjectStorage] Stripped bucket prefix:', beforeStrip, '->', objectKey);
      }
      
      console.log('[ObjectStorage] Uploading to R2...');
      console.log('[ObjectStorage]   Bucket:', bucketName);
      console.log('[ObjectStorage]   Key:', objectKey);
      console.log('[ObjectStorage]   Content-Type:', contentType);
      console.log('[ObjectStorage]   Buffer size:', buffer.length);
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      });
      
      await s3Client.send(command);
      console.log('[ObjectStorage] R2 upload successful to key:', objectKey);
      
      // Use the original objectPath for normalization
      const uploadedPath = objectPath;
      console.log('[ObjectStorage] Set uploadedPath for normalization:', uploadedPath);
      
      // Normalize the path to /objects/... format
      // This ensures consistent database storage and download endpoint compatibility
      const normalizedPath = this.normalizeToObjectsPath(uploadedPath);
      
      console.log('[ObjectStorage] ========== PATH NORMALIZATION ==========');
      console.log('[ObjectStorage]   Raw uploaded path:', uploadedPath);
      console.log('[ObjectStorage]   Normalized path:', normalizedPath);
      console.log('[ObjectStorage]   Private object dir:', this.getPrivateObjectDir());
      console.log('[ObjectStorage] ========== END ==========');
      
      return normalizedPath;
    } catch (error: any) {
      console.error('[ObjectStorage] ========== R2 UPLOAD ERROR ==========');
      console.error('[ObjectStorage] Error name:', error.name);
      console.error('[ObjectStorage] Error message:', error.message);
      console.error('[ObjectStorage] Error stack:', error.stack);
      console.error('[ObjectStorage] Input objectPath:', objectPath);
      console.error('[ObjectStorage] Bucket:', bucketName);
      throw error;
    }
  }

  async deleteObject(objectPath: string): Promise<void> {
    console.log('[ObjectStorage] ========== deleteObject START ==========');
    console.log('[ObjectStorage] Object path:', objectPath);
    
    // Get the R2 key from the object path
    const mockFile = await this.getObjectEntityFile(objectPath);
    const objectKey = mockFile.name;
    
    console.log('[ObjectStorage] Deleting R2 object:', objectKey);
    
    await this.deleteR2Object(objectKey);
    
    console.log('[ObjectStorage] ========== deleteObject END ==========');
  }
}
