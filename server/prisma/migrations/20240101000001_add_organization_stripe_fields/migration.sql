-- Add Stripe integration fields to Organization model
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- Add unique constraints for Stripe fields
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeSubscriptionId_key" ON "organizations"("stripeSubscriptionId");
