import assert from "node:assert/strict";
import test from "node:test";
import { getStorageStatus } from "../server/deployment.js";

test("deployment storage diagnostics flag unsafe Render SQLite paths", () => {
  assert.equal(getStorageStatus({
    platform: "render",
    databasePath: "/opt/render/project/src/data/tomato.sqlite",
  }).status, "ephemeral-risk");

  const persistent = getStorageStatus({
    platform: "render",
    databasePath: "/var/data/tomato.sqlite",
  });
  assert.equal(persistent.status, "persistent");
  assert.equal(persistent.persistent, true);

  assert.equal(getStorageStatus({
    platform: "self-managed",
    databasePath: "C:\\data\\tomato.sqlite",
  }).status, "self-managed");
});
