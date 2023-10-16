export enum CustomErrorType {
  MddNotExist = "Mdd file is not exist!",
  MddEntryNotExist = "No entry in mdd file",
  WordNotExist = "No such word",
}
export class CustomError extends Error {
  type;
  constructor(type: CustomErrorType, msg?: string) {
    super(msg);
    this.type = type;
  }
}
