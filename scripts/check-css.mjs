import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const entryFile = "style.css";
const entrySource = readFileSync(resolve(entryFile), "utf8");
const importedFiles = [...entrySource.matchAll(/@import\s+url\(["']?([^"')]+)["']?\)/g)]
  .map((match) => match[1].replace(/^\.\//, ""));
const files = [entryFile, ...importedFiles];

for (const file of files) {
  const source = readFileSync(resolve(file), "utf8");
  let depth = 0;
  const openingBraces = [];
  let quote = "";
  let inComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (character === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }

    if (!quote && character === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }

    if (quote) {
      if (character === "\\" && next) {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "{") {
      depth += 1;
      openingBraces.push(index);
    } else if (character === "}") {
      depth -= 1;
      openingBraces.pop();
      if (depth < 0) {
        const line = source.slice(0, index).split("\n").length;
        throw new Error(`${file}:${line} has an unmatched closing brace.`);
      }
    }
  }

  if (inComment) throw new Error(`${file} has an unterminated comment.`);
  if (quote) throw new Error(`${file} has an unterminated string.`);
  if (depth !== 0) {
    const index = openingBraces.at(-1);
    const line = source.slice(0, index).split("\n").length;
    throw new Error(`${file}:${line} has an unmatched opening brace.`);
  }
}

console.log(`CSS structure checked ${files.length} files.`);
