<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Virtual Try-On - By Udara Dissanayake</title>
  
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      background: #0b0f19;
      color: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 15px;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 800px;
      width: 100%;
      gap: 15px;
    }

    .header {
      text-align: center;
    }

    .header h1 {
      font-size: 1.8rem;
      color: #38bdf8;
    }

    .designer-tag {
      font-size: 0.95rem;
      color: #94a3b8;
      margin-top: 4px;
    }

    .designer-tag span {
      color: #f43f5e;
      font-weight: 700;
    }

    .wardrobe-panel {
      background: #1e293b;
      padding: 12px 20px;
      border-radius: 12px;
      width: 100%;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    .wardrobe-panel h3 {
      font-size: 0.9rem;
      margin-bottom: 10px;
      color: #cbd5e1;
    }

    .clothing-grid {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 6px;
    }

    .clothing-card {
      flex: 0 0 90px;
      background: #0f172a;
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 6px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clothing-card:hover {
      border-color: #38bdf8;
    }

    .clothing-card.active {
      border-color: #f43f5e;
      background: #1e1b4b;
    }

    .clothing-card img {
      width: 100%;
      height: 55px;
      object-fit: contain;
    }

    .clothing-card span {
      display: block;
      font-size: 0.72rem;
      margin-top: 4px;
      color: #e2e8f0;
    }

    .custom-upload {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .canvas-wrapper {
      position: relative;
      width: 100%;
      max-width: 640px;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      border: 2px solid #334155;
      background: #000;
    }

    canvas {
      width: 100%;
      height: auto;
      display: block;
    }

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #38bdf8;
      font-weight: 600;
      background: rgba(0,0,0,0.75);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .footer {
      font-size: 0.8rem;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>AI Virtual Try-On</h1>
      <p class="designer-tag">Exclusive Collection Designed by <span>Udara Dissanayake</span></p>
    </header>
    
    <div class="wardrobe-panel">
      <h3>Select T-Shirt Style:</h3>
      <div class="clothing-grid" id="clothingGrid"></div>

      <div class="custom-upload">
        <label for="clothingUpload">📁 Or Upload Custom PNG:</label>
        <input type="file" id="clothingUpload" accept="image/png, image/webp">
      </div>
    </div>

    <div class="canvas-wrapper">
      <video id="webcam" playsinline style="display: none;"></video>
      <canvas id="outputCanvas"></canvas>
      <div id="loadingMessage" class="loading">Loading AI Model & Camera...</div>
    </div>

    <footer class="footer">
      <p>&copy; Designed & Developed by Udara Dissanayake</p>
    </footer>
  </div>

  <script>
    // Precision SVG Format
    const createShirtSVG = (color, text) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 550" width="500" height="550">
        <path d="M 160 50 Q 250 100 340 50 L 480 130 L 415 225 L 365 185 L 365 520 L 135 520 L 135 185 L 85 225 L 20 130 Z" 
              fill="${color}" stroke="#ffffff" stroke-width="6" stroke-linejoin="round"/>
        <path d="M 160 50 Q 250 100 340 50 Q 250 80 160 50 Z" fill="#000000" opacity="0.25"/>
        <text x="250" y="270" font-size="32" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">${text}</text>
        <text x="250" y="305" font-size="14" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" opacity="0.85" text-anchor="middle">BY UDARA</text>
      </svg>`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };

    const tshirts = [
      { id: 1, name: 'Sport Red', src: createShirtSVG('#e11d48', 'ACTIVE') },
      { id: 2, name: 'Classic Black', src: createShirtSVG('#0f172a', 'ORIGINAL') },
      { id: 3, name: 'Ocean Blue', src: createShirtSVG('#0284c7', 'CASUAL') },
      { id: 4, name: 'Emerald Green', src: createShirtSVG('#059669', 'SUMMER') }
    ];

    const videoElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('outputCanvas');
    const canvasCtx = canvasElement.getContext('2d');
    const clothingUpload = document.getElementById('clothingUpload');
    const clothingGrid = document.getElementById('clothingGrid');
    const loadingMessage = document.getElementById('loadingMessage');

    let clothingImg = new Image();
    clothingImg.src = tshirts[0].src;

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
      if (loadingMessage) loadingMessage.style.display = 'none';

      const w = videoElement.videoWidth || 640;
      const h = videoElement.videoHeight || 480;
      canvasElement.width = w;
      canvasElement.height = h;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, w, h);
      
      // Mirror webcam display
      canvasCtx.translate(w, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, w, h);

      if (results.poseLandmarks) {
        const leftShoulder = results.poseLandmarks[11];
        const rightShoulder = results.poseLandmarks[12];

        if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.2 && rightShoulder.visibility > 0.2) {
          const pLeft = { x: leftShoulder.x * w, y: leftShoulder.y * h };
          const pRight = { x: rightShoulder.x * w, y: rightShoulder.y * h };

          // Midpoint between shoulders
          const midX = (pLeft.x + pRight.x) / 2;
          const midY = (pLeft.y + pRight.y) / 2;

          const shoulderDistance = Math.hypot(pRight.x - pLeft.x, pRight.y - pLeft.y);
          const angle = Math.atan2(pRight.y - pLeft.y, pRight.x - pLeft.x);

          // Scaled to completely cover shoulders and chest accurately
          const shirtWidth = shoulderDistance * 2.5;
          const shirtHeight = shirtWidth * 1.1;

          canvasCtx.save();
          canvasCtx.translate(midX, midY);
          canvasCtx.rotate(angle);
          
          // Re-flip horizontal axis so text renders correctly (not mirrored)
          canvasCtx.scale(-1, 1);
          
          // Draw shirt starting from collar neck line
          canvasCtx.drawImage(
            clothingImg, 
            -shirtWidth / 2, 
            -shirtHeight * 0.1, 
            shirtWidth, 
            shirtHeight
          );
          canvasCtx.restore();
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
      minDetectionConfidence: 0.2,
      minTrackingConfidence: 0.2
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
  </script>
</body>
</html>
