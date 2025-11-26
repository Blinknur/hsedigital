-- Rollback Stripe integration fields from Organization model
DROP INDEX IF EXISTS "organizations_stripeSubscriptionId_key";
DROP INDEX IF EXISTS "organizations_stripeCustomerId_key";

ALTER TABLE "organizations" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "stripeCustomerId";
