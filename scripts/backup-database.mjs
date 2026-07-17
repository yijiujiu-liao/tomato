import { resolve } from "node:path";
import { createDatabaseBackup } from "../server/databaseBackup.js";

const result = await createDatabaseBackup({
  databasePath: process.env.DATABASE_PATH || "./data/tomato.sqlite",
  backupDir: process.env.BACKUP_DIR || "./backups",
  retention: process.env.BACKUP_RETENTION || 14,
});

console.log(JSON.stringify({
  ok: true,
  fileName: result.fileName,
  bytes: result.bytes,
  removed: result.removed,
  backupDir: resolve(process.env.BACKUP_DIR || "./backups"),
}));
