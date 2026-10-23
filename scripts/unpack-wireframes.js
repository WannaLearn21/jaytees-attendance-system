const fs = require('fs');
const zlib = require('zlib');

const html = fs.readFileSync('docs/JATS_Wireframes.html', 'utf8');

const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);

console.log('Manifest found:', !!manifestMatch, 'Template found:', !!templateMatch);

if (manifestMatch) {
  const manifest = JSON.parse(manifestMatch[1]);
  const keys = Object.keys(manifest);
  console.log('Manifest entries:', keys.length);
  for (const k of keys) {
    const entry = manifest[k];
    console.log('Entry:', k, entry.mime, 'compressed:', entry.compressed, 'data length:', entry.data.length);
    if (entry.compressed) {
      try {
        const buf = Buffer.from(entry.data, 'base64');
        const unzipped = zlib.gunzipSync(buf).toString('utf8');
        console.log('Decompressed', k, 'bytes:', unzipped.length, 'preview:', unzipped.slice(0, 150).replace(/\n/g, ' '));
        fs.writeFileSync('docs/unbundled_' + k + '.html', unzipped);
      } catch (e) {
        console.error('Gunzip error on', k, e.message);
      }
    }
  }
}

if (templateMatch) {
  const tpl = JSON.parse(templateMatch[1]);
  console.log('Template length:', tpl.length, 'preview:', tpl.slice(0, 200).replace(/\n/g, ' '));
  fs.writeFileSync('docs/unbundled_template.html', tpl);
}
