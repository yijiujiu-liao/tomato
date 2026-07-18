import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ASSETS = [
  "assets/pets/penguin-walk-v4.webp",
  "assets/pets/purple-dragon-walk-v4.webp",
  "assets/pets/green-dino-walk-v4.webp",
  "assets/pets/chick-walk-v4.webp",
];

function readWebpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkType === "VP8X") {
      return {
        width: buffer.readUIntLE(offset + 12, 3) + 1,
        height: buffer.readUIntLE(offset + 15, 3) + 1,
      };
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  throw new Error("WebP asset is missing a VP8X dimensions chunk");
}

test("pet walk atlases contain four stages and sixty-four animation frames", async () => {
  for (const asset of ASSETS) {
    const buffer = await readFile(asset);
    assert.deepEqual(readWebpDimensions(buffer), {
      width: 8192,
      height: 512,
    });
  }
});
