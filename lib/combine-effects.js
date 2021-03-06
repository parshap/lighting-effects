"use strict";

var through = require("through2");
var async = require("async");

function onceNextTick(fn) {
  var waiting = false;
  return function() {
    if (waiting) {
      return;
    }
    waiting = true;
    var ctx = this;
    var args = arguments;
    process.nextTick(function() {
      waiting = false;
      fn.apply(ctx, args);
    });
  };
}

module.exports = function combineEffects(strand, streams, combineFn) {
  var retstream = through.obj(function(chunk, enc, callback) {
    async.forEach(streams, function(stream, callback) {
      stream.write(chunk, enc, callback);
    }, callback)
  });
  var strandData = streams.map(function() {
    return null;
  });
  var emitData = onceNextTick(function() {
    var combinedData = combineFn(strand, strandData);
    retstream.push(combinedData);
  });
  streams.forEach(function(stream, i) {
    stream.on("data", function(data) {
      strandData[i] = data;
      if (strandData.every(Boolean)) {
        emitData();
      }
    });
    stream.on("error", retstream.emit.bind(retstream, "error"));
  });
  return retstream;
};
