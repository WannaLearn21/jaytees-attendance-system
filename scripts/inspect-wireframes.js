const fs = require('fs');

const files = [
  'docs/04-wireframe-live-attendance.html',
  'docs/05-wireframe-shifts-and-staff.html',
  'docs/06-wireframe-payroll-export.html'
];

for (const file of files) {
  console.log(`\n================================`);
  console.log(`PARSING: ${file}`);
  console.log(`================================`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const tplMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  if (!tplMatch) {
    console.log('No template found!');
    continue;
  }
  const tpl = JSON.parse(tplMatch[1]);
  fs.writeFileSync(file.replace('.html', '-rendered.html'), tpl);

  // Extract text snippets, titles, labels
  const headings = tpl.match(/<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>/gi) || [];
  console.log('Headings:', headings.map(h => h.replace(/<[^>]*>/g, '').trim()));

  const ths = tpl.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
  console.log('Table Headers:', ths.map(th => th.replace(/<[^>]*>/g, '').trim()));
}
