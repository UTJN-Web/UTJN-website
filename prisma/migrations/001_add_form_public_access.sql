-- Migration: Add public access functionality to forms
-- Date: 2024-01-15
-- Description: Add accessToken and allowPublicAccess fields to enable public form access

-- Add the new fields to the Form table
ALTER TABLE "Form" 
ADD COLUMN "accessToken" TEXT,
ADD COLUMN "allowPublicAccess" BOOLEAN DEFAULT true;

-- Generate unique access tokens for existing forms
UPDATE "Form" 
SET "accessToken" = 'form_' || encode(gen_random_bytes(16), 'hex')
WHERE "accessToken" IS NULL;

-- Make accessToken NOT NULL and unique after populating
ALTER TABLE "Form" 
ALTER COLUMN "accessToken" SET NOT NULL,
ADD CONSTRAINT "Form_accessToken_unique" UNIQUE ("accessToken");

-- Create index for faster lookups by access token
CREATE INDEX "Form_accessToken_idx" ON "Form"("accessToken");

-- Create index for public access filtering
CREATE INDEX "Form_allowPublicAccess_idx" ON "Form"("allowPublicAccess");

-- Add comments for documentation
COMMENT ON COLUMN "Form"."accessToken" IS 'Unique token for public access to the form';
COMMENT ON COLUMN "Form"."allowPublicAccess" IS 'Whether the form can be accessed via public link'; 