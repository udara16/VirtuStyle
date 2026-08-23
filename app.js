const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const clothingUpload = document.getElementById('clothingUpload');
const clothingGrid = document.getElementById('clothingGrid');
const loadingMessage = document.getElementById('loadingMessage');

// Working Transparent PNG T-Shirts
const tshirts = [
  {
    id: 1,
    name: 'Classic Black',
    src: 'https://raw.githubusercontent.com/mdeggies/AR-Virtual-Fitting-Room/master/images/shirt1.png'
  },
  {
    id: 2,
    name: 'Sport Red',
    src: 'https://raw.githubusercontent.com/mdeggies/AR-Virtual-Fitting-Room/master/images/shirt2.png'
  },
  {
    id: 3,
    name: 'Pure White',
    src: 'https://raw.githubusercontent.com/mdeggies/AR-Virtual-Fitting-Room/master/images/shirt3.png'
  }
];

let clothingImg = new Image();
clothingImg.crossOrigin = "anonymous";
clothingImg.src = tshirts[0].src;

// Build Wardrobe UI
clothingGrid.innerHTML = '';
tshirts.forEach((item, index) => {
  const card = document.createElement('div');
  card.className = `clothing-card ${index === 0 ? 'active' : ''}`;
  card.innerHTML = `
    <img src="${item.src}" alt="${item.name}">
    <span>${item.name}</span>
  `;

  card.addEventListener('click', () => {
    document.querySelectorAll('.clothing-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    clothingImg.src = item.src;
  });

  clothingGrid.appendChild(card);
});

// Custom Upload Handler
clothingUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      document.querySelectorAll('.clothing-card').forEach(c => c.classList.remove('active'));
      clothingImg.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

function onResults(results) {
  if (loadingMessage) {
    loadingMessage.style.display = 'none';
  }

  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  // Draw Webcam Video Stream
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Pose Estimation & Clothing Overlay
  if (results.poseLandmarks) {
    // 11 = Left Shoulder, 12 = Right Shoulder
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];

    if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.3 && rightShoulder.visibility > 0.3) {
      const pLeft = { x: leftShoulder.x * canvasElement.width, y: leftShoulder.y * canvasElement.height };
      const pRight = { x: rightShoulder.x * canvasElement.width, y: rightShoulder.y * canvasElement.height };

      // Distance and Angle
      const shoulderDistance = Math.hypot(pRight.x - pLeft.x, pRight.y - pLeft.y);
      const angle = Math.atan2(pRight.y - pLeft.y, pRight.x - pLeft.x);

      // Fit calculations
      const shirtWidth = shoulderDistance * 2.2;
      const aspectRatio = (clothingImg.naturalHeight || 1) / (clothingImg.naturalWidth || 1);
      const shirtHeight = shirtWidth * (aspectRatio > 0 ? aspectRatio : 1.25);

      const midX = (pLeft.x + pRight.x) / 2;
      const midY = (pLeft.y + pRight.y) / 2;

      canvasCtx.save();
      canvasCtx.translate(midX, midY);
      canvasCtx.rotate(angle);
      
      if (clothingImg.complete && clothingImg.naturalWidth > 0) {
        canvasCtx.drawImage(
          clothingImg, 
          -shirtWidth / 2, 
          -shirtHeight * 0.18, 
          shirtWidth, 
          shirtHeight
        );
      }
      canvasCtx.restore();
    }
  }
  canvasCtx.restore();
}

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 0, // Faster tracking and better responsiveness on laptops
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.3, // Lowered threshold for dark / shadow environments
  minTrackingConfidence: 0.3
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();
