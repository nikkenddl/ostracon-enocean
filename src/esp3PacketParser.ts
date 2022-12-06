import { Transform, TransformCallback, TransformOptions } from "stream";
import { crc8 } from "crc";

// https://www.enocean.com/wp-content/uploads/Knowledge-Base/EnOceanSerialProtocol3.pdf

export class ESP3SerialPacketParser extends Transform {
  buffer: Buffer;

  constructor() {
    super();
    this.buffer = Buffer.alloc(0);
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    let hadPacket = true;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (hadPacket) {
      hadPacket = this.parsePacket();
    }
    callback();
  }

  _flush(callback: TransformCallback): void {
    // this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    callback();
  }

  parsePacket(): boolean {
    const currentBuffer = this.buffer;

    /* truncate unneccesary data */
    const startIndexCandidates = [...currentBuffer].flatMap((e, i) =>
      e == 0x55 ? i : []
    );
    if (startIndexCandidates.length === 0) {
      // Sync byte candidate not found
      this.buffer = Buffer.alloc(0);
      return false;
    }

    /* CRC Check */
    let isHeaderFound = false;
    for (let i = 0; i < startIndexCandidates.length; i++) {
      const startIndexCandidate = startIndexCandidates[i];
      let tmpBuf = currentBuffer.subarray(startIndexCandidate);
      if (tmpBuf.length < 6) {
        // Buffer too short. Wait for next chunk
        this.buffer = tmpBuf;
        return false;
      }
      const header = tmpBuf.subarray(1, 5);
      const headerCrc8Byte = tmpBuf.readUint8(5);
      const computedHeaderCrc8 = crc8(header);
      if (headerCrc8Byte === computedHeaderCrc8) {
        // header found
        this.buffer = tmpBuf;
        isHeaderFound = true;
        break;
      }
    }
    if (!isHeaderFound) {
      this.buffer = Buffer.alloc(0);
      return false;
    }

    /* Check data length */
    const dataLength = this.buffer.readUInt16BE(1);
    const optionalLength = this.buffer.readUint8(3);
    const packetLength = 7 + dataLength + optionalLength;
    if (this.buffer.length < packetLength) {
      // Buffer too short. Wait for next chunk
      return false;
    }

    /* Push data */
    const data = this.buffer.subarray(6, 6 + dataLength);
    const optionalData = this.buffer.subarray(
      6 + dataLength,
      6 + dataLength + optionalLength
    );
    const dataCrc8Byte = this.buffer.readUint8(6 + dataLength + optionalLength);
    const computedDataCrc8Byte = crc8(Buffer.concat([data, optionalData]));
    if (dataCrc8Byte !== computedDataCrc8Byte) {
      console.log("CRC error. Discarding data");
    } else {
      this.push(this.buffer.subarray(0, packetLength));
    }
    this.buffer = this.buffer.subarray(packetLength);
    return true;
  }
}
