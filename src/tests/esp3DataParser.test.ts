import { parseEsp3Data } from "../esp3DataParser";

describe("Packet data parsing", () => {
  const packet = Buffer.from([
    0x55, 0x00, 0x07, 0x02, 0x0a, 0x0a, 0x20, 0x00, 0x2e, 0x5c, 0x72, 0x84,
    0xf2, 0x01, 0x32, 0x8b,
  ]);

  test("parse", (done) => {
    const esp3data = parseEsp3Data(packet);
    // raw data
    expect(esp3data?.rawData).toStrictEqual(
      Buffer.from([0x20, 0x00, 0x2e, 0x5c, 0x72, 0x84, 0xf2])
    );
    // data
    expect(esp3data?.data?.DataDl).toStrictEqual(Buffer.from([0x84]));
    expect(esp3data?.data?.originatorId).toStrictEqual(
      Buffer.from([0x00, 0x2e, 0x5c, 0x72])
    );
    done();
    // subTelNum
    expect(esp3data?.subTelNum).toStrictEqual(1),
      // dBm
      expect(esp3data?.dBm).toStrictEqual(50);
  });
});
