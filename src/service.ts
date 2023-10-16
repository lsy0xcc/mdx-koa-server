import sqlite3 from "sqlite3";
import { dictConfig } from "../config";
export interface MdxRecord {
  entry: string;
  paraphrase: string;
}
export interface MetaRecord {
  key: string;
  value: string;
}
const Sqlite = sqlite3.verbose();
const { mdxPath, name } = dictConfig;
const mdxDb = new Sqlite.Database(mdxPath);

export const search = async (value: string, recursive?: boolean) => {
  return new Promise<MdxRecord[]>((resolve, reject) => {
    mdxDb.all("Select * From mdx Where entry = ?", value, async (err, rows) => {
      if (err) {
        console.error(err);
        reject(err.message);
      }
      const records = (rows as MdxRecord[]).map(async (row) => {
        const matchResult = row.paraphrase.match(/^@@@LINK=(.*)/); // if the record is a link
        if (matchResult) {
          if (recursive) {
            // search again
            return search(matchResult[1], recursive);
          } else {
            // return a element
            return [
              {
                entry: row.entry,
                paraphrase: `<a href="./${matchResult[1]}">${matchResult[1]}</a><br/>`,
              },
            ];
          }
        } else {
          // return directly
          return [row];
        }
      });
      const result = (await Promise.all(records)).flat();
      resolve(result);
    });
  });
};

// get the function of meta data of mdx
export const metaData = async () => {
  return new Promise<MetaRecord[]>((resolve, reject) => {
    mdxDb.all("Select * From meta", async (err, rows) => {
      if (err) {
        console.error(err);
        reject(err.message);
      }
      resolve([{ key: "customName", value: name }, ...(rows as MetaRecord[])]);
    });
  });
};

// get the function of meta data of mdx
export const metaReadable = async () => {
  return new Promise<string>((resolve, reject) => {
    mdxDb.all("Select * From meta", async (err, rows) => {
      if (err) {
        console.error(err);
        reject(err.message);
      }
      resolve(
        `<div>
          <style>
          table, td { border: 1px solid #333; }
          thead, tfoot { background-color: #333; color: #fff; }
          </style>
          <h1>${name}</h1>
          <table>
            <thead>
              <tr><th>key</th><th>value</th></tr>
            </thead>
            <tbody> ${(rows as MetaRecord[])
              .map((e) => `<tr><td>${e.key}</td><td>${e.value}</td></tr>`)
              .join("\n")}
            </tbody>
          </table>
        </div> `
      );
    });
  });
};
