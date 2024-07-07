import { Hono } from "hono/quick";
import type { Bindings, BlankSchema } from "hono/types";
import type { Client } from "pg";
import type { Variables } from "../app.types.js";
import { authenticate } from "./auth.middleware.js";
import { createClient } from "./db/pg.js";

type AppEnv = { Bindings: Bindings & Env, Variables: Variables }

const server = new Hono<AppEnv>();

const apiServer = new Hono<AppEnv, BlankSchema, "/api">();

apiServer.use(authenticate);

server.use(async (ctx, next) => {
  const [error, client] = await createClient(ctx.env as any);
  
  if (error) {
    console.error(error!)
    ctx.set("pg-client", null)
  } else {
    ctx.set("pg-client", client! as Client)
  }

  await next();
});


export { apiServer, server, type AppEnv };

