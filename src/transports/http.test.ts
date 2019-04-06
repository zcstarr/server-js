import examples from "@open-rpc/examples";
import { parse } from "@open-rpc/schema-utils-js";
import { Router } from "../router";
import { HTTPServerTransport } from "./http";
import fetch from "node-fetch";
import cors from "cors";
import { json as jsonParser } from "body-parser";
import { HandleFunction } from "connect";

describe("http transport", () => {
  it("can start an http server that works", async () => {
    const simpleMathExample = await parse(JSON.stringify(examples.simpleMath));
    const corsOptions = { origin: "*" } as cors.CorsOptions;
    const httpTransport = new HTTPServerTransport({
      middleware: [
        cors(corsOptions) as HandleFunction,
        jsonParser(),
      ],
      port: 9696,
    });

    const router = new Router(simpleMathExample, { mockMode: true });

    httpTransport.addRouter(router);

    httpTransport.start();

    const { result } = await fetch("http://localhost:9696", {
      body: JSON.stringify({
        id: "0",
        jsonrpc: "2.0",
        method: "addition",
        params: [2, 2],
      }),
      headers: { "Content-Type": "application/json" },
      method: "post",
    }).then((res) => res.json());

    expect(result).toBe(4);
  });
});
