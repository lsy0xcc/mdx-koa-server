import Handlebars from "handlebars";
import { readFileSync } from "node:fs";
import sqlite3 from "sqlite3";
import { AnkiResult, ApiResult, dictConfig } from "./config";
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
const {
  mdxPath,
  mddPath,
  mddReplace,
  name,
  redirectExtract,
  resultToApi,
  apiToAnki,
} = dictConfig;
const mdxDb = new Sqlite.Database(mdxPath);
const mddDb = mddPath ? new Sqlite.Database(mddPath) : null;

const tableTemplate = Handlebars.compile(
  readFileSync("./template/table.hbs").toString()
);

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
          const redirectEntry = redirectExtract?.(row.paraphrase); // if the record is a link
          if (redirectEntry) {
            if (recursive) {
              // search again
              return searchMdx(redirectEntry, recursive);
            } else {
              // return an element
              return [
                {
                  entry: row.entry,
                  paraphrase: `<a href="./${redirectEntry}">${redirectEntry}</a><br/>`,
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

export const searchMdxApi = async (value: string) => {
  const mdxData: MdxRecord[] = await searchMdx(value, true);
  return mdxData.map((e) => resultToApi?.(e.paraphrase) ?? {});
};

export const searchToAnki = async (value: string) => {
  const mdxList: ApiResult[] = await searchMdxApi(value);
  return mdxList.map((e) => apiToAnki?.(e) ?? {}).flat();
};

export const searchToAnkiTable = async (value: string) => {
  const ankiDataList: AnkiResult[] = await searchToAnki(value);
  return ankiDataList
    .map((e) => ({
      data: Object.entries(e ?? {}).map((e) => ({
        key: e[0],
        value: e[1],
      })),
    }))
    .map((e) => tableTemplate(e));
};

export const searchMdd = async (value: string) => {
  return new Promise((resolve, reject) => {
    if (mddDb) {
      const queryKey = mddReplace ? mddReplace(value) : value;
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
      resolve(tableTemplate({ name, data: rows }));
    });
  });
};
