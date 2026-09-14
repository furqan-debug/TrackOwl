/**
 * The single letter shown when someone has no profile picture.
 *
 * Always uppercase, whatever the stored name looks like — several members have
 * their email address sitting in full_name, so charAt(0) alone produced a
 * lowercase letter for them and a capital for everyone else.
 *
 * Falls back to the email when there is no name, and to a neutral dot rather
 * than "?" when there is nothing at all: a question mark reads as an error,
 * and an account with no name yet is not one.
 */
export function initialOf(fullName?: string | null, email?: string | null): string {
    const source = (fullName || '').trim() || (email || '').trim();
    if (!source) return '·';

    // Skip anything that is not a letter or digit, so " (pending)" or a stray
    // quote does not become the avatar.
    for (const char of source) {
        if (/[\p{L}\p{N}]/u.test(char)) return char.toUpperCase();
    }
    return '·';
}
