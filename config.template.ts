import path from "node:path";
interface DictionaryData {
  name: string;
  mdxPath: string;
  mddPath?: string;
  cssPath?: string;
  cssName?: string;
}
export const dictConfig: DictionaryData = {
  name: "dictionary name",
  mdxPath: path.resolve(__dirname, "data/dictionary.db"),
  cssPath: path.resolve(__dirname, "data/dictionary.css"),
  cssName: "your-css-name-in-paraphrase.css",
};
