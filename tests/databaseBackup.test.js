import assert from "node:assert/strict";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createDatabaseBackup } from "../server/databaseBackup.js";

test("database backup creates a readable SQLite snapshot and honors retention", async () => {
  const root = mkdtempSync(join(tmpdir(), "tomato-backup-"));
  const databasePath = join(root, "source.sqlite");
  const backupDir = join(root, "backups");
  const source = new DatabaseSync(databasePath);

  source.exec("CREATE TABLE study_log (title TEXT NOT NULL)");
  source.prepare("INSERT INTO study_log (title) VALUES (?)").run("数学错题复盘");
  source.close();

  for (let index = 0; index < 3; index += 1) {
    await createDatabaseBackup({
      databasePath,
      backupDir,
      retention: 2,
      now: new Date(Date.UTC(2026, 6, 17, 0, 0, index)),
    });
  }

  const backupFiles = readdirSync(backupDir).filter((name) => name.endsWith(".sqlite"));
  assert.equal(backupFiles.length, 2);

  const snapshot = new DatabaseSync(join(backupDir, backupFiles.at(-1)), { readOnly: true });
  const row = snapshot.prepare("SELECT title FROM study_log").get();
  snapshot.close();

  assert.equal(row.title, "数学错题复盘");
});
