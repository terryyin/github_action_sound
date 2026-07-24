const { say } = require('./announce');
const { buildStates } = require('./scrape');
const {
  Status,
  normalizeStatus,
  BuildState,
  englishDictionary,
} = require('./status');
const { InFlightBuildStore } = require('./store');

const actionSoundJob = async (url, announce, store) => {
  const states = await buildStates(url);
  if (states == null) return [];

  const announcements = store.apply(states);
  for (const announcement of announcements) {
    announce(announcement.statement, announcement.colorCode);
  }
  return announcements;
};

module.exports = {
  buildStates,
  BuildState,
  say,
  englishDictionary,
  InFlightBuildStore,
  actionSoundJob,
  Status,
  normalizeStatus,
};

