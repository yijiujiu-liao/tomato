export function getStorageStatus({ platform, databasePath }) {
  const normalizedPath = String(databasePath || "").replaceAll("\\", "/");
  const isRender = platform === "render";
  const usesRenderDisk = normalizedPath === "/var/data/tomato.sqlite"
    || normalizedPath.startsWith("/var/data/");

  if (isRender && !usesRenderDisk) {
    return {
      status: "ephemeral-risk",
      persistent: false,
      message: "Render 当前未使用 /var/data 持久化磁盘，重启或重新部署后账号与学习数据可能丢失。",
    };
  }

  return {
    status: isRender ? "persistent" : "self-managed",
    persistent: isRender ? usesRenderDisk : null,
    message: isRender
      ? "SQLite 已使用 Render 持久化磁盘。"
      : "当前不是 Render 环境，请由部署方负责数据库持久化与备份。",
  };
}
