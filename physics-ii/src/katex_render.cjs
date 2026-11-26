#!/usr/bin/env node
/**
 * Build-time KaTeX renderer.
 * Reads JSON map { key: { tex: string, display: boolean } } from stdin,
 * writes JSON map { key: { html: string, error?: string } } to stdout.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const katex = require(path.join(__dirname, '..', 'assets', 'katex', 'katex.min.js'));

const raw = fs.readFileSync(0, 'utf8');
const items = JSON.parse(raw);
const out = {};

for (const [key, spec] of Object.entries(items)) {
  const tex = String(spec.tex || '').trim();
  const displayMode = Boolean(spec.display);
  try {
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: true,
      strict: false,
      trust: false,
      output: 'htmlAndMathml'
    });
    out[key] = { html };
  } catch (err) {
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'htmlAndMathml'
    });
    out[key] = { html, error: String(err && err.message ? err.message : err) };
  }
}

process.stdout.write(JSON.stringify(out));
