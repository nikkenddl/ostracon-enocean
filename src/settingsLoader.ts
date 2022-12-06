import fs from "fs";

/* Settings */
type SettingsType = {
  deviceId: string;
  deviceType: string;
  endpointUrl: string;
  localLogDirectory: string;
  localLogRetentionPeriodDay: number;
  originatorIds: string[];
  sendChunkSize: number;
  sendIntervalMs: number;
  sendRetryLimitMs: number;
  serialPortPath: string;
  timezone: string;
  version: string;
};

const isOriginatorIds = (originatorIds: unknown): originatorIds is string[] => {
  return (
    Array.isArray(originatorIds) &&
    (originatorIds as string[])
      .map((e) => typeof e === "string")
      .reduce((a, b) => a && b, true)
  );
};

const isValidTimeZone = (tz: unknown): boolean => {
  try {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
      return false;
    }

    if (typeof tz !== "string") {
      return false;
    }

    // throws an error if timezone is not valid
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (error) {
    return false;
  }
};

const isSettings = (settings: unknown): settings is SettingsType => {
  if (typeof settings !== "object") {
    // console.log('Not an object');
    return false;
  }
  const typeofs = [
    typeof (settings as SettingsType).deviceId === "string",
    typeof (settings as SettingsType).deviceType === "string",
    typeof (settings as SettingsType).endpointUrl === "string",
    isOriginatorIds((settings as SettingsType).originatorIds),
    typeof (settings as SettingsType).localLogDirectory === "string",
    typeof (settings as SettingsType).localLogRetentionPeriodDay === "number",
    typeof (settings as SettingsType).sendChunkSize === "number",
    typeof (settings as SettingsType).sendIntervalMs === "number",
    typeof (settings as SettingsType).sendRetryLimitMs === "number",
    typeof (settings as SettingsType).serialPortPath === "string",
    typeof (settings as SettingsType).timezone === "string",
    typeof (settings as SettingsType).version === "string",
  ];
  // console.log(typeofs)
  return typeofs.reduce((a, b) => a && b);
};

export const loadSettings = (path: string) => {
  console.log(`Loading settings from ${path}`);
  // load file
  const settings = JSON.parse(
    fs.readFileSync(path, "utf8")
  ) as SettingsType;
  if (!isSettings(settings)) {
    throw new Error("Settings Type Error");
  }
  if (!isValidTimeZone(settings.timezone)) {
    throw new Error("Invalid Timezone");
  }
  return settings;
};
