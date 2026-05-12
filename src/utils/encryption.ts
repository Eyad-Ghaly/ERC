/**
 * Encryption Utility using Web Crypto API (AES-GCM)
 * This provides End-to-End encryption for sensitive data.
 */

const ALGORITHM = "AES-GCM";

/**
 * Derives a cryptographic key from a PIN and Team Code.
 */
async function deriveKey(pin: string, teamCode: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin + teamCode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("ops-core-link-salt-" + teamCode),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using a Team PIN.
 */
export async function encryptId(text: string, pin: string, teamCode: string): Promise<string> {
  if (!text) return "";
  try {
    const key = await deriveKey(pin, teamCode);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(text)
    );

    // Combine IV and Encrypted Data as Base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error("Encryption failed:", err);
    return "";
  }
}

/**
 * Decrypts a string using a Team PIN.
 */
export async function decryptId(encryptedBase64: string, pin: string, teamCode: string): Promise<string | null> {
  if (!encryptedBase64) return null;
  try {
    const key = await deriveKey(pin, teamCode);
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // Return null if decryption fails (e.g. wrong PIN)
    return null;
  }
}
