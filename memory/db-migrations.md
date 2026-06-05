---
name: db-migrations
description: Database schema changes require proper migrations for existing production databases
metadata:
  type: reference
---

Schema changes like adding `playCount` to Question require migrations for existing databases.

For Turso/libSQL production databases, run manual SQL migrations:
```sql
ALTER TABLE "Question" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Question_playCount_idx" ON "Question"("playCount");
```

For SQLite development database, run:
```bash
npx prisma migrate dev --name add_play_count
```

Always check `backend/scripts/bootstrap-db.cjs` after schema changes to ensure incremental migrations are handled if needed.