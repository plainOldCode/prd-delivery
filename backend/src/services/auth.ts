// src/services/auth.ts — Authentication service (PBKDF2 + JWT)

import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-in-production',
);

const ITERATIONS = 100_000;
const HASH_LENGTH = 64; // 512 bits → 64 bytes of SHA-256 output

// --- Base64 helpers (avoids Node Buffer dependency) ---

function uint8ToBase64(buf: Uint8Array): string {
	let binary = '';
	for (const byte of buf) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToUint8(str: string): Uint8Array {
	const binary = atob(str);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

// --- PBKDF2 helpers -----------------------------------------------

function encodeHash(salt: Uint8Array, hash: Uint8Array): string {
	return `pbkdf2:${ITERATIONS}:${uint8ToBase64(salt)}:${uint8ToBase64(hash)}`;
}

function decodeHash(encoded: string): { iterations: number; salt: Uint8Array; hash: Uint8Array } {
	const [algo, iterStr, saltB64, hashB64] = encoded.split(':');
	if (algo !== 'pbkdf2') throw new Error('unsupported hash format');
	return {
		iterations: Number(iterStr),
		salt: base64ToUint8(saltB64),
		hash: base64ToUint8(hashB64),
	};
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits'],
	);
	const saltCopy = new Uint8Array(salt.byteLength);
	saltCopy.set(salt);
	return new Uint8Array(
		await crypto.subtle.deriveBits(
			{ name: 'PBKDF2', salt: saltCopy, iterations, hash: 'SHA-256' },
			key,
			HASH_LENGTH * 8,
		),
	);
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let different = 0;
	for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
	return different === 0;
}

// --- Public API -----------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await deriveKey(password, salt, ITERATIONS);
	return encodeHash(salt, hash);
}

export async function verifyPassword(encodedHash: string, password: string): Promise<boolean> {
	const { salt, hash: storedHash, iterations } = decodeHash(encodedHash);
	const derived = await deriveKey(password, salt, iterations);
	return constantTimeCompare(storedHash, derived);
}

export async function generateToken(payload: { id: number; username: string }): Promise<string> {
	return new SignJWT({ id: payload.id, username: payload.username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
	const { payload } = await jwtVerify(token, JWT_SECRET);
	return payload;
}
