import { EventEmitter } from 'https://cdn.skypack.dev/eventemitter3';
import { blobToJSON, base64ToArrayBuffer } from './utils.js';

export class MultimodalLiveClient extends EventEmitter {
    constructor({ url, apiKey }) {
        super();
        this.url = url || `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        this.ws = null;
        this.config = null;
        this.send = this.send.bind(this);
    }

    log(type, message) {
        this.emit('log', { date: new Date(), type, message });
    }

    connect(config) {
        this.config = config;
        const ws = new WebSocket(this.url);

        ws.addEventListener('message', async (evt) => {
            if (evt.data instanceof Blob) {
                this.receive(evt.data);
            } else {
                console.log('Non-blob message', evt);
            }
        });

        return new Promise((resolve, reject) => {
            const onError = (ev) => {
                this.disconnect(ws);
                const message = `Could not connect to "${this.url}"`;
                this.log(`server.${ev.type}`, message);
                reject(new Error(message));
            };

            ws.addEventListener('error', onError);
            ws.addEventListener('open', (ev) => {
                if (!this.config) {
                    reject('Invalid config sent to `connect(config)`');
                    return;
                }
                this.log(`client.${ev.type}`, 'Connected to socket');
                this.emit('open');

                this.ws = ws;

                const setupMessage = { setup: this.config };
                this._sendDirect(setupMessage);
                this.log('client.send', 'setup');

                ws.removeEventListener('error', onError);
                ws.addEventListener('close', (ev) => {
                    this.disconnect(ws);
                    let reason = ev.reason || '';
                    if (reason.toLowerCase().includes('error')) {
                        const prelude = 'ERROR]';
                        const preludeIndex = reason.indexOf(prelude);
                        if (preludeIndex > 0) {
                            reason = reason.slice(preludeIndex + prelude.length + 1);
                        }
                    }
                    this.log(`server.${ev.type}`, `Disconnected ${reason ? `with reason: ${reason}` : ''}`);
                    this.emit('close', ev);
                });
                resolve(true);
            });
        });
    }

    disconnect(ws) {
        if ((!ws || this.ws === ws) && this.ws) {
            this.ws.close();
            this.ws = null;
            this.log('client.close', 'Disconnected');
            return true;
        }
        return false;
    }

    async receive(blob) {
        const response = await blobToJSON(blob);
        if (response.toolCall) {
            this.log('server.toolCall', response);
            this.emit('toolcall', response.toolCall);
            return;
        }
        if (response.toolCallCancellation) {
            this.log('receive.toolCallCancellation', response);
            this.emit('toolcallcancellation', response.toolCallCancellation);
            return;
        }
        if (response.setupComplete) {
            this.log('server.send', 'setupComplete');
            this.emit('setupcomplete');
            return;
        }
        if (response.serverContent) {
            const { serverContent } = response;
            if (serverContent.interrupted) {
                this.log('receive.serverContent', 'interrupted');
                this.emit('interrupted');
                return;
            }
            if (serverContent.turnComplete) {
                this.log('server.send', 'turnComplete');
                this.emit('turncomplete');
            }
            if (serverContent.modelTurn) {
                let parts = serverContent.modelTurn.parts;
                const audioParts = parts.filter((p) => p.inlineData && p.inlineData.mimeType.startsWith('audio/pcm'));
                const base64s = audioParts.map((p) => p.inlineData?.data);
                const otherParts = parts.filter((p) => !audioParts.includes(p));

                base64s.forEach((b64) => {
                    if (b64) {
                        const data = base64ToArrayBuffer(b64);
                        this.emit('audio', data);
                        this.log(`server.audio`, `buffer (${data.byteLength})`);
                    }
                });

                if (!otherParts.length) {
                    return;
                }

                parts = otherParts;
                const content = { modelTurn: { parts } };
                this.emit('content', content);
                this.log(`server.content`, response);
            }
        } else {
            console.log('Received unmatched message', response);
        }
    }

    sendRealtimeInput(chunks) {
        let hasAudio = false;
        let hasVideo = false;
        for (let i = 0; i < chunks.length; i++) {
            const ch = chunks[i];
            if (ch.mimeType.includes('audio')) {
                hasAudio = true;
            }
            if (ch.mimeType.includes('image')) {
                hasVideo = true;
            }
            if (hasAudio && hasVideo) {
                break;
            }
        }
        const message = hasAudio && hasVideo ? 'audio + video' : hasAudio ? 'audio' : hasVideo ? 'video' : 'unknown';

        const data = { realtimeInput: { mediaChunks: chunks } };
        this._sendDirect(data);
        this.log(`client.realtimeInput`, message);
    }

    sendToolResponse(toolResponse) {
        const message = { toolResponse };
        this._sendDirect(message);
        this.log(`client.toolResponse`, message);
    }

    send(parts, turnComplete = true) {
        parts = Array.isArray(parts) ? parts : [parts];
        const formattedParts = parts.map(part => {
            if (typeof part === 'string') {
                return { text: part };
            } else if (typeof part === 'object' && !part.text && !part.inlineData) {
                return { text: JSON.stringify(part) };
            }
            return part;
        });
        const content = { role: 'user', parts: formattedParts };
        const clientContentRequest = { clientContent: { turns: [content], turnComplete } };
        this._sendDirect(clientContentRequest);
        this.log(`client.send`, clientContentRequest);
    }

    _sendDirect(request) {
        if (!this.ws) {
            throw new Error('WebSocket is not connected');
        }
        const str = JSON.stringify(request);
        this.ws.send(str);
    }
} 