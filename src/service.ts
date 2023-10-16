import sqlite3 from "sqlite3";
import { dictConfig } from "../config";
import { CustomError, CustomErrorType } from "./errors";

export interface MdxRecord {
  entry: string;
  paraphrase: string;
}
export interface MddRecord {
  entry: string;
  file: Buffer;
}
export interface MetaRecord {
  key: string;
  value: string;
}

const Sqlite = sqlite3.verbose();
const { mdxPath, mddPath, mddReplace, name } = dictConfig;
const mdxDb = new Sqlite.Database(mdxPath);
const mddDb = mddPath ? new Sqlite.Database(mddPath) : null;

export const searchMdx = async (value: string, recursive?: boolean) => {
  return new Promise<MdxRecord[]>((resolve, reject) => {
    mdxDb.all(
      "Select * From mdx Where entry = ? COLLATE NOCASE",
      value,
      async (err, rows) => {
        if (err) {
          console.error(err);
          reject(err.message);
        }
        const records = (rows as MdxRecord[]).map(async (row) => {
          const matchResult = row.paraphrase.match(/^@@@LINK=(.*)/); // if the record is a link
          if (matchResult) {
            if (recursive) {
              // search again
              return searchMdx(matchResult[1], recursive);
            } else {
              // return an element
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
      }
    );
  });
};

export const searchMdd = async (value: string) => {
  return new Promise((resolve, reject) => {
    if (mddDb) {
      const queryKey = mddReplace ? mddReplace(value) : value;
      console.log(value, queryKey);
      mddDb.get(
        "Select * From mdd Where entry = ? COLLATE NOCASE",
        queryKey,
        async (err, row: MddRecord) => {
          if (err) {
            console.error(err);
            reject(err.message);
          }
          if (row) {
            resolve(row.file);
          } else {
            reject(new CustomError(CustomErrorType.MddEntryNotExist));
          }
        }
      );
    } else {
      reject(new CustomError(CustomErrorType.MddNotExist));
    }
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
