const {
  Status,
  BuildState,
  englishDictionary,
} = require('./status');

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

module.exports = {
  InFlightBuildStore,
  isInFlight,
  isTerminal,
};
