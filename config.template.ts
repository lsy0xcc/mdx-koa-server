import path from "node:path";
interface DictionaryData {
  name: string;
  mdxPath: string;
  mddPath?: string;
  mddReplace?: (input: string) => string;
  cssPath?: string;
  cssName?: string;
  resultReplace?: (input: string) => string;
}

export const dictConfig: DictionaryData = {
  name: "dictionary name",
  mdxPath: path.resolve(__dirname, "data/dictionary.db"),
  mddPath: path.resolve(__dirname, "data/dictionary-mdd.db"),
  cssPath: path.resolve(__dirname, "data/dictionary.css"),
  cssName: "your-css-name-in-paraphrase.css",
  mddReplace: (input) => {
    return "\\" + input.replaceAll("/", "\\");
  },
  resultReplace: (input) => {
    return input.replaceAll(/(sound:\/\/\.\/)|(entry:\/\/)/g, "./");
  },
};
