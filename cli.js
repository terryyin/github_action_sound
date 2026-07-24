#!/usr/bin/env node

const { actionSoundJob, InFlightBuildStore, say } = require('./index');

const url = process.argv[process.argv.length - 1];
const store = InFlightBuildStore();

setInterval(() => actionSoundJob(url, say, store), 5000);
