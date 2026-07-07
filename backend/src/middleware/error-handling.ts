// src/middleware/error-handling.ts — Standardized error responses (P1)
import { MiddlewareHandler } from 'hono';

/** Sanitize error messages for client responses */
export function sanitizeError(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === 'string') return err.split('\n')[0];
	return 'Internal server error';
}

/** Global error handler — wraps uncaught errors in standardized JSON */
export const errorHandler: MiddlewareHandler = async (c, next) => {
	try {
		await next();
	} catch (err) {
		const message = sanitizeError(err);
		console.error('[Unhandled Error]', err);
		return c.json({ error: message }, 500);
	}
};
