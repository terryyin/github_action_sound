/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(@exodus\\+|got@|jsdom@|html-encoding-sniffer@|whatwg-encoding@|nwsapi@|parse5@|saxes@|symbol-tree@|w3c-xmlserializer@|webidl-conversions@|whatwg-url@|ws@|xml-name-validator@))',
  ],
};
