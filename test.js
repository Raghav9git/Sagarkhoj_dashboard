import { readFileSync } from 'fs';
const code = readFileSync('src/components/MapCanvas.jsx', 'utf8');
const lines = code.split('\n');
console.log(lines[722]); // line 723
