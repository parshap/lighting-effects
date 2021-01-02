/**
 * This directory contains modules relating to ["Open Pixel Control"][], a
 * protocol for controlling arrays of RGB lights.
 *
 * The exported interface supports two main use cases:
 *
 * (1) Parse a binary OPC messages into logical JS values
 * (2) Create binary OPC messages from logical JS values
 *
 * ["Open Pixel Control"]: http://openpixelcontrol.org/
 */

const stream = require("stream");

const HEADER_LENGTH = 4;

const parseChannel = (buffer, offset = 0) => buffer.readUInt8(offset);

const parseCommand = (buffer, offset = 0) => buffer.readUInt8(offset);

const parseDataLength = (buffer, offset = 0) => buffer.readUInt16BE(offset);

const parsePixelData = (buffer, offset = 0, dataSize = 2) => {};

const parseHeader = (buffer, offset = 0) => ({
  channel: parseChannel(buffer, offset + 0),
  command: parseCommand(buffer, offset + 1),
  dataLength: parseDataLength(buffer, offset + 2),
});

const parseMessage = async (inputStream) => {
  const channel = parseChannel(await readStreamBytes(inputStream, 1));
  const command = parseCommand(await readStreamBytes(inputStream, 1));
  const dataLength = parseDataLength(await readStreamBytes(inputStream, 2));
  const data = await readStreamBytes(inputStream, dataLength);
  return {
    channel,
    command,
    data,
  };
};

const getOpcMessagesFromStream = async (onMessage) => {
  // @TODO: Error handling?
  // @TODO: Be resilient to stream ending half message
  const loop = async () => {
    const opcMessage = await parseOpcMessage(inputStream);
    onMessage(opcMessage);
    return loop();
  };
  await loop();
};

const createOpcParseStream = () => {
  const inputStream = new stream.PassThrough();
  const outputStream = new stream.Duplex({
    objectMode: true,
    write(chunk, encoding, callback) {
      inputStream.push(chunk, encoding);
      callback();
    },
    final() {
      inputStream.push(null);
      inputStream.end();
    },
    async read() {
      const opcMessage = await parseOpcMessage(inputStream);
      this.push(opcMessage);
    },
  });
  return [inputStream, outputStream];
};

const createPixelsMessage = (channel, pixels) => {
  return createMessage(channel, 0, pixels);
};

const createSetGlobalColorCorrectionMessage = (config) => {
  const json = JSON.stringify(config);
  const data = Buffer.alloc(Buffer.byteLength(json) + 4);
  data.writeUInt16BE(0x0001, 0); // System ID ("Fadecandy")
  data.writeUInt16BE(0x0001, 2); // SysEx ID ("Set Global Color Correction")
  data.write(json, 4); // data
  return createMessage(0, 0xff, data);
};

const createMessage = (channel, command, data) => {
  const control = createHeader(channel, command, data.length);
  return Buffer.concat([control, data]);
};

const createHeader = (channel, command, length) => {
  const CONTROL_LENGTH = 4;
  const buffer = Buffer.alloc(CONTROL_LENGTH);
  buffer.writeUInt8(channel, 0); // Channel
  buffer.writeUInt8(command, 1); // Command
  buffer.writeUInt16BE(length, 2); // Data length
  return buffer;
};

const writePixel = (buffer, offset = 0, [r, g, b]) => {
  buffer.writeUInt8(r, offset);
  buffer.writeUInt8(g, offset + 1);
  buffer.writeUInt8(b, offset + 2);
};

const parsePixel = (buffer, offset = 0) => [
  buffer.readUInt8(offset),
  buffer.readUInt8(offset + 1),
  buffer.readUInt8(offset + 2),
];

module.exports.HEADER_LENGTH = HEADER_LENGTH;
module.exports.writePixel = writePixel;
module.exports.parsePixel = parsePixel;
module.exports.createMessage = createMessage;
module.exports.parseHeader = parseHeader;
