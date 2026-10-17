// Takes the comments out of the built page (build.mjs), so the page players load carries only code, markup and data:
// - CSS: every /* ... */ inside <style> blocks;
// - HTML: every <!-- ... --> outside <script> and <style>;
// - JavaScript: whole comment lines (// ... and /* ... */ blocks that start a line), a "// ..." after code on a line
//   (only after a space following ; , { } ) ] so URLs such as https:// stay), and short /* words */ inside a line.
// Strings and data URLs are left alone: base64 never contains a space, and a URL's // follows a colon.
export function stripComments(page) {
  // CSS
  page = page.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, css, b) => a + css.replace(/\/\*[\s\S]*?\*\//g, '') + b);
  // HTML comments outside scripts and styles
  const parts = page.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/);
  page = parts.map(p => (/^<(script|style)/.test(p) ? p : p.replace(/<!--[\s\S]*?-->/g, ''))).join('');
  // JavaScript (and anything else outside <style>): line by line
  const out = [];
  let block = false, inStyle = false;
  for (const line of page.split('\n')) {
    if (/<style[\s>]/.test(line)) inStyle = true;
    if (inStyle) { out.push(line); if (/<\/style>/.test(line)) inStyle = false; continue; }
    const t = line.trim();
    if (block) { if (t.includes('*/')) { block = false; const rest = line.slice(line.indexOf('*/') + 2); if (rest.trim()) out.push(rest); } continue; }
    if (t.startsWith('//')) continue;
    if (t.startsWith('/*')) { if (!t.includes('*/')) { block = true; continue; } const rest = line.slice(line.indexOf('*/') + 2); if (rest.trim()) out.push(rest); continue; }
    out.push(line.replace(/([;,{}\])])[ \t]+\/\/ .*$/, '$1').replace(/[ \t]*\/\* [A-Za-z0-9 ,.'():?!-]+ \*\//g, ''));
  }
  // blank lines left behind
  return out.join('\n').replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n');
}
