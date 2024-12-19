let previousImageData = null;

function detectMotion(imageData1, imageData2, threshold) {
  if (!imageData1 || !imageData2) return true;
  
  // JavaScript implementation
  const data1 = imageData1.data;
  const data2 = imageData2.data;
  let diffCount = 0;
  
  for (let i = 0; i < data1.length; i += 4) {
    const diff = Math.abs(data1[i] - data2[i]) +
                Math.abs(data1[i + 1] - data2[i + 1]) +
                Math.abs(data1[i + 2] - data2[i + 2]);
    if (diff > 30) diffCount++;
  }
  
  return (diffCount / (data1.length / 4)) > threshold;
}

function resizeCanvas(canvas, maxWidth) {
  const ratio = canvas.width / canvas.height;
  if (canvas.width > maxWidth) {
    canvas.width = maxWidth;
    canvas.height = maxWidth / ratio;
  }
}

self.onmessage = async function(e) {
  const { frame, width, height, quality, maxWidth, motionThreshold, previousImageData: prevImageData } = e.data;
  
  const startTime = performance.now();
  
  // Create OffscreenCanvas for processing
  let canvas = new OffscreenCanvas(width, height);
  let ctx = canvas.getContext('2d', {
    willReadFrequently: true,
    alpha: false,
    desynchronized: true
  });

  // Resize if needed
  if (maxWidth && width > maxWidth) {
    resizeCanvas(canvas, maxWidth);
  }

  // Draw the frame
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

  // Get image data for motion detection
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hasMotion = detectMotion(imageData, previousImageData, motionThreshold);

  // Store current frame for next comparison
  previousImageData = imageData;

  // Only process if motion detected
  if (hasMotion) {
    // Compress and encode
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality || 0.5
    });

    // Send back the processed frame
    const buffer = await blob.arrayBuffer();
    const processingTime = performance.now() - startTime;
    
    self.postMessage({ 
      buffer, 
      hasMotion,
      processingTime 
    }, [buffer]);
  } else {
    self.postMessage({ hasMotion: false });
  }
}; 