"use strict";

const http = require("node:http");

const createSilentLogger = () => ({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});

const requestJson = ({ port, path = "/api/lead", method = "POST", headers = {}, body = {} }) =>
  new Promise((resolve, reject) => {
    const requestBody = typeof body === "string" ? body : JSON.stringify(body);
    const requestHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(requestBody),
      ...headers,
    };

    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: requestHeaders,
      },
      (res) => {
        let chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          chunks += chunk;
        });
        res.on("end", () => {
          let parsed = {};
          try {
            parsed = JSON.parse(chunks || "{}");
          } catch (_error) {
            parsed = {};
          }
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on("error", reject);
    req.write(requestBody);
    req.end();
  });

const startServer = (server) =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address && typeof address === "object" ? address.port : 0);
    });
  });

const stopServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

module.exports = {
  createSilentLogger,
  requestJson,
  startServer,
  stopServer,
};
