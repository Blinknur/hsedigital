-- Rollback authentication and email verification fields from User model
DROP INDEX IF EXISTS "users_passwordResetToken_key";
DROP INDEX IF EXISTS "users_emailVerificationToken_key";

ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshTokens";
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetTokenExpiry";
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "isEmailVerified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationToken";
