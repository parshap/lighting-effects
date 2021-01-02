const { writePixel, parsePixel, createMessage, parseHeader } = require("./opc");

test("writePixel and parsePixel", () => {
  const buffer = Buffer.alloc(3 * 10);

  writePixel(buffer, 0, [5, 10, 15]);
  expect(parsePixel(buffer, 0)).toEqual([5, 10, 15]);
  expect(buffer.readUInt8(0)).toEqual(5);
  expect(buffer.readUInt8(1)).toEqual(10);
  expect(buffer.readUInt8(2)).toEqual(15);

  writePixel(buffer, 2 * 3, [1, 2, 3]);
  expect(parsePixel(buffer, 2 * 3)).toEqual([1, 2, 3]);
  expect(buffer.readUInt8(2 * 3 + 0)).toEqual(1);
  expect(buffer.readUInt8(2 * 3 + 1)).toEqual(2);
  expect(buffer.readUInt8(2 * 3 + 2)).toEqual(3);
});

test("createMessage and parseHeader", () => {
  const data = Buffer.from([0x0, 0x1, 0x2]);
  const buffer = createMessage(100, 200, data);
  const parsedHeader = parseHeader(buffer, 0);
  expect(parsedHeader.channel).toEqual(100);
  expect(parsedHeader.command).toEqual(200);
  expect(parsedHeader.dataLength).toEqual(3);
  expect(buffer.slice(4)).toEqual(data);
});
