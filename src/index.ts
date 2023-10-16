import Router from "@koa/router";
import Koa from "koa";
import { readFile } from "node:fs/promises";
import { dictConfig } from "../config";
import { metaData, metaReadable, search } from "./service";
const { cssPath, cssName } = dictConfig;
const app = new Koa();
const router = new Router();
router.get("/", async (ctx) => {
  ctx.body = "server is running";
});
// the meta data of dictionary
router.get("/metaData", async (ctx) => {
  ctx.body = await metaData();
});
router.get("/meta", async (ctx) => {
  ctx.body = await metaReadable();
});
// to resolve css file
if (cssPath && cssName) {
  router.get([`/search/${cssName}`, `/search-r/${cssName}`], async (ctx) => {
    try {
      if (cssPath) {
        const css = await readFile(cssPath, "utf8");
        ctx.type = "text/css";
        ctx.body = css;
      } else {
        ctx.status = 404;
        ctx.body = "CSS file not found";
      }
    } catch (err) {
      ctx.status = 404;
      ctx.body = "CSS file not found";
    }
  });
}
// two different kind of search
router.get(["/search/:key", "/search-r/:key"], async (ctx) => {
  const recursive = ctx.path.startsWith("/search-r");
  const key = ctx.params?.key;
  const result = await search(key, recursive);
  ctx.body = result.map((e) => e.paraphrase).join("");
});
app.use(router.routes()).use(router.allowedMethods());
app.listen(3000);
