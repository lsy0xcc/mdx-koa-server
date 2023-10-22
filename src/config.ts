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

export type ApiResult = {};
export type AnkiResult = {};

export const dictConfig: DictionaryData<ApiResult, AnkiResult> = {
  port: 3002,
  name: "NHK发音词典",
  mdxPath: path.resolve(__dirname, "../data/nhk.db"),
  mddPath: path.resolve(__dirname, "../data/nhk-mdd.db"),
  mddReplace: (input) => {
    return "\\" + input.replaceAll("/", "\\");
  },
  resultReplace: (input) => {
    return input.replaceAll(/(sound:\/\/\.\/)|(entry:\/\/)/g, "./");
  },
  redirectExtract: (input) => {
    console.log(input);
    return "";
  },
  cssPath: path.resolve(__dirname, "../data/NHK日本語発音アクセント辞書.css"),
  cssName: "NHK日本語発音アクセント辞書.css",
};
