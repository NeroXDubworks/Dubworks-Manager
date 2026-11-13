import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("DubWorks possui manifesto Android/iOS instalável", () => {
  assert.equal(manifest.name, "DubWorks Manager");
  assert.equal(manifest.short_name, "DubWorks");
  assert.equal(manifest.lang, "pt-BR");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.prefer_related_applications, false);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /rel="apple-touch-icon"/);
});

for (const size of [192, 512]) {
  test(`ícone ${size}x${size} do DubWorks é PNG válido`, () => {
    const file = readFileSync(new URL(`../public/icons/dubworks-${size}.png`, import.meta.url));
    assert.equal(file.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(file.subarray(12, 16).toString("utf8"), "IHDR");
    assert.equal(file.readUInt32BE(16), size);
    assert.equal(file.readUInt32BE(20), size);
    assert.ok(manifest.icons.some(icon =>
      icon.src === `/icons/dubworks-${size}.png` &&
      icon.sizes === `${size}x${size}` &&
      icon.type === "image/png" &&
      icon.purpose.split(/\s+/).includes("any")
    ));
  });
}
