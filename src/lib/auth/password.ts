import { hash, compare } from "bcryptjs";

// Salt rounds for bcrypt (10 is standard/safe default)
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt.
 * @param plainPassword - The plain text password to hash
 * @returns The hashed password string
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword) {
        throw new Error("Password cannot be empty");
    }
    return hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a stored hash.
 * @param plainPassword - The plain text password attempt
 * @param hashedPassword - The stored hash to compare against
 * @returns True if matches, False otherwise
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    if (!plainPassword || !hashedPassword) {
        return false;
    }
    return compare(plainPassword, hashedPassword);
}
