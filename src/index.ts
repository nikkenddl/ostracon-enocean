import { parseEsp3Data } from "./esp3DataParser";
import { SerialPort } from "serialport";
import { ESP3SerialPacketParser } from "./esp3PacketParser";
import { ArgumentParser } from "argparse";
import { EnOceanDataPointType } from "./types";
import { LocalFileLogger } from "./logger/localFileLogger";
import { OstraconCloudLogger } from "./logger/ostraconCloudLogger";
import { loadSettings } from "./settingsLoader";

/* Data handling */
let unsentEnOceanData: EnOceanDataPointType[] = [];
let count = 0;
const recordData = (
  timestamp: number,
  originatorId: string,
  switchId: "A0" | "A1" | "B0" | "B1"
) => {
  unsentEnOceanData.push({
    timestamp,
    originatorId,
    buttonPressed: switchId,
    count: count,
  });
  count++;
};

const parseF60204Data = (data: number) => {
  const isPressed = data >> 7;
  const isA0Pressed = (data >> 3) & 0b1;
  const isA1Pressed = (data >> 2) & 0b1;
  const isB0Pressed = (data >> 1) & 0b1;
  const isB1Pressed = (data >> 0) & 0b1;
  return {
    isPressed,
    isA0Pressed,
    isA1Pressed,
    isB0Pressed,
    isB1Pressed,
  };
};

const handleEnOceanPacket = (packet: Buffer | undefined) => {
  if (!packet) {
    return;
  }
  const data = parseEsp3Data(packet);
  if (!data?.data) {
    return;
  }
  if (!(data.data.telegramTypeValue === 0b000)) {
    console.log("Not Repeated Switch telegram.");
    return;
  }

  const originatorIdString = data.data.originatorId.toString("hex");
  const DataDl = data.data.DataDl.readUint8(0); // 1 byte
  const parsedSwitchData = parseF60204Data(DataDl);
  const timestamp = Date.now();

  console.log(
    `Received 0x${DataDl.toString(16).padStart(
      2,
      "0"
    )} from ${originatorIdString}`
  );
  if (!settings.originatorIds.find((e) => e === originatorIdString)) {
    console.log(`${originatorIdString} is not in originator ID list`);
    return;
  }
  if (!parsedSwitchData.isPressed) {
    return;
  }
  if (parsedSwitchData.isA0Pressed) {
    console.log("A0 pressed");
    recordData(timestamp, originatorIdString, "A0");
  }
  if (parsedSwitchData.isA1Pressed) {
    console.log("A1 pressed");
    recordData(timestamp, originatorIdString, "A1");
  }
  if (parsedSwitchData.isB0Pressed) {
    console.log("B0 pressed");
    recordData(timestamp, originatorIdString, "B0");
  }
  if (parsedSwitchData.isB1Pressed) {
    console.log("B1 pressed");
    recordData(timestamp, originatorIdString, "B1");
  }
};

/* Read settings file */
const argParser = new ArgumentParser();
argParser.add_argument("--settings", {
  type: "str",
  required: true,
});
argParser.add_argument("--port", {
  type: "str",
  required: false,
});
argParser.add_argument("--url", {
  type: "str",
  required: false,
});
const args = argParser.parse_args();
const settings = loadSettings(args.settings);
console.log(`Settings Loaded`);
if (args.port) {
  console.log(`Using serial port ${args.port} instead`);
  settings.serialPortPath = args.port;
}
if (args.url) {
  console.log(`Using endpoint URL ${args.url} instead`);
  settings.endpointUrl = args.url;
}

/* Serial port and parser */
// port
const serialPortPath = settings.serialPortPath;
const baudRate = 57600;
const port = new SerialPort({ path: serialPortPath, baudRate });
port.on("close", () => {
  console.log("Close");
  reconnect();
});
const reconnect = () => {
  console.log("reconnecting...");
  if (!port.isOpen) {
    setTimeout(() => port.open(reconnect), 1000);
  }
};
// Parser
const parser = new ESP3SerialPacketParser();
port.pipe(parser);
parser.on("data", (data) => {
  try {
    handleEnOceanPacket(data);
  } catch (error) {
    console.error(error);
  }
});

/* logger */
const localFileLogger = new LocalFileLogger(
  settings.localLogDirectory,
  settings.timezone,
  settings.localLogRetentionPeriodDay
);
const ostraconCloudLogger = new OstraconCloudLogger(
  settings.endpointUrl,
  settings.deviceId,
  settings.deviceType,
  settings.sendRetryLimitMs,
  settings.version
);

/* Interval send */
setInterval(async () => {
  const data = [...unsentEnOceanData];
  unsentEnOceanData = [];
  // Local log
  localFileLogger.removeOldLogs();
  localFileLogger.writeLog(data);
  // Cloud log
  ostraconCloudLogger.sendLog(data);
}, settings.sendIntervalMs);
