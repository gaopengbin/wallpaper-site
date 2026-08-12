import CryptoJS from 'crypto-js';

const KEY = CryptoJS.enc.Utf8.parse('68zhehao2O776519');
const IV = CryptoJS.enc.Utf8.parse('aa176b7519e84710');

export function encrypt(data: string): string {
  const encrypted = CryptoJS.AES.encrypt(data, KEY, {
    iv: IV,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext.toString();
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(encrypted));
}

export function decrypt(data: string): string | null {
  try {
    const hexStr = CryptoJS.enc.Base64.parse(data).toString(CryptoJS.enc.Hex);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(hexStr),
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, KEY, {
      iv: IV,
      padding: CryptoJS.pad.Pkcs7,
    });
    return CryptoJS.enc.Utf8.stringify(decrypted).replace(/\0.*$/g, '');
  } catch (e) {
    console.warn('Decrypt error:', e);
    return null;
  }
}
