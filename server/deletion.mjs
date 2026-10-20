import { createHash, timingSafeEqual } from 'node:crypto';
export function validDeletionPassword(value) {
 const hash=v=>createHash('sha256').update(String(v ?? '')).digest();
 return timingSafeEqual(hash(value),hash(process.env.PRODUCT_DELETE_PASSWORD ?? '#DeleAll42'));
}
