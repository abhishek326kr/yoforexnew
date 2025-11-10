/**
 * Server Constants
 * 
 * Centralized constants for server-side operations
 */

/**
 * System Automation User ID
 * 
 * This is a dedicated service account used for automated system operations
 * such as auto-resolving errors, cleanup tasks, and background jobs.
 * 
 * The user is created during database seeding and should exist in all environments.
 */
export const SYSTEM_AUTOMATION_USER_ID = '00000000-0000-0000-0000-000000000001';
