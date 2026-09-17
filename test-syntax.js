const { readFileSync } = require('fs');
const { transformSync } = require('esbuild');
const code = readFileSync('src/components/MapCanvas.jsx', 'utf8');

// replace everything inside MapContainer with an empty comment
const simplified = code.replace(/<MapContainer[^>]*>[\s\S]*?<\/MapContainer>/, '<MapContainer></MapContainer>');
try {
  transformSync(simplified, { loader: 'jsx' });
  console.log("Simplified parses fine!");
} catch (e) {
  console.log("Error in simplified:", e.message);
}
