import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ASSETS = [
  "assets/pets/penguin-walk-v3.png",
  "assets/pets/purple-dragon-walk-v3.png",
  "assets/pets/green-dino-walk-v3.png",
  "assets/pets/chick-walk-v3.png",
];

function readPngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("pet walk atlases contain four stages and sixteen animation frames", async () => {
  for (const asset of ASSETS) {
    const buffer = await readFile(asset);
    assert.deepEqual(readPngDimensions(buffer), {
      width: 4096,
      height: 1024,
    });
  }
});
