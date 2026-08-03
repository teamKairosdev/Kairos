-- text-embedding-004 returns 768 dimensions. Embeddings are derived data, so
-- invalidate old vectors while preserving every career record.
ALTER TABLE "careers" ALTER COLUMN "embedding" SET DATA TYPE vector(768) USING NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_uq" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wallet_address_uq" ON "users" USING btree ("wallet_address");
