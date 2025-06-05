import CryptoJS from 'crypto-js';

const SECRET = process.env.ENCRYPTION_KEY!;

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
}

export function decrypt(cipher: string): string {
  return CryptoJS.AES.decrypt(cipher, SECRET).toString(CryptoJS.enc.Utf8);
}
