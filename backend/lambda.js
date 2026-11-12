// API Gateway HTTP API v2 adapter. Importing server.js does not start a listener.
const serverless = require("serverless-http");
const app = require("./server");
const handle = serverless(app);
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return handle(event, context);
};
