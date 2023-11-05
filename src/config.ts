import parse from "node-html-parser";
import path from "node:path";

export interface DictionaryData<Api = string, Anki = string> {
  port: number;
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
export type ApiResult = Partial<{
  title: string;
  dataList: string[];
  resultList: AudioItem[][];
}>;
export type AnkiResult = ApiResult;
type KanaTune = {
  tuneNumber?: string;
  tuneType?: string;
  kana: string;
};
type AudioItem = {
  link: string;
  type?: string;
  word: string;
  html: string;
  kanaList?: KanaTune[];
};

const AUD_BUTTON_REG =
  /<a href="sound:\/\/(.*)" class="aud-btn"><span class="aud-btn-cont">((発音図)|(助詞付)|(例　文))<\/span><\/a>/g;
const RESULT_AUD_BUTTON_REG =
  /<a href="sound:\/\/(.*)" class="aud-btn"><span class="aud-btn-cont">((発音図)|(助詞付)|(例　文))<\/span><\/a>/;
const KANA_REG = /(<span class="tune-([012]) tune-([nqb])">(.)<\/span>)|(.)/g;
const BUTTON_MAP = {
  発音図: "pron",
  助詞付: "ptcl",
  "例　文": "eg",
};

export const dictConfig: DictionaryData<ApiResult, any> = {
  port: 3002,
  name: "NHK发音词典",
  mdxPath: path.resolve(__dirname, "../data/nhk.db"),
  mddPath: path.resolve(__dirname, "../data/nhk-mdd.db"),
  mddReplace: (input) => {
    return "\\" + input.replaceAll("/", "\\");
  },
  redirectExtract: (input) => {
    return input.match(/^@@@LINK=(.*)/)?.[1] ?? "";
  },
  resultReplace: (input) => {
    return `<div class="tune-res">${input
      .replaceAll(
        `<link type="text/css" href="NHK日本語発音アクセント辞書.css" rel="stylesheet" />`,
        `<link type="text/css" href="nhk-accent.css" rel="stylesheet"/>`
      )
      .replaceAll(
        AUD_BUTTON_REG,
        `<a href=$1 class="aud-btn"><span class="aud-btn-cont">$2<\/span><\/a>`
      )}</div>`;
  },
  resultToApi: (input) => {
    const temp = input.replaceAll(
      /(<a href=".+?" class="aud-btn"><span class="aud-btn-cont">.+?)<span>(<\/a>)/gm,
      "$1</span>$2"
    );

    const root = parse(temp);
    const title = root.getElementsByTagName("LEMMA")[0].innerText;
    const resultList: AudioItem[][] = [];
    const dataList: string[] = [];
    root.querySelectorAll("p")?.forEach((p) => {
      const items = p.innerHTML.split(`<br>`);
      let pronWithEg: AudioItem[] = [];
      items.forEach((item) => {
        const linkResult = item.match(RESULT_AUD_BUTTON_REG);
        if (linkResult) {
          const kanaString = item.replace(RESULT_AUD_BUTTON_REG, "").trim();
          const kanaList: KanaTune[] = [];
          for (let kanaMatch of kanaString.matchAll(KANA_REG)) {
            kanaList.push({
              tuneNumber: kanaMatch[2],
              tuneType: kanaMatch[3],
              kana: kanaMatch[4] || kanaMatch[5],
            });
          }
          const result: AudioItem = {
            link: linkResult[1],
            type: BUTTON_MAP[linkResult[2] as keyof typeof BUTTON_MAP],
            // kanaList,
            word: kanaList.map((e) => e.kana).join(""),
            html: kanaList
              .map((e) =>
                e.tuneNumber && e.tuneType
                  ? `<span class="tune-${e.tuneNumber} tune-${e.tuneType}">${e.kana}</span>`
                  : e.kana
              )
              .join(""),
          };
          pronWithEg.push(result);
        } else {
          if (item) {
            dataList.push(item);
          } else {
            if (pronWithEg.length > 0) {
              resultList.push(pronWithEg);
              pronWithEg = [];
            }
          }
        }
      });
    });
    return {
      title,
      dataList,
      resultList,
    };
  },
  apiToAnki: (input) => {
    const result = input?.resultList
      ?.map((audioItemList) =>
        audioItemList.map((audioItem) => ({
          ...audioItem,
          title: input.title,
          dataList: input.dataList?.join(""),
        }))
      )
      .flat();
    return result;
  },
  cssPath: path.resolve(__dirname, "../data/nhk.css"),
  cssName: "nhk-accent.css",
};
