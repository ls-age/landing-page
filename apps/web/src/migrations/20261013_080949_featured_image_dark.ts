import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-vercel-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "featured_image_dark_id" uuid;
  ALTER TABLE "_posts_v" ADD COLUMN "version_featured_image_dark_id" uuid;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_dark_id_media_id_fk" FOREIGN KEY ("featured_image_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_image_dark_id_media_id_fk" FOREIGN KEY ("version_featured_image_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_featured_image_dark_idx" ON "posts" USING btree ("featured_image_dark_id");
  CREATE INDEX "_posts_v_version_version_featured_image_dark_idx" ON "_posts_v" USING btree ("version_featured_image_dark_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP CONSTRAINT "posts_featured_image_dark_id_media_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_featured_image_dark_id_media_id_fk";
  
  DROP INDEX "posts_featured_image_dark_idx";
  DROP INDEX "_posts_v_version_version_featured_image_dark_idx";
  ALTER TABLE "posts" DROP COLUMN "featured_image_dark_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_featured_image_dark_id";`)
}
