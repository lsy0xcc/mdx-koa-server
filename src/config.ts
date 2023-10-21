import Handlebars from "handlebars";
import parse from "node-html-parser";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface DictionaryData<Api = string, Anki = string> {
  name: string;
  mdxPath: string;
  mddPath?: string;
  mddReplace?: (input: string) => string;
  cssPath?: string;
  cssName?: string;
  redirectExtract?: (input: string) => string;
  resultReplace?: (input: string) => string; // replace the link in mdx. e.g. sound:// or entry://
  resultToApi?: (input: string) => Api; // convert mdx result to api format
  apiToAnki?: (input: Api) => Anki; // convert api result to Anki type
}

export type Exam = Partial<{
  jp: string;
  zh: string;
}>;

export type DefItem = Partial<{
  index: string;
  jp: string;
  zh: string;
  exam: Exam[];
  anti: string[];
  syns: string[];
}>;

export type Def = Partial<{
  type: string;
  typeList: string[];
  def: DefItem[];
  note: string;
}>;

export type ApiResult = Partial<{
  priority: number;
  spell: string;
  kana: string;
  tune: string;
  word: string;
  words: string[];
  wordWithSymbol: string;
  wordsWithSymbol: string[];
  origin: string;
  defs: Def[];
}>;

export type AnkiResult = Partial<{
  uuid: string;
  date: string;
  priority: string;
  word: string;
  wordWithSymbol: string;
  kana: string;
  spell: string;
  tune: string;
  origin: string;
  type: string;
  description: string;
  descriptionZh: string;
  descriptionJp: string;
  examJp: string;
  examZh: string;
  examFull: string;
}>;

const examDefTemplate = Handlebars.compile(
  readFileSync("./template/exam-def.hbs").toString()
);
const descriptionTemplate = Handlebars.compile(
  readFileSync("./template/description.hbs").toString()
);

export const dictConfig: DictionaryData<ApiResult, AnkiResult> = {
  name: "日汉双解词典",
  mdxPath: path.resolve(__dirname, "../data/rhsjcd.db"),
  cssPath: path.resolve(__dirname, "../data/rhsjcd.css"),
  cssName: "rhsjcd.css",
  redirectExtract: (input) => {
    const matchResult = input.match(/^@@@LINK=(.*)/);
    return matchResult ? matchResult[1] : "";
  },
  resultToApi: (input) => {
    const root = parse(input);

    const wordsWithSymbol: any[] = [];
    const origins: any[] = [];
    // basic info
    const head = root.querySelector(".head")?.innerText;
    const headMatchResult = head?.match(/(\**)〚(.+)〛/);
    const priority = headMatchResult?.[1].length;
    const spell = headMatchResult?.[2];
    const kana = spell?.replaceAll("・", "");

    const wordOriginList = root
      .querySelectorAll("kan")
      .map((e) => e.innerHTML)
      .join("")
      ?.match(/(〔.*〕)*/)?.[0]
      ?.split("〔")
      .map((e) => e.split("〕"))
      .flat()
      .map((e) => e.split("・"))
      .flat()
      .filter((e) => e)
      .map((e) => e.trim());

    // from entry
    // const entryMatchResult = e.entry.match(/([ァ-ヺー-ヿぁ-ゖ゙-ゟ]+)【(.+)】/);
    // const wordOriginList = entryMatchResult?.[2]?.split("・")
    // const kana = entryMatchResult?.[1];
    // console.log(wordOriginList);

    wordOriginList?.forEach((e) => {
      if (e.match(/[^\u0000-\u036f]*[\u0000-\u00d6\u00d8-\u036f]+/)) {
        origins.push(e);
      } else {
        wordsWithSymbol.push(e);
      }
    });
    if (wordsWithSymbol.length === 0) {
      wordsWithSymbol.push(kana);
    }
    const words = wordsWithSymbol.map((e) =>
      e.replaceAll("△", "").replaceAll("×", "")
    );
    const wordWithSymbol = wordsWithSymbol.join("・");
    const word = words.join("・");
    const origin = origins.length ? origins.join("・") : undefined;
    const tune = root?.innerText.match(/[⓪①-⑳]+/g)?.[0];

    const defList: Def[] = [{}];
    // meaning and example
    root.querySelectorAll(".rhsjcd-entry > *").forEach((e) => {
      let currentDef = defList.at(-1);
      if (!currentDef) {
        return;
      }
      switch (e.classNames) {
        case "defn":
          defList.push({});
          currentDef = defList.at(-1);
        case "tags":
        case "note":
          if (!currentDef) {
            break;
          }
          switch (e.classNames) {
            case "defn":
            case "tags":
              const type = e
                .querySelector("type")
                ?.innerText.replaceAll(/〈|〉/g, "");
              const typeList = type?.split("・");
              currentDef.type = type;
              currentDef.typeList = typeList;
              break;
            case "note":
              currentDef.note = e.querySelector("x")?.innerText;
              break;
          }
          break;
        case "def2":
          if (!currentDef.def) {
            currentDef.def = [];
          }
          const defItem: any = {};
          defItem.index = e
            .querySelector("num")
            ?.innerText.replaceAll(/\(|\)/g, "");
          defItem.jp = e.querySelector("dfjp")?.innerText;
          defItem.zh = e.querySelector("dfzh")?.innerText;
          currentDef.def.push(defItem);
          break;
        case "exam":
        case "anti":
        case "syns":
          if (!currentDef?.def) {
            break;
          }
          if (!currentDef.def.at(-1)) {
            currentDef.def.push({});
          }
          const currentDefItem = currentDef.def.at(-1);
          if (!currentDefItem) {
            break;
          }
          switch (e.classNames) {
            case "exam":
              if (!currentDefItem.exam) {
                currentDefItem.exam = [];
              }
              const currentExample: any = {};
              currentExample.jp = e.querySelector("exjp")?.innerText + "。";
              currentExample.zh = e.querySelector("exzh")?.innerText;
              currentDefItem.exam.push(currentExample);
              break;
            case "anti":
            case "syns":
              currentDefItem[e.classNames] = e
                .querySelector("x")
                ?.innerText.split("。")
                .filter((e) => e);
              break;
          }
          break;
      }
    });
    if (
      !Object.values(defList[0]).reduce((prev, curr) => prev || !!curr, false)
    ) {
      defList.shift();
    }
    return {
      priority,
      spell,
      kana,
      tune,
      word,
      words,
      wordWithSymbol,
      wordsWithSymbol,
      origin,
      defs: defList,
    };
  },
  apiToAnki: (input: ApiResult) => {
    const { priority, spell, kana, tune, word, wordWithSymbol, origin, defs } =
      input;
    const typeList = defs?.map((e) => e.type);
    const fullDescriptionList = defs?.map((e) => ({
      ...e,
      def: e?.def?.map((e) => ({
        ...e,
        exam: examDefTemplate({
          data: e.exam,
          showZh: true,
          showJp: true,
          type: "exam",
        }),
      })),
    }));
    const descriptionList = defs?.map((e) =>
      e.def?.map((e) => ({ zh: e.zh, jp: e.jp }))
    );
    const examList = defs
      ?.map((e) => e.def?.map((e) => e.exam))
      .flat()
      .flat();
    const result: AnkiResult = {
      uuid: randomUUID(),
      date: new Date().toISOString(),
      priority: priority?.toString(),
      word,
      wordWithSymbol,
      kana,
      spell,
      tune,
      origin,
      type: typeList?.join("・"),
      description: fullDescriptionList
        ?.map((e) => descriptionTemplate(e))
        .join("\n"),
      descriptionJp: descriptionList
        ?.map((e) => examDefTemplate({ data: e, type: "desc", showJp: true }))
        .join("\n"),
      descriptionZh: descriptionList
        ?.map((e) => examDefTemplate({ data: e, type: "desc", showZh: true }))
        .join("\n"),
      examJp: examDefTemplate({
        data: examList,
        showJp: true,
        type: "exam",
      }),
      examZh: examDefTemplate({
        data: examList,
        showZh: true,
        type: "exam",
      }),
      examFull: examDefTemplate({
        data: examList,
        showZh: true,
        showJp: true,
        type: "exam",
      }),
    };
    return result;
  },
};
