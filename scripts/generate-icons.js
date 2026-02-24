import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("./public/favicon.svg");

sharp(svg)
  .resize(192, 192)
  .png()
  .toFile("./public/icon-192.png")
  .then(() => console.log("icon-192.png created"));

sharp(svg)
  .resize(512, 512)
  .png()
  .toFile("./public/icon-512.png")
  .then(() => console.log("icon-512.png created"));

