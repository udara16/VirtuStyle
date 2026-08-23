const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const clothingUpload = document.getElementById('clothingUpload');
const clothingGrid = document.getElementById('clothingGrid');
const loadingMessage = document.getElementById('loadingMessage');

// Upright Vector T-Shirt SVGs with Mirror-Corrected Text
const createShirtSVG = (color, text) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 550" width="500" height="550">
    <path d="M 175 45 Q 250 90 325 45 L 470 110 L 415 205 L 360 165 L 365 525 L 135 525 L 140 165 L 85 205 L 30 110 Z" 
          fill="${color}" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 175 45 Q 250 90 325 45 Q 250 70 175 45 Z" fill="#000000" opacity="0.35"/>
    <g transform="translate(250, 0) scale(-1, 1) translate(-250, 0)">
      <text x="250" y="240" font-size="28" font-family="Arial, sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">${text}</text>
      <text x="250" y="270" font-size="12" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" opacity="0.85" text-anchor="middle">DESIGNED BY UDARA</text>
    </g>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const tshirts = [
  { id: 1, name: 'Ocean Blue', src: createShirtSVG('#3b82f6', 'CASUAL') },
  { id: 2, name: 'Sport Red', src: createShirtSVG('#e11d48', 'ACTIVE') },
  { id: 3, name: 'Classic Black', src: createShirtSVG('#0f172a', 'ORIGINAL') },
  { id: 4, name: 'Emerald Green', src: createShirtSVG('#059669', 'SUMMER') }
];

let clothingImg = new Image();
clothingImg.src = tshirts[0].src;

// Build Wardrobe Selection Cards
tshirts.forEach((item, index) => {
  const card = document.createElement('div');
  card.className = `clothing-card ${index === 0 ? 'active' : ''}`;
  card.innerHTML = `<img src="${item.src}" alt="${item.name}"><span>${item.name}</span>`;

  card.addEventListener('click', () => {
    document.querySelectorAll('.clothing-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    clothingImg.src = item.src;
  });

  clothingGrid.appendChild(card);
});

// Handle Custom Clothing Image Uploads
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

// Frame Processing
function onResults(results) {
  if (loadingMessage) loadingMessage.style.display = 'none';

  const w = videoElement.videoWidth || 640;
  const h = videoElement.videoHeight || 480;
  canvasElement.width = w;
  canvasElement.height = h;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, w, h);
  
  // 1. Draw raw camera stream
  canvasCtx.drawImage(results.image, 0, 0, w, h);

  // 2. Direct Anchor Fitting
  if (results.poseLandmarks) {
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    const leftHip = results.poseLandmarks[23];
    const rightHip = results.poseLandmarks[24];

    if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.15 && rightShoulder.visibility > 0.15) {
      const pLeft = { x: leftShoulder.x * w, y: leftShoulder.y * h };
      const pRight = { x: rightShoulder.x * w, y: rightShoulder.y * h };

      // Midpoint between shoulders
      const midX = (pLeft.x + pRight.x) / 2;
      const midY = (pLeft.y + pRight.y) / 2;

      // Distance across shoulders
      const shoulderDistance = Math.hypot(pRight.x - pLeft.x, pRight.y - pLeft.y);

      // Scaled dimensions mapped to torso
      const shirtWidth = shoulderDistance * 2.1;
      let shirtHeight = shirtWidth * 1.15;

      if (leftHip && rightHip && leftHip.visibility > 0.15 && rightHip.visibility > 0.15) {
        const hipMidY = ((leftHip.y + rightHip.y) / 2) * h;
        shirtHeight = Math.max(shirtHeight, (hipMidY - midY) * 1.3);
      }

      // Draw shirt directly downwards from neck collar
      const drawX = midX - (shirtWidth / 2);
      const drawY = midY - (shirtHeight * 0.1);

      canvasCtx.drawImage(
        clothingImg,
        drawX,
        drawY,
        shirtWidth,
        shirtHeight
      );
    }
  }
  canvasCtx.restore();
}

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 0,
  smoothLandmarks: true,
  minDetectionConfidence: 0.15,
  minTrackingConfidence: 0.15
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
