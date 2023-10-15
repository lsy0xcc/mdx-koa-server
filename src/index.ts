import Router from "@koa/router";
import Koa from "koa";
import { readFile } from "node:fs/promises";
import { search } from "./service";
import path from "node:path";
const app = new Koa();
const router = new Router();
router
  .get("/", async (ctx) => {
    ctx.body = "server is running";
  })
  .get(["/search/rhsjcd.css", "/search-r/rhsjcd.css"], async (ctx) => {
    try {
      const cssPath = path.resolve(__dirname, "../dict/rhsjcd.css");
      const css = await readFile(cssPath, "utf8");
      ctx.type = "text/css";
      ctx.body = css;
    } catch (err) {
      ctx.status = 404;
      ctx.body = "CSS file not found";
    }
  })
  .get("/search/:key", async (ctx) => {
    const key = ctx.params?.key;
    const result = await search(key);
    ctx.body = result.map((e) => e.paraphrase).join("");
  })
  .get("/search-r/:key", async (ctx) => {
    const key = ctx.params?.key;
    const result = await search(key, true);
    ctx.body = result.map((e) => e.paraphrase).join("");
  });

app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
