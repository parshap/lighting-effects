# lighting-effects

A system for creating animations and other lighting effects on
[NeoPixel][] (WS2812) LEDs using [Fadecandy][] and [Open Pixel
Control][]. Lighting effects are written as JavaScript module and be
composed together.

## Open Pixel Control

This system primary function is sending commands to Fadecandy, which
speaks the [Open Pixel Control][] protocol. The `src/opc.js` module
provides helpers for working with OPC.

## Effects

An effect is a JavaScript module that controls the state of LEDs in real
time.

## Scene

A scene is simply a named combination of effects and configuration.

## Manager

The manager owns the current state of LEDs and has the ability to switch
out effects in order to achieve the desired scene. The manager exposes
an API for changing scenes.

# Notes

## TODO

* Strand
