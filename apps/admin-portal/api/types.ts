import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * The request and response shapes Vercel hands a serverless function.
 *
 * These were imported from `@vercel/node`, which exists only to supply them —
 * the runtime itself is provided by Vercel when the function is deployed, not
 * by anything installed here. That package drags in a build toolchain
 * (ts-morph, fast-glob, micromatch, braces, ajv) with open advisories and no
 * patched release available, so the two types are declared here instead and
 * the dependency dropped.
 *
 * Vercel's own definitions are these same two extensions of Node's http
 * objects: a parsed `body` and `query` on the request, and the chainable
 * `status`/`json`/`send` helpers on the response.
 */
export type VercelRequest = IncomingMessage & {
    /** The JSON (or form) body, already parsed. */
    body: any;
    /** Query-string values; repeated keys arrive as an array. */
    query: Partial<Record<string, string | string[]>>;
    cookies: Partial<Record<string, string>>;
};

export type VercelResponse = ServerResponse & {
    /** Sets the status code and returns the response, so calls chain. */
    status(code: number): VercelResponse;
    send(body: any): VercelResponse;
    json(body: any): VercelResponse;
    redirect(statusOrUrl: number | string, url?: string): VercelResponse;
};
