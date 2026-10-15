ALTER TABLE "TermsAcceptance"
ADD COLUMN "retainedForDispute" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disputeReference" TEXT,
ADD COLUMN "accountDeletionRequestedAt" TIMESTAMPTZ(3);
