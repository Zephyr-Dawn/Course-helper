// Pre-render TeX at build time. stdin: JSON [{tex, display}], stdout: JSON [{html, error}]
const path = require('path');
const katex = require(path.join(__dirname, '..', 'assets', 'katex', 'katex.min.js'));
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => (buf += d));
process.stdin.on('end', () => {
  const items = JSON.parse(buf);
  const out = items.map(({ tex, display }) => {
    const opts = { displayMode: !!display, throwOnError: true, strict: 'ignore', trust: false, output: 'html' };
    try {
      return { html: katex.renderToString(tex, opts), error: null };
    } catch (e) {
      return { html: katex.renderToString(tex, { ...opts, throwOnError: false }), error: String(e.message || e) };
    }
  });
  process.stdout.write(JSON.stringify(out));
});
