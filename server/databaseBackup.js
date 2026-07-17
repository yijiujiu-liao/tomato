import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

export async function createDatabaseBackup({
  databasePath,
  backupDir,
  retention = 14,
  now = new Date(),
}) {
  const sourcePath = resolve(databasePath);
  const destinationDir = resolve(backupDir);

  if (!existsSync(sourcePath)) {
    throw new Error(`数据库不存在：${sourcePath}`);
  }

  mkdirSync(destinationDir, { recursive: true });

  const timestamp = now.toISOString().replaceAll(":", "-").replace(".", "-");
  const finalPath = join(destinationDir, `tomato-${timestamp}.sqlite`);
  const temporaryPath = `${finalPath}.tmp`;
  const source = new DatabaseSync(sourcePath, { readOnly: true });

  try {
    await backup(source, temporaryPath);
    renameSync(temporaryPath, finalPath);
  } finally {
    source.close();

    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }

  const removed = pruneDatabaseBackups(destinationDir, retention);

  return {
    databasePath: sourcePath,
    backupPath: finalPath,
    fileName: basename(finalPath),
    bytes: statSync(finalPath).size,
    removed,
  };
}

export function pruneDatabaseBackups(backupDir, retention = 14) {
  const keepCount = Math.max(1, Number.parseInt(retention, 10) || 14);
  const candidates = readdirSync(backupDir)
    .filter((name) => /^tomato-.*\.sqlite$/.test(name))
    .map((name) => {
      const path = join(backupDir, name);
      return { path, modifiedAt: statSync(path).mtimeMs };
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
  const expired = candidates.slice(keepCount);

  for (const item of expired) {
    unlinkSync(item.path);
  }

  return expired.length;
}
