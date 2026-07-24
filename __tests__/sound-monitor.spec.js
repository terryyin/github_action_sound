const got = require('got');
const { execFile } = require('child_process');
const {
  buildStates,
  BuildState,
  englishDictionary,
  InFlightBuildStore,
  actionSoundJob,
  say,
  Status,
  normalizeStatus,
} = require('../index.js');

jest.mock('got');
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

function suiteRow({ id, ariaLabel, title }) {
  return `
    <div id="${id}">
      <svg aria-label="${ariaLabel}"></svg>
      <span class="Link--primary">${title}</span>
    </div>
  `;
}

function suitePage(...rows) {
  return `<html><body>${rows.join('')}</body></html>`;
}

const html = `
<div class="Box-row js-socket-channel js-updatable-content" id="check_suite_10845785161" data-channel="eyJjIjoiY2hlY2tfc3VpdGVzOjEwODQ1Nzg1MTYxIiwidCI6MTY3NTgzMjEwOH0=--d66330a43c420e89112639127d93d12d161a708d48d3d73fdf99e185b88d1f96" data-url="/nerds-odd-e/feature-teams-site/actions/workflow-run/10845785161">
  <div class="d-table col-12">
    <div class="d-table-cell v-align-top col-11 col-md-6 pl-4 position-relative">
      <div class="position-absolute left-0 checks-list-item-icon text-center">

<div class="d-flex flex-items-center flex-justify-center">
    <svg width="16" height="16" style="margin-top: 2px" class="octicon octicon-check-circle-fill color-fg-success" aria-label="completed successfully" viewBox="0 0 16 16" version="1.1" role="img"><path fill-rule="evenodd" d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z"></path></svg>
</div>

      </div>

      <span class="h4 d-inline-block text-bold lh-condensed mb-1 width-full">
        <span class="Link--primary css-truncate css-truncate-target" style="min-width: 100%" aria-label="Run 11 of Docker Image CI. trigger build" href="/nerds-odd-e/feature-teams-site/actions/runs/4120919627">trigger build</a>
      </span>

      <span class="d-block text-small color-fg-muted mb-1 mb-md-0">
        <span class="text-bold">Docker Image CI</span>
        #11:

        <span class="color-fg-muted">
            Commit <a class="Link--muted" href="/nerds-odd-e/feature-teams-site/commit/473895939fe6a3a1c64687061d2406b25b4d49d8">4738959</a>

            pushed
            by
              <a class="Link--muted" data-hovercard-type="user" data-hovercard-url="/users/terryyin/hovercard" data-octo-click="hovercard-link-click" data-octo-dimensions="link_type:self" href="/terryyin">terryyin</a>

        </span>
      </span>

      <div class="d-block d-md-none text-small">
        <span class="d-inline d-md-block lh-condensed color-fg-muted my-1 pr-2 pr-md-0" title="Start time">
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-calendar">
    <path fill-rule="evenodd" d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 014.75 0zm0 3.5h8.5a.25.25 0 01.25.25V6h-11V3.75a.25.25 0 01.25-.25h2zm-2.25 4v6.75c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25V7.5h-11z"></path>
</svg>
  <relative-time tense="past" datetime="2023-02-08T05:53:30+01:00" data-view-component="true" title="Feb 8, 2023, 5:53 AM GMT+1">February 8, 2023 05:53</relative-time>
</span>

            <span class="color-fg-muted">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-stopwatch">
    <path fill-rule="evenodd" d="M5.75.75A.75.75 0 016.5 0h3a.75.75 0 010 1.5h-.75v1l-.001.041a6.718 6.718 0 013.464 1.435l.007-.006.75-.75a.75.75 0 111.06 1.06l-.75.75-.006.007a6.75 6.75 0 11-10.548 0L2.72 5.03l-.75-.75a.75.75 0 011.06-1.06l.75.75.007.006A6.718 6.718 0 017.25 2.541a.756.756 0 010-.041v-1H6.5a.75.75 0 01-.75-.75zM8 14.5A5.25 5.25 0 108 4a5.25 5.25 0 000 10.5zm.389-6.7l1.33-1.33a.75.75 0 111.061 1.06L9.45 8.861A1.502 1.502 0 018 10.75a1.5 1.5 0 11.389-2.95z"></path>
</svg>
      <span>
        1m 37s
      </span>
    </span>

          <a target="_parent" class="d-inline-block branch-name css-truncate css-truncate-target my-0 my-md-1" style="max-width: 200px;" title="master" href="/nerds-odd-e/feature-teams-site">master</a>
      </div>
    </div>

    <div class="d-none d-md-table-cell v-align-middle col-4 pl-2 px-md-3 position-relative">
        <a target="_parent" class="d-inline-block branch-name css-truncate css-truncate-target my-0 my-md-1" style="max-width: 200px;" title="master" href="/nerds-odd-e/feature-teams-site">master</a>
    </div>

    <div class="d-table-cell v-align-middle col-1 col-md-3 text-small">
      <div class="d-flex flex-justify-between flex-items-center">
        <div class="d-none d-md-block">
          <span class="d-inline d-md-block lh-condensed color-fg-muted my-1 pr-2 pr-md-0" title="Start time">
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-calendar">
    <path fill-rule="evenodd" d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 014.75 0zm0 3.5h8.5a.25.25 0 01.25.25V6h-11V3.75a.25.25 0 01.25-.25h2zm-2.25 4v6.75c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25V7.5h-11z"></path>
</svg>
  <relative-time tense="past" datetime="2023-02-08T05:53:30+01:00" data-view-component="true" title="Feb 8, 2023, 5:53 AM GMT+1">February 8, 2023 05:53</relative-time>
</span>

              <span class="color-fg-muted">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-stopwatch">
    <path fill-rule="evenodd" d="M5.75.75A.75.75 0 016.5 0h3a.75.75 0 010 1.5h-.75v1l-.001.041a6.718 6.718 0 013.464 1.435l.007-.006.75-.75a.75.75 0 111.06 1.06l-.75.75-.006.007a6.75 6.75 0 11-10.548 0L2.72 5.03l-.75-.75a.75.75 0 011.06-1.06l.75.75.007.006A6.718 6.718 0 017.25 2.541a.756.756 0 010-.041v-1H6.5a.75.75 0 01-.75-.75zM8 14.5A5.25 5.25 0 108 4a5.25 5.25 0 000 10.5zm.389-6.7l1.33-1.33a.75.75 0 111.061 1.06L9.45 8.861A1.502 1.502 0 018 10.75a1.5 1.5 0 11.389-2.95z"></path>
</svg>
      <span>
        1m 37s
      </span>
    </span>

        </div>

        <div class="text-right">
            <details class="details-overlay details-reset position-relative d-inline-block ">
                <summary aria-haspopup="menu" data-view-component="true" class="timeline-comment-action btn-link">    <svg aria-label="Show options" aria-hidden="false" role="img" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-kebab-horizontal">
    <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
</svg>
</summary>
              <ul class="dropdown-menu dropdown-menu-sw show-more-popover color-fg-default anim-scale-in" style="width: 185px">


                  <li>
                    <a href="/nerds-odd-e/feature-teams-site/actions/runs/4120919627/workflow" class="dropdown-item btn-link">
                      View workflow file
                    </a>
                  </li>

                  <li>
                    <details data-view-component="true" class="details-overlay details-overlay-dark details-reset">
  <summary role="button" data-view-component="true" class="dropdown-item btn-link menu-item-danger">    Delete workflow run
</summary>
  <details-dialog src="/nerds-odd-e/feature-teams-site/actions/runs/4120919627/delete" aria-label="Delete workflow run" data-view-component="true" class="Box Box--overlay flex-column fast Box-overlay--wide overflow-y-hidden d-flex anim-fade-in text-left" role="dialog" aria-modal="true">    <include-fragment>
      <svg style="box-sizing: content-box; color: var(--color-icon-primary);" width="32" height="32" viewBox="0 0 16 16" fill="none" data-view-component="true" class="my-3 mx-auto d-block anim-rotate">
  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" vector-effect="non-scaling-stroke"></circle>
  <path d="M15 8a7.002 7.002 0 00-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
</svg>
    </include-fragment>
</details-dialog>
</details>
                  </li>
              </ul>
            </details>
        </div>
      </div>
    </div>
  </div>
</div>
  `;

test('two-suite fan-out: scrape → Map → ordered announce', async () => {
  const url = 'https://github.com/org/repo/actions';
  const store = InFlightBuildStore();
  const announce = jest.fn();
  const firstPage = suitePage(
    suiteRow({
      id: 'check_suite_a',
      ariaLabel: 'currently running: Run A',
      title: 'same title',
    }),
    suiteRow({
      id: 'check_suite_b',
      ariaLabel: 'queued: Run B',
      title: 'same title',
    })
  );
  const secondPage = suitePage(
    suiteRow({
      id: 'check_suite_a',
      ariaLabel: 'completed successfully: Run A',
      title: 'title A',
    }),
    suiteRow({
      id: 'check_suite_b',
      ariaLabel: 'failed: Run B',
      title: 'title B',
    })
  );

  got
    .mockResolvedValueOnce({ body: firstPage })
    .mockResolvedValueOnce({ body: firstPage })
    .mockResolvedValueOnce({ body: secondPage });

  const firstStates = await buildStates(url);
  expect(firstStates).toEqual([
    expect.objectContaining({
      buildName: 'check_suite_a',
      status: Status.RUNNING,
      gitLog: 'same title',
    }),
    expect.objectContaining({
      buildName: 'check_suite_b',
      status: Status.QUEUED,
      gitLog: 'same title',
    }),
  ]);

  await actionSoundJob(url, announce, store);
  expect(store.size).toBe(2);
  expect(store.has('check_suite_a')).toBe(true);
  expect(store.has('check_suite_b')).toBe(true);
  expect(announce.mock.calls.map(([statement]) => statement)).toEqual([
    "A new build 'same title' is currently running.",
    "A new build 'same title' has been queued.",
  ]);

  announce.mockClear();
  await actionSoundJob(url, announce, store);
  expect(announce.mock.calls.map(([statement]) => statement)).toEqual([
    "The build 'title A' completed successfully.",
    "The build 'title B' failed.",
  ]);
});

test('buildStates returns null when got rejects', async () => {
  got.mockRejectedValue(new Error('network down'));
  await expect(
    buildStates('https://github.com/org/repo/actions')
  ).resolves.toBeNull();
});

test('buildStates returns null when check_suite missing', async () => {
  got.mockResolvedValue({ body: '<html><body>no suites</body></html>' });
  await expect(
    buildStates('https://github.com/org/repo/actions')
  ).resolves.toBeNull();
});

test('null scrape does not mutate InFlightBuildStore state', async () => {
  const store = InFlightBuildStore();
  const announce = jest.fn();
  store.apply([new BuildState('check_suite_1', Status.RUNNING, 'seeded')]);
  got.mockRejectedValue(new Error('network down'));
  await expect(
    actionSoundJob('https://github.com/org/repo/actions', announce, store)
  ).resolves.toEqual([]);
  expect(store.has('check_suite_1')).toBe(true);
  expect(announce).not.toHaveBeenCalled();
});

test('buildStates returns all valid rows in DOM order', async () => {
  got.mockResolvedValue({ body: html });
  await expect(buildStates()).resolves.toEqual([
    expect.objectContaining({
      status: Status.SUCCESS,
      gitLog: 'trigger build',
      buildName: 'check_suite_10845785161',
    }),
  ]);
  expect(englishDictionary.translate(Status.SUCCESS)).toBe(
    ' completed successfully.'
  );
});

function htmlWithAriaLabel(ariaLabel) {
  return html.replace(
    'aria-label="completed successfully"',
    `aria-label="${ariaLabel}"`
  );
}

test('buildStates skips malformed siblings and preserves valid DOM order', async () => {
  const malformed = '<div id="check_suite_bad"><svg></svg></div>';
  got.mockResolvedValue({
    body: suitePage(
      suiteRow({
        id: 'check_suite_first',
        ariaLabel: 'queued: first',
        title: 'first',
      }),
      malformed,
      suiteRow({
        id: 'check_suite_last',
        ariaLabel: 'currently running: last',
        title: 'last',
      })
    ),
  });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(buildStates()).resolves.toEqual([
    expect.objectContaining({ buildName: 'check_suite_first' }),
    expect.objectContaining({ buildName: 'check_suite_last' }),
  ]);
  expect(error).toHaveBeenCalledWith(
    'Skipping malformed check suite:',
    'check_suite_bad'
  );
  error.mockRestore();
});

test('buildStates returns null for all-malformed suite rows', async () => {
  got.mockResolvedValue({
    body: '<div id="check_suite_bad"><span class="Link--primary">bad</span></div>',
  });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(buildStates()).resolves.toBeNull();
  error.mockRestore();
});

test('same-title suites remain distinct Map identities', () => {
  const store = InFlightBuildStore();
  store.apply([
    new BuildState('check_suite_a', Status.RUNNING, 'same title'),
    new BuildState('check_suite_b', Status.QUEUED, 'same title'),
  ]);
  expect(store.size).toBe(2);
  expect(store.get('check_suite_a').status).toBe(Status.RUNNING);
  expect(store.get('check_suite_b').status).toBe(Status.QUEUED);
});

describe('live-shaped scrape fixtures (01-02 REL-04)', () => {
  test('live-shaped success aria-label scrapes to Status.SUCCESS', async () => {
    const liveShaped = htmlWithAriaLabel(
      'completed successfully:  Run 1 of CI. title'
    );
    got.mockResolvedValue({ body: liveShaped });
    const [state] = await buildStates('https://github.com/org/repo/actions');
    expect(state.status).toBe(Status.SUCCESS);
    expect(state.colorCode()).toBeDefined();
    expect(state.gitLog).toBe('trigger build');
  });

  const liveCases = [
    ['queued:  Run 1 of CI. title', Status.QUEUED],
    ['currently running:  Run 1 of CI. title', Status.RUNNING],
    ['failed:  Run 1 of CI. title', Status.FAILURE],
    ['skipped:  Run 1 of CI. title', Status.SKIPPED],
    ['cancelled:  Run 1 of CI. title', Status.CANCELLED],
    ['requires action with the application:  Run 1 of CI. title', Status.ACTION_REQUIRED],
  ];

  test.each(liveCases)(
    'live-shaped %s scrapes to %s with defined color',
    async (ariaLabel, expected) => {
      got.mockResolvedValue({ body: htmlWithAriaLabel(ariaLabel) });
      const [state] = await buildStates('https://github.com/org/repo/actions');
      expect(state.status).toBe(expected);
      expect(state.colorCode()).toBeDefined();
    }
  );

  test('unrecognized live-shaped label scrapes to unknown without crash', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    got.mockResolvedValue({
      body: htmlWithAriaLabel('mystery status:  Run 1 of CI. title'),
    });
    const [state] = await buildStates('https://github.com/org/repo/actions');
    expect(state.status).toBe(Status.UNKNOWN);
    expect(state.colorCode()).toBeUndefined();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});

describe('normalizeStatus full mapping (01-02)', () => {
  const cases = [
    ['queued', Status.QUEUED],
    ['queued:  Run 1 of CI. title', Status.QUEUED],
    ['currently running', Status.RUNNING],
    ['currently running:  Run 1 of CI. title', Status.RUNNING],
    ['completed successfully', Status.SUCCESS],
    ['completed successfully:  Run 1 of CI. title', Status.SUCCESS],
    ['failed', Status.FAILURE],
    ['failed:  Run 1 of CI. title', Status.FAILURE],
    ['skipped', Status.SKIPPED],
    ['skipped:  Run 1 of CI. title', Status.SKIPPED],
    ['cancelled', Status.CANCELLED],
    ['canceled', Status.CANCELLED],
    ['cancelled:  Run 1 of CI. title', Status.CANCELLED],
    ['requires action with the application', Status.ACTION_REQUIRED],
    ['requires action with the application:  Run 1 of CI. title', Status.ACTION_REQUIRED],
  ];

  test.each(cases)('maps %s → %s', (label, expected) => {
    expect(normalizeStatus(label)).toBe(expected);
  });

  test('unrecognized label → unknown without throwing', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(normalizeStatus('totally weird status')).toBe(Status.UNKNOWN);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});

describe('enum-only colors and phrases (01-02)', () => {
  const known = [
    Status.QUEUED,
    Status.RUNNING,
    Status.SUCCESS,
    Status.FAILURE,
    Status.CANCELLED,
    Status.SKIPPED,
    Status.ACTION_REQUIRED,
  ];

  test.each(known)('colorCode defined for %s', (status) => {
    expect(new BuildState('b', status, 'log').colorCode()).toBeDefined();
  });

  test.each(known)('english phrase defined for %s', (status) => {
    expect(englishDictionary.translate(status)).not.toBe('');
  });

  test('unknown has no color and no speech phrase', () => {
    expect(new BuildState('b', Status.UNKNOWN, 'log').colorCode()).toBeUndefined();
    expect(englishDictionary.translate(Status.UNKNOWN)).toBe('');
  });

  test('unknown status yields empty statement (no invented speech)', () => {
    const prev = new BuildState('b', Status.RUNNING, 'log');
    const next = new BuildState('b', Status.UNKNOWN, 'log');
    expect(next.diffToSentence(prev, englishDictionary)).toBe('');

    const fresh = new BuildState('new', Status.UNKNOWN, 'log');
    expect(fresh.diffToSentence(new BuildState('', ''), englishDictionary)).toBe('');
  });

  test('tracked unknown remains silent without losing its Map entry', () => {
    const store = InFlightBuildStore();
    store.apply([new BuildState('b1', Status.RUNNING, 'log')]);
    const announcements = store.apply([
      new BuildState('b1', Status.UNKNOWN, 'log'),
    ]);
    expect(announcements).toEqual([]);
    expect(store.has('b1')).toBe(true);
  });
});

describe('terminal retirement, re-admission, and absence retention (02-02)', () => {
  const terminalCases = [
    [Status.SUCCESS, 'completed successfully.'],
    [Status.FAILURE, 'failed.'],
    [Status.CANCELLED, 'was cancelled.'],
    [Status.SKIPPED, 'was skipped.'],
  ];

  test.each(terminalCases)(
    'tracked running build announces %s once, then retires',
    (terminalStatus, expectedPhrase) => {
      const store = InFlightBuildStore();
      const id = 'check_suite_terminal';

      store.apply([new BuildState(id, Status.RUNNING, 'earlier title')]);
      const announcements = store.apply([
        new BuildState(id, terminalStatus, 'latest title'),
      ]);

      expect(announcements).toHaveLength(1);
      expect(announcements[0].statement).toContain("'latest title'");
      expect(announcements[0].statement).toContain(expectedPhrase);
      expect(store.has(id)).toBe(false);
    }
  );

  test('historical terminal rows stay silent and a retired id can re-admit', () => {
    const store = InFlightBuildStore();
    const id = 'check_suite_re_admit';

    expect(
      store.apply([new BuildState(id, Status.SUCCESS, 'historical title')])
    ).toEqual([]);
    expect(store.has(id)).toBe(false);

    store.apply([new BuildState(id, Status.RUNNING, 'first run')]);
    store.apply([new BuildState(id, Status.FAILURE, 'first run')]);
    expect(store.has(id)).toBe(false);
    expect(
      store.apply([new BuildState(id, Status.FAILURE, 'historical again')])
    ).toEqual([]);

    const reAdmission = store.apply([
      new BuildState(id, Status.QUEUED, 'rerun title'),
    ]);
    expect(reAdmission).toEqual([
      expect.objectContaining({
        statement: "A new build 'rerun title' has been queued.",
      }),
    ]);
    expect(store.has(id)).toBe(true);
  });

  test('successful-snapshot absence leaves tracked builds untouched and silent', () => {
    const store = InFlightBuildStore();
    const retained = new BuildState(
      'check_suite_retained',
      Status.RUNNING,
      'still running'
    );
    const observed = new BuildState(
      'check_suite_observed',
      Status.QUEUED,
      'other suite'
    );

    store.apply([retained, observed]);
    const announcements = store.apply([
      new BuildState('check_suite_observed', Status.QUEUED, 'other suite'),
    ]);

    expect(announcements).toEqual([]);
    expect(store.get('check_suite_retained')).toEqual(retained);
    expect(store.has('check_suite_retained')).toBe(true);
  });
});

describe('attention, unknown, title refresh, and descriptor order (02-02)', () => {
  test('action_required is tracked-only, announces a transition, and stays tracked', () => {
    const store = InFlightBuildStore();
    const id = 'check_suite_attention';

    expect(
      store.apply([new BuildState(id, Status.ACTION_REQUIRED, 'first seen')])
    ).toEqual([]);
    expect(store.has(id)).toBe(false);

    store.apply([new BuildState(id, Status.RUNNING, 'running title')]);
    const announcements = store.apply([
      new BuildState(id, Status.ACTION_REQUIRED, 'attention title'),
    ]);

    expect(announcements).toEqual([
      expect.objectContaining({
        statement: "The build 'attention title' requires action.",
      }),
    ]);
    expect(store.get(id)).toEqual(
      expect.objectContaining({
        status: Status.ACTION_REQUIRED,
        gitLog: 'attention title',
      })
    );
  });

  test('unknown is tracked-only, silent, and refreshes the stored snapshot', () => {
    const store = InFlightBuildStore();
    const id = 'check_suite_unknown';

    expect(
      store.apply([new BuildState(id, Status.UNKNOWN, 'first seen')])
    ).toEqual([]);
    expect(store.has(id)).toBe(false);

    store.apply([new BuildState(id, Status.RUNNING, 'known title')]);
    expect(
      store.apply([new BuildState(id, Status.UNKNOWN, 'unknown title')])
    ).toEqual([]);
    expect(store.get(id)).toEqual(
      expect.objectContaining({
        status: Status.UNKNOWN,
        gitLog: 'unknown title',
      })
    );
  });

  test('same-status observations refresh titles for later terminal output', () => {
    const store = InFlightBuildStore();
    const id = 'check_suite_title_refresh';

    store.apply([new BuildState(id, Status.RUNNING, 'title A')]);
    expect(
      store.apply([new BuildState(id, Status.RUNNING, 'title B')])
    ).toEqual([]);
    expect(store.get(id).gitLog).toBe('title B');

    expect(
      store.apply([new BuildState(id, Status.SUCCESS, 'title B')])
    ).toEqual([
      expect.objectContaining({
        statement: "The build 'title B' completed successfully.",
      }),
    ]);
  });

  test.each([
    [
      ['check_suite_a', 'check_suite_b'],
      ['check_suite_a', 'check_suite_b'],
    ],
    [
      ['check_suite_b', 'check_suite_a'],
      ['check_suite_b', 'check_suite_a'],
    ],
  ])(
    'changed rows announce in input order %p',
    async (inputOrder, expectedOrder) => {
      const store = InFlightBuildStore();
      const announce = jest.fn();
      const url = 'https://github.com/org/repo/actions';
      const initialRows = ['check_suite_a', 'check_suite_b'].map((id) =>
        suiteRow({
          id,
          ariaLabel: `currently running: ${id}`,
          title: id === 'check_suite_a' ? 'title A' : 'title B',
        })
      );
      const changedRows = inputOrder.map((id) =>
        suiteRow({
          id,
          ariaLabel: `failed: ${id}`,
          title: id === 'check_suite_a' ? 'title A' : 'title B',
        })
      );

      got.mockReset();
      got
        .mockResolvedValueOnce({ body: suitePage(...initialRows) })
        .mockResolvedValueOnce({ body: suitePage(...changedRows) });
      await actionSoundJob(url, announce, store);
      announce.mockClear();
      const announcements = await actionSoundJob(url, announce, store);

      expect(announcements.map(({ statement }) => statement)).toEqual(
        expectedOrder.map((id) =>
          id === 'check_suite_a'
            ? "The build 'title A' failed."
            : "The build 'title B' failed."
        )
      );
      expect(announce.mock.calls.map(([statement]) => statement)).toEqual(
        announcements.map(({ statement }) => statement)
      );
    }
  );
});

describe('safe CLI-to-speech boundary (03-01)', () => {
  afterEach(() => {
    execFile.mockReset();
  });

  test('say sends hostile scraped text as one argv item', () => {
    const sentence = 'quoted "title" $(whoami); next\nline';
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    say(sentence, '');

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith(
      'say',
      [sentence],
      expect.any(Function)
    );
    error.mockRestore();
  });

  test('requiring the library starts no runtime side effects or timer export', () => {
    jest.resetModules();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    jest.isolateModules(() => {
      const isolatedGot = require('got');
      const { execFile: isolatedExecFile } = require('child_process');
      isolatedGot.mockClear();
      isolatedExecFile.mockClear();

      const library = require('../index.js');

      expect(library).not.toHaveProperty('timer');
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(isolatedGot).not.toHaveBeenCalled();
      expect(isolatedExecFile).not.toHaveBeenCalled();
    });

    setIntervalSpy.mockRestore();
  });

  test('cli owns argv, store construction, and the five-second poll interval', () => {
    jest.resetModules();
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation(() => 1);
    const actionSoundJob = jest.fn();
    const InFlightBuildStore = jest.fn(() => ({ apply: jest.fn() }));
    const cliSay = jest.fn();
    const originalArgv = process.argv;
    process.argv = ['node', 'cli.js', 'https://github.com/org/repo/actions'];

    jest.doMock('../index.js', () => ({
      actionSoundJob,
      InFlightBuildStore,
      say: cliSay,
    }));

    require('../cli.js');

    expect(InFlightBuildStore).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

    setIntervalSpy.mockRestore();
    process.argv = originalArgv;
    jest.dontMock('../index.js');
  });
});
