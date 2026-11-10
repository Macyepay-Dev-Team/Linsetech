/**
 * node tools/blender/glass_post.cjs <in.png> <out.webp> <width>
 * Cycles' "transparent glass" leaves sample noise in the alpha channel (the denoiser only cleans colour): a 3 px
 * median on the alpha alone removes the speckle without softening the edges, then the frame is written as WebP.
 */
const sharp = require("../../node_modules/sharp");
(async () => {
  const [inp, out, width] = process.argv.slice(2);
  const alpha = await sharp(inp).extractChannel(3).median(3).toBuffer();
  const rgb = await sharp(inp).removeAlpha().toBuffer();
  const img = sharp(rgb).joinChannel(alpha);
  const buf = await img.png().toBuffer();
  const res = await sharp(buf).resize(+width).webp({ quality: 88, alphaQuality: 95 }).toFile(out);
  console.log(out, res.size);
})();
