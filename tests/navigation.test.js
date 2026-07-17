import assert from "node:assert/strict";
import test from "node:test";
import { getPageFromHash } from "../js/navigation.js";

test("focus session is a first-class route while legacy pages retain their aliases", () => {
  assert.equal(getPageFromHash("#/focus-session"), "focus-session");
  assert.equal(getPageFromHash("#/focus"), "home");
  assert.equal(getPageFromHash("#/tasks"), "home");
  assert.equal(getPageFromHash("#/unknown"), "home");
});
