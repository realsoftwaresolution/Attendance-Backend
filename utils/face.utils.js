const faceapi = require("face-api.js");
const canvas = require("canvas");
const path = require("path");
const { Canvas, Image, ImageData } = canvas;

/* ---------------- Setup Node.js compatibility for face-api ---------------- */
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function loadFaceModels() {
  if (modelsLoaded) return;

  const modelPath = path.join(__dirname, "../public/weights");

  try {
    /* --------------- Load models in parallel for faster startup --------------- */
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
    ]);

    modelsLoaded = true;
    console.log("✅ Face-api models loaded successfully");
  } catch (error) {
    console.error("❌ Model load error:", error.message);
    throw error;
  }
}

function getFaceDistance(emb1, emb2) {
  if (!emb1 || !emb2 || emb1.length !== emb2.length) return Infinity;
  return faceapi.euclideanDistance(emb1, emb2);
}

function isFaceMatch(distance, threshold = 0.6) {
  return distance < threshold;
}

module.exports = {
  loadFaceModels,
  getFaceDistance,
  isFaceMatch,
};