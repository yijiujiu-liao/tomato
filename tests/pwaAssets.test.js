import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("service worker precaches every application module and asset it declares", () => {
  const source = readFileSync(resolve("sw.js"), "utf8");
  const assetBlock = source.match(/const ASSETS = \[([\s\S]*?)\];/)?.[1] || "";
  const assets = [...assetBlock.matchAll(/["'](\.\/[^"']+)["']/g)]
    .map((match) => match[1]);

  assert.ok(assets.includes("./application.js"));
  assert.ok(assets.includes("./js/app/dom.js"));
  assert.ok(assets.includes("./js/app/renderCoordinator.js"));
  assert.ok(assets.includes("./js/app/taskPlanningFlow.js"));
  assert.ok(assets.includes("./js/app/studyGoalsFlow.js"));
  assert.ok(assets.includes("./js/app/focusFeedbackFlow.js"));
  assert.ok(assets.includes("./css/pages/home.css"));
  assert.ok(assets.includes("./css/components/navigation.css"));
  assert.equal(assets.includes("./css/features/product-surface.css"), false);

  for (const asset of assets) {
    const relativePath = asset === "./" ? "index.html" : asset.slice(2);
    assert.equal(existsSync(resolve(relativePath)), true, `${asset} must exist`);
  }
});
