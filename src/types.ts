export type OstraconCloudDataPointType = {
  timestamp: number;
  deviceId: string;
  deviceType: string;
  version: string;
  payload?: Object;
};

export type EnOceanDataPointType = {
  timestamp: number;
  originatorId: string;
  buttonPressed: string;
  count: number;
};
