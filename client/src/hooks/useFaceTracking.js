import { useState, useEffect, useRef } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

// Math Helper: 3D Euclidean Distance
const getDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
};

const useFaceTracking = (videoRef) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  // Running stats for current question
  const [runningAverages, setRunningAverages] = useState({
    avgSmileScore: 0,
    avgEyeContact: 100,
    headMovementScore: 0,
  });

  const landmarkerRef = useRef(null);
  const requestRef = useRef(null);
  const activeRef = useRef(false);

  // Accumulated metrics inside refs to avoid 60fps React re-renders
  const metricsRef = useRef({
    smileSums: 0,
    eyeContactSums: 0,
    displacementSums: 0,
    samplesCount: 0,
    lastNosePos: null,
  });

  // 1. Initialize MediaPipe Face Landmarker on mount
  useEffect(() => {
    let active = true;

    const initLandmarker = async () => {
      try {
        console.log('[MediaPipe] Initializing Face Landmarker Wasm...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!active) return;

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (!active) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsReady(true);
        console.log('[MediaPipe] Face Landmarker loaded successfully.');
      } catch (err) {
        console.error('[MediaPipe] Failed to load Face Landmarker:', err.message);
        setError('Failed to initialize webcam facial landmark tracker.');
      }
    };

    initLandmarker();

    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // 2. Main Tracking Frame Loop
  const trackingLoop = () => {
    if (!activeRef.current || !videoRef.current || !landmarkerRef.current) return;

    const video = videoRef.current;
    
    // Ensure video is playing and has data
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const now = performance.now();
      const results = landmarkerRef.current.detectForVideo(video, now);

      if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        // --- 3D GEOMETRY CALCULATIONS ---
        
        // Reference coordinates
        const nose = landmarks[1];
        const mouthLeft = landmarks[61];
        const mouthRight = landmarks[291];
        const leftEyeOuter = landmarks[33];
        const rightEyeOuter = landmarks[263];
        const leftEyeInner = landmarks[133];
        const rightEyeInner = landmarks[362];
        const leftIris = landmarks[468];
        const rightIris = landmarks[473];

        // A. SMILE SCORE (Mouth width relative to eye distance)
        const eyeDistance = getDistance(leftEyeOuter, rightEyeOuter);
        const mouthWidth = getDistance(mouthLeft, mouthRight);
        
        // Base ratio is approx 0.38; smiling pulls it to 0.48+
        const smileRatio = eyeDistance > 0 ? mouthWidth / eyeDistance : 0.38;
        const smileScore = Math.max(0, Math.min(100, (smileRatio - 0.38) * 600));

        // B. EYE CONTACT SCORE (Iris position offset from pupil center boundary)
        const leftEyeCenter = {
          x: (leftEyeOuter.x + leftEyeInner.x) / 2,
          y: (leftEyeOuter.y + leftEyeInner.y) / 2,
          z: (leftEyeOuter.z + leftEyeInner.z) / 2,
        };
        const rightEyeCenter = {
          x: (rightEyeOuter.x + rightEyeInner.x) / 2,
          y: (rightEyeOuter.y + rightEyeInner.y) / 2,
          z: (rightEyeOuter.z + rightEyeInner.z) / 2,
        };

        const leftOffset = getDistance(leftIris, leftEyeCenter);
        const rightOffset = getDistance(rightIris, rightEyeCenter);
        const avgOffset = (leftOffset + rightOffset) / 2;

        // Offset relative to eye size (approx eye width)
        const leftEyeWidth = getDistance(leftEyeOuter, leftEyeInner);
        const relativeOffset = leftEyeWidth > 0 ? avgOffset / leftEyeWidth : 0;
        
        // Offset ratio: smaller is better (looking straight), larger is looking away
        const eyeContactScore = Math.max(0, Math.min(100, 100 - (relativeOffset * 400)));

        // C. HEAD MOVEMENT (Displacement distance of nose tip)
        let displacement = 0;
        if (metricsRef.current.lastNosePos) {
          displacement = getDistance(nose, metricsRef.current.lastNosePos);
        }
        metricsRef.current.lastNosePos = { x: nose.x, y: nose.y, z: nose.z };

        // Accumulate sample data
        metricsRef.current.smileSums += smileScore;
        metricsRef.current.eyeContactSums += eyeContactScore;
        metricsRef.current.displacementSums += displacement;
        metricsRef.current.samplesCount += 1;
      }
    }

    requestRef.current = requestAnimationFrame(trackingLoop);
  };

  // 3. Control triggers: Start Tracking
  const startTracking = () => {
    if (!isReady) return;
    console.log('[FaceTracker] Resetting metrics & starting tracking loop...');
    
    metricsRef.current = {
      smileSums: 0,
      eyeContactSums: 0,
      displacementSums: 0,
      samplesCount: 0,
      lastNosePos: null,
    };
    
    activeRef.current = true;
    trackingLoop();

    // Setup an interval to update React state averages for live display (e.g. 1 FPS)
    const intervalId = setInterval(() => {
      if (activeRef.current) {
        setRunningAverages(calculateCurrentAverages());
      }
    }, 1000);

    metricsRef.current.intervalId = intervalId;
  };

  // Helper to resolve sums to averages
  const calculateCurrentAverages = () => {
    const { smileSums, eyeContactSums, displacementSums, samplesCount } = metricsRef.current;
    
    if (samplesCount === 0) {
      return { avgSmileScore: 0, avgEyeContact: 100, headMovementScore: 0 };
    }

    // Scale accumulated nose displacement (e.g., sum * 100) into a head jitter index
    const rawMove = (displacementSums / samplesCount) * 4000;
    const headMovementScore = Math.round(Math.min(100, rawMove));

    return {
      avgSmileScore: Math.round(smileSums / samplesCount),
      avgEyeContact: Math.round(eyeContactSums / samplesCount),
      headMovementScore,
    };
  };

  // 4. Control triggers: Stop Tracking
  const stopTracking = () => {
    activeRef.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (metricsRef.current.intervalId) {
      clearInterval(metricsRef.current.intervalId);
    }

    const finalAverages = calculateCurrentAverages();
    setRunningAverages(finalAverages);
    console.log('[FaceTracker] Tracking stopped. Final question averages:', finalAverages);
    return finalAverages;
  };

  return {
    isReady,
    error,
    startTracking,
    stopTracking,
    runningAverages,
  };
};

export default useFaceTracking;
