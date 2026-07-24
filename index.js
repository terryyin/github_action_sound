#!/usr/bin/env node

const { exec } = require('child_process');
const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const Reset = '\x1b[0m';
const Bright = '\x1b[1m';
const Dim = '\x1b[2m';
const Underscore = '\x1b[4m';
const Blink = '\x1b[5m';
const Reverse = '\x1b[7m';
const Hidden = '\x1b[8m';

const FgBlack = '\x1b[30m';
const FgRed = '\x1b[31m';
const FgGreen = '\x1b[32m';
const FgYellow = '\x1b[33m';
const FgBlue = '\x1b[34m';
const FgMagenta = '\x1b[35m';
const FgCyan = '\x1b[36m';
const FgWhite = '\x1b[37m';

const BgBlack = '\x1b[40m';
const BgRed = '\x1b[41m';
const BgGreen = '\x1b[42m';
const BgYellow = '\x1b[43m';
const BgBlue = '\x1b[44m';
const BgMagenta = '\x1b[45m';
const BgCyan = '\x1b[46m';
const BgWhite = '\x1b[47m';

function now() {
  var currentdate = new Date();
  return (
    currentdate.getDate() +
    '/' +
    (currentdate.getMonth() + 1) +
    '/' +
    currentdate.getFullYear() +
    '@' +
    currentdate.getHours() +
    ':' +
    currentdate.getMinutes() +
    ':' +
    currentdate.getSeconds()
  );
}

function say(sentence, colorCode) {
  if (sentence === '') {
    return;
  }
  console.error(colorCode + now() + ': ' + sentence + Reset);
  exec('say "' + sentence + '"', (err, _stdout, _stderr) => {
    if (err) {
      console.error(err);
    }
  });
}

const Status = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILURE: 'failure',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  ACTION_REQUIRED: 'action_required',
  UNKNOWN: 'unknown',
});

function statusHead(ariaLabel) {
  const raw = String(ariaLabel || '').trim();
  const head = raw.includes(':') ? raw.slice(0, raw.indexOf(':')) : raw;
  return head.trim().toLowerCase();
}

function normalizeStatus(ariaLabel) {
  const s = statusHead(ariaLabel);
  if (s === 'queued' || s.startsWith('queued')) return Status.QUEUED;
  if (s === 'currently running') return Status.RUNNING;
  if (s === 'completed successfully') return Status.SUCCESS;
  if (s === 'failed') return Status.FAILURE;
  if (s.includes('cancelled') || s.includes('canceled')) return Status.CANCELLED;
  if (s === 'skipped') return Status.SKIPPED;
  if (s.includes('requires action')) return Status.ACTION_REQUIRED;
  console.error('Unrecognized Actions status aria-label:', ariaLabel);
  return Status.UNKNOWN;
}

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

class BuildState {
  constructor(buildName, status, gitLog) {
    this.buildName = buildName;
    this.status = status;
    this.gitLog = gitLog;
  }

  diffToSentence(previousState, dictionary) {
    const statusPhrase = dictionary.translate(this.status);
    // D-05 / T-01-05: never invent speech for unknown or missing phrases
    if (this.status === Status.UNKNOWN || statusPhrase === '') {
      return '';
    }
    if (this.buildName != previousState.buildName) {
      return (
        dictionary.translate('new_build') +
        `'${this.gitLog}'` +
        statusPhrase
      );
    }
    if (this.status !== Status.QUEUED && this.status != previousState.status) {
      return dictionary.translate('the_build') + ` '${this.gitLog}'` + statusPhrase;
    }
    return '';
  }

  colorCode() {
    return {
      [Status.QUEUED]: BgBlue + FgYellow + Blink,
      [Status.RUNNING]: BgBlue + FgYellow + Blink,
      [Status.SUCCESS]: BgGreen + FgBlack,
      [Status.FAILURE]: BgRed + FgYellow + Blink,
      [Status.CANCELLED]: BgYellow + FgBlack,
      [Status.SKIPPED]: Dim,
      [Status.ACTION_REQUIRED]: BgYellow + FgBlack + Blink,
    }[this.status];
  }
}

const englishDictionary = {
  translate: function (phrase) {
    return (
      {
        new_build: 'A new build ',
        the_build: 'The build',
        [Status.QUEUED]: ' has been queued.',
        [Status.RUNNING]: ' is currently running.',
        [Status.SUCCESS]: ' completed successfully.',
        [Status.FAILURE]: ' failed.',
        [Status.CANCELLED]: ' was cancelled.',
        [Status.SKIPPED]: ' was skipped.',
        [Status.ACTION_REQUIRED]: ' requires action.',
      }[phrase] || ''
    );
  },
};

const japaneseDictionary = {
  translate: function (phrase) {
    return (
      {
        new_build: '新規プッシュがありました：',
        the_build: '現プッシュが',
        'has been queued.': '準備中。',
        'is currently running.': '運転中。',
        'completed successfully.': '成功しました！',
        'failed.': '失敗しました！直してください',
      }[phrase] || ` ${phrase}`
    );
  },
};

const githubActionURL = process.argv[process.argv.length - 1];

function isInFlight(status) {
  return status === Status.QUEUED || status === Status.RUNNING;
}

function isTerminal(status) {
  return [
    Status.SUCCESS,
    Status.FAILURE,
    Status.CANCELLED,
    Status.SKIPPED,
  ].includes(status);
}

const InFlightBuildStore = () => {
  const statesById = new Map();

  function descriptor(next, previous) {
    return {
      statement: next.diffToSentence(previous, englishDictionary),
      colorCode: next.colorCode(),
    };
  }

  function apply(states) {
    const announcements = [];
    for (const next of states) {
      const previous = statesById.get(next.buildName);
      if (!previous) {
        if (isInFlight(next.status)) {
          statesById.set(next.buildName, next);
          announcements.push(descriptor(next, new BuildState('', '')));
        }
        continue;
      }

      if (next.status === Status.UNKNOWN) {
        statesById.set(next.buildName, next);
        continue;
      }

      const announcement = descriptor(next, previous);
      statesById.set(next.buildName, next);
      if (announcement.statement !== '') {
        announcements.push(announcement);
      }
      if (isTerminal(next.status)) {
        statesById.delete(next.buildName);
      }
    }

    return announcements;
  }

  return {
    apply,
    has: (id) => statesById.has(id),
    get: (id) => statesById.get(id),
    get size() {
      return statesById.size;
    },
  };
};

const inFlightBuildStore = InFlightBuildStore();

const actionSoundJob = async (
  url = githubActionURL,
  announce = say,
  store = inFlightBuildStore
) => {
  const states = await buildStates(url);
  if (states == null) return [];

  const announcements = store.apply(states);
  for (const announcement of announcements) {
    announce(announcement.statement, announcement.colorCode);
  }
  return announcements;
};

const timer = setInterval(actionSoundJob , 5000);

module.exports = {
  buildStates,
  BuildState,
  say,
  englishDictionary,
  InFlightBuildStore,
  actionSoundJob,
  timer,
  Status,
  normalizeStatus,
};

