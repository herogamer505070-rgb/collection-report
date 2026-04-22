import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_KEY_ID = "v1";

function getKey(keyId: string): Buffer {
  // Future: select different keys by keyId for rotation
  void keyId;
  const b64 = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY_BASE64;
  if (!b64) throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY_BASE64 is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32)
    throw new Error("Encryption key must be 32 bytes (256 bits)");
  return key;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a portable string: `keyId:iv:ciphertext:authTag` (all base64).
 */
export function encryptToken(plaintext: string): string {
  const key = getKey(CURRENT_KEY_ID);
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    CURRENT_KEY_ID,
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a token produced by encryptToken.
 * Supports future key rotation via the keyId segment.
 */
export function decryptToken(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 4) throw new Error("Invalid encrypted token format");
  const [keyId, ivB64, ciphertextB64, authTagB64] = parts as [
    string,
    string,
    string,
    string,
  ];
  const key = getKey(keyId);
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
