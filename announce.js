const { execFile } = require('child_process');

const Reset = '\x1b[0m';

function now() {
  const currentdate = new Date();
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
  execFile('say', [sentence], (err) => {
    if (err) {
      console.error(err);
    }
  });
}

module.exports = {
  say,
  now,
};
