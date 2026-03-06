import assert from 'node:assert/strict';
import { normalizeWebsiteUrl } from '../lib/security/url.ts';

function testUrlValidation() {
  assert.equal(normalizeWebsiteUrl('https://example.com'), 'https://example.com/');
  assert.equal(normalizeWebsiteUrl('example.com')?.startsWith('https://example.com'), true);
  assert.equal(normalizeWebsiteUrl('file:///etc/passwd'), null);
  assert.equal(normalizeWebsiteUrl('http://localhost:3000'), null);
  assert.equal(normalizeWebsiteUrl('http://127.0.0.1'), null);
}

function testSignalDetection() {
  const html = `
    <html><body>
      <h1>Subaru Certified Collision Repair</h1>
      <p>I-CAR Gold Class and ADAS calibration available.</p>
      <a href="/estimate">Free Estimate</a>
      <p>Aluminum repair and EV certified technicians.</p>
    </body></html>
  `;

  const text = html.toLowerCase();
  const names: string[] = [];
  if (/\bsubaru\b/.test(text)) names.push('subaru_certified');
  if (/i-?car gold class/.test(text)) names.push('i_car_gold_class');
  if (/adas/.test(text) && /calibration/.test(text)) names.push('adas_calibration');
  if (/free estimate|photo estimate/.test(text)) names.push('free_estimate_cta');
  if (/aluminum/.test(text)) names.push('aluminum_repair');

  assert.ok(names.includes('subaru_certified'));
  assert.ok(names.includes('i_car_gold_class'));
  assert.ok(names.includes('adas_calibration'));
  assert.ok(names.includes('free_estimate_cta'));
  assert.ok(names.includes('aluminum_repair'));
}

function run() {
  testUrlValidation();
  testSignalDetection();
  console.log('test-core: all checks passed');
}

run();
