export interface Record {
  entry: string;
  paraphrase: string;
}

import path from "path";
import sqlite3 from "sqlite3";
const Sqlite = sqlite3.verbose();
const dbPath = path.resolve(__dirname, "../dict/rhsjcd.db");
const db = new Sqlite.Database(dbPath);

export const search = async (value: string, recursive?: boolean) => {
  return new Promise<Record[]>((resolve, reject) => {
    db.all("Select * From mdx Where entry = ?", value, async (err, rows) => {
      if (err) {
        console.error(err);
        reject(err.message);
      }
      const records = (rows as Record[]).map(async (row) => {
        const matchResult = row.paraphrase.match(/^@@@LINK=(.*)/);
        if (matchResult) {
          if (recursive) {
            return search(matchResult[1], recursive);
          } else {
            return [
              {
                entry: row.entry,
                paraphrase: `<a href="./${matchResult[1]}">${matchResult[1]}</a><br/>`,
              },
            ];
          }
        } else {
          return [row];
        }
      });
      const result = (await Promise.all(records)).flat();
      resolve(result);
    });
  });
};

export const meatData = async () => {};
