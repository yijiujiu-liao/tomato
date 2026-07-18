import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ASSETS = [
  "assets/pets/penguin-walk-v2.png",
  "assets/pets/purple-dragon-walk-v2.png",
  "assets/pets/green-dino-walk-v2.png",
  "assets/pets/chick-walk-v2.png",
];

function readPngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("pet walk atlases contain four stages and eight animation frames", async () => {
  for (const asset of ASSETS) {
    const buffer = await readFile(asset);
    assert.deepEqual(readPngDimensions(buffer), {
      width: 2048,
      height: 1024,
    });
  }
});
