const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { BuildState, normalizeStatus } = require('./status');

async function buildStates(url) {
  try {
    const resp = await got(url);
    const dom = new JSDOM(resp.body);
    const rows = dom.window.document.querySelectorAll("[id^='check_suite_']");
    if (rows.length === 0) return null;

    const states = [];
    for (const row of rows) {
      const svg = row.querySelector('svg[aria-label]');
      const title = row.querySelector('span.Link--primary');
      const aria = svg && svg.getAttribute('aria-label');
      if (!row.id || !svg || !aria || !title) {
        console.error('Skipping malformed check suite:', row.id);
        continue;
      }
      states.push(
        new BuildState(row.id, normalizeStatus(aria), title.textContent.trim())
      );
    }
    return states.length > 0 ? states : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

module.exports = { buildStates };
