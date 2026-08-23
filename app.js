const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const clothingUpload = document.getElementById('clothingUpload');
const clothingGrid = document.getElementById('clothingGrid');
const loadingMessage = document.getElementById('loadingMessage');

// T-Shirt Styles / Collection by Udara Dissanayake
const tshirts = [
  {
    id: 1,
    name: 'Classic Black',
    src: 'https://raw.githubusercontent.com/udissanayake/assets/main/tshirt-black.png' // ඔබට කැමති Transparent PNG link එකක් යෙදිය හැක
  },
  {
    id: 2,
    name: 'Pure White',
    src: 'https://raw.githubusercontent.com/udissanayake/assets/main/tshirt-white.png'
  },
  {
    id: 3,
    name: 'Sport Red',
    src: 'https://raw.githubusercontent.com/udissanayake/assets/main/tshirt-red.png'
  },
  {
    id: 4,
    name: 'Navy Blue Polo',
    src: 'https://raw.githubusercontent.com/udissanayake/assets/main/tshirt-navy.png'
  }
];

let clothingImg = new Image();
// Fallback placeholder transparent image
clothingImg.src = tshirts[0].src;

// Build Wardrobe UI Cards
tshirts.forEach((item, index) => {
  const card = document.createElement('div');
  card.className = `clothing-card ${index === 0 ? 'active' : ''}`;
  card.innerHTML = `
    <img src="${item.src}" alt="${item.name}" onerror="this.src='https://placehold.co/100x70/1e293b/ffffff?text=${encodeURIComponent(item.name)}'">
    <span>${item.name}</span>
  `;

  card.addEventListener('click', () => {
    document.querySelectorAll('.clothing-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    clothingImg.src = item.src;
  });

  clothingGrid.appendChild(card);
});

// Custom Upload listener
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
  
  // 1. Draw webcam feed
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // 2. Pose calculation and T-Shirt fitting
  if (results.poseLandmarks) {
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];

    if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5) {
      const pLeft = { x: leftShoulder.x * canvasElement.width, y: leftShoulder.y * canvasElement.height };
      const pRight = { x: rightShoulder.x * canvasElement.width, y: rightShoulder.y * canvasElement.height };

      const shoulderDistance = Math.hypot(pRight.x - pLeft.x, pRight.y - pLeft.y);
      const angle = Math.atan2(pRight.y - pLeft.y, pRight.x - pLeft.x);

      // Sizing calculation based on shoulder width
      const shirtWidth = shoulderDistance * 2.25;
      const aspectRatio = (clothingImg.naturalHeight || 1.2) / (clothingImg.naturalWidth || 1);
      const shirtHeight = shirtWidth * aspectRatio;

      const midX = (pLeft.x + pRight.x) / 2;
      const midY = (pLeft.y + pRight.y) / 2;

      canvasCtx.save();
      canvasCtx.translate(midX, midY);
      canvasCtx.rotate(angle);
      
      // Draw clothing overlay
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
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
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
