import axios from "axios";
import { EnOceanDataPointType, OstraconCloudDataPointType } from "types";

const convertToOstraconCloudData = (
  data: EnOceanDataPointType,
  deviceId: string,
  deviceType: string,
  version: string
): OstraconCloudDataPointType => {
  const boilerplate = {
    deviceType,
    version,
  };
  const payload = {
    type: "buttonPush",
    data: {
      originatorId: data.originatorId,
      switchId: data.buttonPressed,
      count: data.count,
    },
  };
  const newData = {
    ...boilerplate,
    timestamp: data.timestamp,
    deviceId,
    payload,
  };
  return newData;
};

const generateHeartBeatData = (
  deviceId: string,
  deviceType: string,
  version: string
): OstraconCloudDataPointType => {
  return {
    timestamp: Date.now(),
    deviceId,
    deviceType,
    version,
    payload: {
      type: "heartbeat",
    },
  };
};

export class OstraconCloudLogger {
  url: string;
  unsentData: OstraconCloudDataPointType[];
  deviceId: string;
  deviceType: string;
  sendRetryLimitMs: number;
  version: string;

  constructor(
    url: string,
    deviceId: string,
    deviceType: string,
    sendRetryLimitMs: number,
    version: string
  ) {
    this.url = url;
    this.unsentData = [];
    this.deviceId = deviceId;
    this.deviceType = deviceType;
    this.sendRetryLimitMs = sendRetryLimitMs;
    this.version = version;
  }

  sendLog = async (
    newData: EnOceanDataPointType[],
    sendChunkSize: number = 50,
    shouldSendHeartbeatIfEmpty = true
  ) => {

    if (this.url.length === 0) {
      console.log("URL empty. Skipping");
      return;
    }

    const newOstraconData = newData.map((data) =>
      convertToOstraconCloudData(
        data,
        this.deviceType,
        this.deviceId,
        this.version
      )
    );
    const now = Date.now();
    this.unsentData = [...this.unsentData, ...newOstraconData].filter(
      (e) => now - e.timestamp < this.sendRetryLimitMs
    ); // filter out old data

    if (this.unsentData.length) {
      console.log(`Sending ${this.unsentData.length} data`)
      this.unsentData = await this._sendLog(this.unsentData, sendChunkSize);
    } else if (shouldSendHeartbeatIfEmpty) {
      console.log("Data empty. Sending heartbeat");
      const heartbeatData = [
        generateHeartBeatData(this.deviceId, this.deviceType, this.version),
      ];
      await this._sendLog(heartbeatData, sendChunkSize);
    }
  };

  _sendLog = async (
    data: OstraconCloudDataPointType[],
    sendChunkSize: number = 50
  ) => {
    let preparedData = [...data];
    let unsentData: OstraconCloudDataPointType[] = [];
    while (preparedData.length) {
      const chunk = preparedData.slice(0, sendChunkSize);
      preparedData = preparedData.slice(sendChunkSize);
      await axios
        .post(this.url, chunk)
        .then((response) => {
          console.log("API Response: " + response?.status);
        })
        .catch((reason) => {
          console.error(reason);
          unsentData = [...unsentData, ...chunk];
        });
    }
    return unsentData;
  };
}
