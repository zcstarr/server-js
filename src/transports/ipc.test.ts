import examples from "@open-rpc/examples";
import { parseOpenRPCDocument } from "@open-rpc/schema-utils-js";
import { Router } from "../router";
import * as fs from "fs";
import { promisify } from "util";
const readFile = promisify(fs.readFile);
import IPCTransport from "./ipc";
import ipc from "node-ipc";
import { IJSONRPCResponse } from "./server-transport";

describe("IPC transport", () => {
  let transport: IPCTransport;
  beforeAll(async () => {
    const simpleMathExample = await parseOpenRPCDocument(examples.simpleMath);

    transport = new IPCTransport({
      id: "simpleMath",
      ipv6: false,
      port: 9699,
      udp: false,
    });
    const router = new Router(simpleMathExample, { mockMode: true });
    transport.addRouter(router);
    transport.start();
    ipc.config.id = "simpleMath";
    ipc.config.retry = 1500;
    return new Promise((resolve, reject) => {
      ipc.connectToNet(
        "simpleMath",
        "127.0.0.1",
        9699,
        () => {
          ipc.of.simpleMath.on("connect", resolve);
        });
    });
  });

  afterAll(() => {
    ipc.disconnect("simpleMath");
    transport.stop();
  });

  it("can start an IPC server that works", (done) => {
    const handle = (data: any) => {
      ipc.of.simpleMath.off("message", handle);
      const { result } = JSON.parse(data);
      expect(result).toBe(4);
      done();
    };

    ipc.of.simpleMath.on("message", handle);

    ipc.of.simpleMath.emit(
      "message",
      JSON.stringify({
        id: "0",
        jsonrpc: "2.0",
        method: "addition",
        params: [2, 2],
      }),
    );
  });

  it("works with batching", (done) => {
    const handle = (data: any) => {
      ipc.of.simpleMath.off("message", handle);
      const result = JSON.parse(data) as IJSONRPCResponse[];
      expect(result.map((r) => r.result)).toEqual([4, 8]);
      done();
    };

    ipc.of.simpleMath.on("message", handle);

    ipc.of.simpleMath.emit(
      "message",
      JSON.stringify([
        {
          id: "1",
          jsonrpc: "2.0",
          method: "addition",
          params: [2, 2],
        }, {
          id: "2",
          jsonrpc: "2.0",
          method: "addition",
          params: [4, 4],
        },
      ]),
    );
  });
});
