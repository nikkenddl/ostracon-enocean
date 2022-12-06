import fs from "fs";
import { format, zonedTimeToUtc } from "date-fns-tz";
import * as path from "path";
import { EnOceanDataPointType, OstraconCloudDataPointType } from "../types";

export class LocalFileLogger {
  localLogDirectory: string;
  timeZone: string;
  localLogRetentionPeriodDays: number;

  constructor(
    localLogDirectory: string,
    timeZone: string,
    localLogRetentionPeriodDays: number
  ) {
    this.localLogDirectory = localLogDirectory;
    this.timeZone = timeZone;
    this.localLogRetentionPeriodDays = localLogRetentionPeriodDays;
  }

  removeOldLogs = () => {
    const files = fs.readdirSync(this.localLogDirectory);
    const now = Date.now();

    const filesToBeDeleted = files.filter((e) => {
      // Avoid removing file other than csv, or have invalid date
      // e.g. Will not delete "2022-01-01_copy.csv"
      const basename = path.basename(e, ".csv");
      if (Number.isNaN(new Date(basename).getTime())) {
        return false;
      }
      // remove older files
      const nameDate = zonedTimeToUtc(basename, this.timeZone);
      const age = now - nameDate.getTime();
      if (age > this.localLogRetentionPeriodDays * 24 * 60 * 60_000) {
        return true;
      }
    });

    if (filesToBeDeleted.length) {
      filesToBeDeleted.forEach((file) => {
        fs.rmSync(path.join(this.localLogDirectory, file));
        console.log(`Deleted ${file}`);
      });
    }
  };

  writeLog = (data: EnOceanDataPointType[]) => {
    const directory = this.localLogDirectory;
    if (!fs.existsSync(this.localLogDirectory)) {
      console.log("Log directory does not exist. creating...");
      fs.mkdirSync(this.localLogDirectory, { recursive: true });
    }

    const logRowsByFilename: Record<string, string[]> = {};
    data.forEach((e) => {
      const logFileName =
        format(new Date(e.timestamp), "yyyy-MM-dd", {
          timeZone: this.timeZone,
        }) + ".csv";
      const csvRow = [
        e.timestamp,
        format(new Date(e.timestamp), "yyyy-MM-dd'T'HH:mm:ss.SSSXX", {
          timeZone: this.timeZone,
        }),
        e.originatorId,
        e.buttonPressed,
        e.count,
      ].join(",");
      if (logRowsByFilename[logFileName]) {
        logRowsByFilename[logFileName] = [
          ...logRowsByFilename[logFileName],
          csvRow,
        ];
      } else {
        logRowsByFilename[logFileName] = [csvRow];
      }
    });

    const filenames = Object.keys(logRowsByFilename);
    filenames.forEach((filename) => {
      const logFileName = path.join(directory, filename);
      console.log(`Writing to ${logFileName}`)
      // write header if not exist
      if (!fs.existsSync(logFileName)) {
        const header =
          "timestamp,timestampIsoFormat,originatorId,buttonPressed,count\n";
        fs.writeFileSync(logFileName, header, { flag: "a" });
      }
      // write rows
      const csvRows = logRowsByFilename[filename].map((e) => e + "\n").join("");
      fs.writeFileSync(logFileName, csvRows, { flag: "a" });
    });
  };
}
