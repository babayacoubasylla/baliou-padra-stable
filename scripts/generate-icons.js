const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "../public/balou-padra-logo.png.png");
const outputDir = path.join(__dirname, "../public");

async function generate() {
  await sharp(input)
    .resize(192, 192, { fit: "cover" })
    .png()
    .toFile(path.join(outputDir, "icon-192.png"));

  await sharp(input)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(path.join(outputDir, "icon-512.png"));

  await sharp(input)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(path.join(outputDir, "apple-icon.png"));

  await sharp(input)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(path.join(outputDir, "logo.png"));

  await sharp(input)
    .resize(1200, 630, { fit: "cover" })
    .png()
    .toFile(path.join(outputDir, "og-image.png"));

  console.log("✅ Icônes PWA générées avec succès !");
}

generate().catch((err) => {
  console.error("❌ Erreur génération icônes :", err);
  process.exit(1);
});