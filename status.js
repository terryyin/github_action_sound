const Dim = '\x1b[2m';
const Blink = '\x1b[5m';

const FgBlack = '\x1b[30m';
const FgYellow = '\x1b[33m';

const BgRed = '\x1b[41m';
const BgGreen = '\x1b[42m';
const BgYellow = '\x1b[43m';
const BgBlue = '\x1b[44m';

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

module.exports = {
  Status,
  normalizeStatus,
  BuildState,
  englishDictionary,
};
