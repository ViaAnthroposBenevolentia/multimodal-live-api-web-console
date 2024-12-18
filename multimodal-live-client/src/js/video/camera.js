// This file manages the webcam video stream, allowing the user to capture video from their camera.

const videoElement = document.createElement('video');
videoElement.autoplay = true;

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
    } catch (error) {
        console.error('Error accessing the camera: ', error);
    }
}

function stopCamera() {
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

export { startCamera, stopCamera, videoElement };