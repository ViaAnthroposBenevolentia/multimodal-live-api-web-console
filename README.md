# Multimodal Live API - Web console

This repository contains a react-based starter app for using the [Multimodal Live API]([https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live)) over a websocket. It provides modules for streaming audio playback, recording user media such as from a microphone, webcam or screen capture as well as a unified log view to aid in development of your application.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Project consists of:

- an Event-emitting websocket-client to ease communication between the websocket and the front-end
- communication layer for processing audio in and out
- a boilerplate view for starting to build your apps and view logs