import Router from "@koa/router";
import Koa from "koa";
import { readFile } from "node:fs/promises";
import { AnkiResult, ApiResult, dictConfig } from "./config";
import { CustomError, CustomErrorType } from "./errors";
import bodyParser from "koa-bodyparser";
import {
  metaData,
  metaReadable,
  searchMdd,
  searchMdx,
  searchMdxApi,
  searchToAnki,
  searchToAnkiTable,
} from "./service";
const { cssPath, cssName, resultReplace, port, apiToAnki } = dictConfig;
const app = new Koa();
app.use(bodyParser());
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
router.get(["/search/(.*)", "/search-r/(.*)"], async (ctx) => {
  const recursive = ctx.path.startsWith("/search-r");
  const key = ctx.params[0];
  const result = await searchMdx(key, recursive);
  if (result.length === 0) {
    try {
      ctx.body = await searchMdd(key);
    } catch (e: unknown) {
      if (e instanceof CustomError) {
        switch (e.type) {
          case CustomErrorType.MddNotExist:
          case CustomErrorType.MddEntryNotExist:
            ctx.status = 404;
            break;
          default:
            throw e;
        }
      } else {
        throw e;
      }
    }
  } else {
    ctx.type = "text/html";
    ctx.body = result
      .map((e) =>
        e.paraphrase && resultReplace
          ? resultReplace?.(e.paraphrase)
          : e.paraphrase
      )
      .join("");
  }
});

router.get("/search-api/:key", async (ctx) => {
  const result = await searchMdxApi(ctx.params.key);
  if (result.length === 0) {
    ctx.state = 404;
  } else {
    ctx.body = result;
  }
});

router.get("/search-anki/:key", async (ctx) => {
  const result: AnkiResult[] = await searchToAnki(ctx.params.key);
  if (result.length === 0) {
    ctx.state = 404;
  } else {
    ctx.body = result;
  }
});
router.get("/search-anki-table/:key", async (ctx) => {
  const result = await searchToAnkiTable(ctx.params.key);
  if (result.length === 0) {
    ctx.state = 404;
  } else {
    ctx.body = result.join("\n");
  }
});

router.post("/convert-data", async (ctx) => {
  try {
    if (ctx.request.body && apiToAnki) {
      const apiResult = ctx.request.body as ApiResult;
      const { wordsWithSymbol, defs } = apiResult;
      const words = wordsWithSymbol?.map((e) =>
        e.replaceAll("△", "").replaceAll("×", "")
      );
      const wordWithSymbol = wordsWithSymbol?.join("・");
      const word = words?.join("・");
      const extendedApiResult = {
        ...apiResult,
        words,
        word,
        wordWithSymbol,
        defs: defs?.map((def) => ({
          ...def,
          def: def?.def?.map((defItem, index) => ({
            ...defItem,
            index: (index + 1).toString(),
          })),
          typeList: def?.type?.split("・"),
        })),
      };
      const result = apiToAnki(extendedApiResult);
      ctx.body = result;
    } else {
      ctx.state = 500;
    }
  } catch (e) {
    console.error(e);
    ctx.state = 500;
  }
});

app.use(router.routes()).use(router.allowedMethods());
app.listen(port);
