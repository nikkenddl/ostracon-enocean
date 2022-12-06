import { ESP3SerialPacketParser } from "../esp3PacketParser";
import stream from "stream";

describe("Serial Packet parsing", () => {
  const packet = Buffer.from([
    0x55, 0x00, 0x07, 0x02, 0x0a, 0x0a, 0x20, 0x00, 0x2e, 0x5c, 0x72, 0x84,
    0xf2, 0x01, 0x32, 0x8b,
  ]);

  test("Single packet parsing", (done) => {
    const s = new stream.PassThrough();
    const parser = new ESP3SerialPacketParser();
    const mockCallback = jest.fn((x) => {});

    s.pipe(parser);
    parser.on("data", (chunk) => {
      mockCallback(chunk);
    });

    s.write(packet);
    expect(mockCallback.mock.calls[0][0]).toStrictEqual(packet);
    done();
  });

  test("Split receive", (done) => {
    const s = new stream.PassThrough();
    const parser = new ESP3SerialPacketParser();
    const mockCallback = jest.fn((x) => {});

    s.pipe(parser);
    parser.on("data", (chunk) => {
      mockCallback(chunk);
    });

    const buf1 = packet.subarray(0, 4);
    const buf2 = packet.subarray(4);

    s.write(buf1);
    s.write(buf2);
    expect(mockCallback.mock.calls[0][0]).toStrictEqual(packet);
    done();
  });

  test("Multiple packet parsing", (done) => {
    const s = new stream.PassThrough();
    const parser = new ESP3SerialPacketParser();
    const mockCallback = jest.fn((x) => {});

    s.pipe(parser);
    parser.on("data", (chunk) => {
      mockCallback(chunk);
    });

    s.write(packet);
    s.write(packet);
    expect(mockCallback.mock.calls[0][0]).toStrictEqual(packet);
    expect(mockCallback.mock.calls[1][0]).toStrictEqual(packet);
    done();
  });

  test("Eliminating fake header sync byte", (done) => {
    const s = new stream.PassThrough();
    const parser = new ESP3SerialPacketParser();
    const mockCallback = jest.fn((x) => {});

    s.pipe(parser);
    parser.on("data", (chunk) => {
      mockCallback(chunk);
    });

    const buf1 = Buffer.from([
      0x55, // fake header byte
      ...packet,
    ]);

    s.write(buf1);
    expect(mockCallback.mock.calls[0][0]).toStrictEqual(packet);
    done();
  });
});
