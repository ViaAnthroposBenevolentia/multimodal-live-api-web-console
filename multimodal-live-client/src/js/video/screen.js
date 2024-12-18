// This file handles screen capture functionality, enabling the user to share their screen.

const startScreenCapture = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        return stream;
    } catch (error) {
        console.error("Error starting screen capture:", error);
        throw error;
    }
};

const stopScreenCapture = (stream) => {
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
};

export { startScreenCapture, stopScreenCapture };