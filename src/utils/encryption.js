import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

export function encryptPassword(password) {
  if (!password) return null;
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
}

export function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
