const encoder = new TextEncoder();

export async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encoded = encoder.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    encrypted: true,
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };
}

export async function decryptData(payload, passphrase) {
  if (!payload || !payload.encrypted) {
    return payload;
  }

  const salt = new Uint8Array(payload.salt || []);
  const iv = new Uint8Array(payload.iv || []);
  const key = await deriveKey(passphrase, salt);
  const raw = new Uint8Array(payload.data || []);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, raw);

  return JSON.parse(new TextDecoder().decode(decrypted));
}
