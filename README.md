# Node.js enocean ostracon gateway

## Usage

### Installing dependencies

```
npm install
```

### Compile and run

```
tsc
node ./build/index.js --settings ./settings.json
```

Command line options are as follows:

- `--settings` : Setting file location
- `--port` : Overwrite serial port path
- `--url` : Overwrite endpoint URL

## Setting file

```json
{
  "deviceId": "scl-raspi-1",
  "deviceType": "scl-raspi-enocean",
  "endpointUrl": "",
  "localLogDirectory": "./enocean-log",
  "localLogRetentionPeriodDay": 360,
  "originatorIds": [
    "002e5c72",
    "002e5c66"
  ],
  "sendChunkSize": 50,
  "sendIntervalMs": 30000,
  "sendRetryLimitMs": 3600000,
  "serialPortPath": "/dev/ttyUSB_EnOcean",
  "timezone": "Asia/Tokyo",
  "version": "2022-12-01"
}
```

- `deviceId`: The Identifier of this device for cloud log.
- `deviceType`: Type of device for cloud log.
- `endpointUrl`: Cloud logger URL to post data every `sendIntervalMs` milliseconds. If empty, the program won't send data.
- `localLogDirectory`: Directory to write logs. Filename will be `yyyy-MM-dd.csv`.
- `localLogRetentionPeriodDay`: Log older than this period will be deleted.
- `originatorIds`: Only data with these originator IDs will be logged. This parameter is needed to avoid logging unrelated enocean packets.
- `sendChunkSize`: Data will be split before sending if number of data is larger than `sendChunkSize`.
- `sendRetryLimitMs`: Data that could not be sent will be discarded after this period.
- `serialPortPath`: Serial port path.
- `timezone`: Timezone used for cloud/local log.
- `version`: Version of device for cloud log.

## Logging format

Currently log format is hardcoded.

### Local log example

```csv
timestamp,timestampIsoFormat,originatorId,buttonPressed,count
1670298164265,2022-12-06T12:42:44.265+0900,002e5c72,A0,0
1670298165528,2022-12-06T12:42:45.528+0900,002e5c72,A0,1
1670298174742,2022-12-06T12:42:54.742+0900,002e5c72,A0,2
1670298174742,2022-12-06T12:42:54.742+0900,002e5c72,B0,3
1670298181348,2022-12-06T12:43:01.348+0900,002e5c72,A0,4
1670298182020,2022-12-06T12:43:02.020+0900,002e5c72,B0,5
```

- `timestamp`: UNIX timestamp (ms). (example: `1669820400000`)
- `timestampIsoFormat`: Timestamp in ISO format. added for human readability. (example: `2022-12-01T00:00:00.000+0900`)
- `originatorId`: EnOcean originator ID. (example: `"002E5C72"`)
- `buttonPressed`: Button that is pressed. (example: `B0`)
- `count`: Count of every button press. Can be used for data integrity check: if some numbers are missing or count rolled back, data is possibly missing. (example: `42`)

### Cloud log

```ts
{
    "timestamp": number;
    "deviceId": string;
    "deviceType": string;
    "version": string;
    "payload": object;
}
```

- `timestamp`: UNIX timestamp (ms). (example: `1669820400000`)
- `deviceId`: To be set by `settings.json`
- `deviceType`: To be set by `settings.json`
- `version`: To be set by `settings.json`
- `payload`: See below.

#### Payload

If data is not empty, payload is as follows.

```ts
{
    "type": "buttonPush",
    "data": {
      "originatorId": data.originatorId, // Originator ID. (example: "002E5C72")
      "switchId": data.buttonPressed, // Pressed button. (example: "B0")
      "count": data.count, // Data count. (example: "42")
    },
}
```

If data is empty, heartbeat will be sent. This can be used to check if the device and its connection is alive.

```ts
{
    "type": "heartbeat"
}
```


## Development

### Run with re-run on change

```
npm run watch
```

### Compile

```
tsc
```
