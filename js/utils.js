export function blobToJSON(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                const json = JSON.parse(reader.result);
                resolve(json);
            } else {
                reject('Failed to parse blob to JSON');
            }
        };
        reader.readAsText(blob);
    });
}

export function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
} 