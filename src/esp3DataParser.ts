import { crc8 } from "crc";

// https://www.enocean.com/wp-content/uploads/Knowledge-Base/EnOceanRadioProtocol2.pdf

const PACKET_TYPE_RADIO_ERP2 = 0x0a;

type Erp2DataType = {
  telegramTypeValue?: number;
  extendedTelegramTypeValue?: number | undefined;
  repeaterCountValue?: number | undefined;
  originatorId: Buffer;
  destinationId?: Buffer | undefined;
  DataDl: Buffer;
  optionalData?: Buffer;
};

type Esp3PayloadDataType = Erp2DataType | undefined;

type Esp3ParsedDataType = {
  rawData: Buffer;
  data: Esp3PayloadDataType;
  subTelNum: number;
  dBm: number;
};

export const parseEsp3Data = (
  packet: Buffer
): Esp3ParsedDataType | undefined => {
  const header = packet.subarray(1, 5);
  const dataLength = packet.readUint16BE(1);
  const optionalLength = packet.readUint8(3);
  const data = packet.subarray(6, 6 + dataLength);
  const optionalData = packet.subarray(
    6 + dataLength,
    6 + dataLength + optionalLength
  );

  /* CRC Check */
  const headerCrc8Byte = packet.readUint8(5);
  const computedHeaderCrc8 = crc8(header);
  if (headerCrc8Byte !== computedHeaderCrc8) {
    console.log("Header CRC Error");
    return;
  }
  const dataCrc8Byte = packet.readUint8(6 + dataLength + optionalLength);
  const computedDataCrc8Byte = crc8(Buffer.concat([data, optionalData]));
  if (dataCrc8Byte !== computedDataCrc8Byte) {
    console.log("Data CRC Error");
    return;
  }

  /* Parse data */
  const packetType = packet.readUint8(4);
  if (packetType === PACKET_TYPE_RADIO_ERP2) {
    const rawData = data;
    // optional
    const subTelNum = optionalData.readUint8(0);
    const dBm = optionalData.readUint8(1);
    // const securityLevel = optionalData.readUint8(2); // Maybe error of EnOcean spec?
    return {
      rawData,
      data: parseErp2(rawData),
      subTelNum,
      dBm,
      // securityLevel,
    };
  } else {
    console.log(`Packet type ${packetType} not implemented`);
    return;
  }
};

const parseErp2 = (rawData: Buffer): Esp3PayloadDataType => {
  if (rawData.length > 6) {
    /* Header */
    const header = rawData.readUint8(0);
    const addressControlValue = header >> 5;
    const extendedHeaderAvailable = (header >> 4) & 0x01;
    const telegramTypeValue = header & 0x0f;
    const extendedTelegramTypeAvailable = telegramTypeValue === 0b1111;

    // Address control
    let originatorIdBits = 0;
    let destinationIdBits = 0;
    switch (addressControlValue) {
      case 0b000:
        originatorIdBits = 24;
        destinationIdBits = 0;
        break;
      case 0b001:
        originatorIdBits = 32;
        destinationIdBits = 0;
        break;
      case 0b010:
        originatorIdBits = 32;
        destinationIdBits = 32;
        break;
      case 0b011:
        originatorIdBits = 48;
        destinationIdBits = 0;
        break;
      default:
        console.log("Wrong address control value");
        return;
    }

    // Extended header
    let repeaterCountValue: undefined | number = undefined;
    let optionalDataLength = 0;
    if (extendedHeaderAvailable) {
      const extendedHeader = rawData.readUint8(1);
      repeaterCountValue = extendedHeader >> 4;
      optionalDataLength = extendedHeader & 0b1111;
    }

    // Telegram Type
    let extendedTelegramTypeValue = undefined;
    if (extendedTelegramTypeAvailable) {
      extendedTelegramTypeValue = rawData.readUint8(2);
    }

    const extendedHeaderBits = extendedHeaderAvailable ? 8 : 0;
    const extendedTelegramTypeBits = extendedTelegramTypeAvailable ? 8 : 0;
    const originatorIdOffsetBits =
      8 + extendedHeaderBits + extendedTelegramTypeBits;
    // FIXME if needed.
    // Currently data partition is aligned to bytes so we can just use division by 8.
    const originatorIdOffset = originatorIdOffsetBits / 8;
    const originatorId = rawData.subarray(
      originatorIdOffset,
      originatorIdOffset + originatorIdBits / 8
    );
    const destinationIdOffset = originatorIdOffset + originatorIdBits / 8;
    const destinationId = destinationIdBits
      ? rawData.subarray(
          destinationIdOffset,
          destinationIdOffset + destinationIdBits / 8
        )
      : undefined;

    // payload
    const dataOffset = destinationIdOffset + destinationIdBits / 8;
    const data = rawData.subarray(dataOffset, -1 - optionalDataLength);
    const optionalData = rawData.subarray(-1 - optionalDataLength, -1);

    // CRC
    const dataPlCrc8 = rawData.subarray(-1).readUint8(0);
    const computedCrc8 = crc8(rawData.subarray(0, -1));
    if (dataPlCrc8 !== computedCrc8) {
      console.log("CRC does not match");
      return;
    }

    return {
      telegramTypeValue,
      extendedTelegramTypeValue,
      repeaterCountValue,
      originatorId,
      destinationId,
      DataDl: data,
      optionalData: optionalData,
    };
  } else {
    // console.log("Data length < 6 not implemented");
    // return;
    const length = rawData.length;
    let originatorIdBits = 0;
    let dataDlBits = 0;
    switch (length) {
      case 1:
        originatorIdBits = 8;
        dataDlBits = 0;
        break;
      case 2:
        originatorIdBits = 8;
        dataDlBits = 8;
        break;
      case 3:
        originatorIdBits = 16;
        dataDlBits = 8;
        break;
      case 4:
        originatorIdBits = 24;
        dataDlBits = 8;
        break;
      case 5:
        originatorIdBits = 32;
        dataDlBits = 8;
        break;
      case 6:
        originatorIdBits = 32;
        dataDlBits = 16;
        break;
      default:
        console.log("length does not match");
        return;
    }
    const originatorId = rawData.subarray(0, originatorIdBits / 8);
    const data = rawData.subarray(originatorIdBits / 8);
    return {
      originatorId,
      DataDl: data,
    };
  }
};
