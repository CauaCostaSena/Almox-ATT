import {scrypt as derive,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export async function hashPassword(password){if(typeof password!=='string'||password.length<6||password.length>128)throw Error('Senha deve ter de 6 a 128 caracteres.');const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex');}
export async function verifyPassword(password,hash){if(typeof password!=='string'||password.length>128)return false;const [salt,key]=hash.split(':');const actual=await scrypt(password,salt,64);const expected=Buffer.from(key,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected);}
export const tokenHash=s=>createHash('sha256').update(s).digest('hex');
export const newToken=()=>randomBytes(32).toString('hex');
export const today=()=>new Date(Date.now()-3*3600000).toISOString().slice(0,10);
