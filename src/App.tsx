/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Sparkles, 
  Heart, 
  Smile, 
  RotateCcw, 
  Save, 
  Trash2, 
  Calendar, 
  Upload, 
  X, 
  Check, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Volume2,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MindAnalysisResult, SavedEmotionRecord } from "./types";

// Synthesis helper for custom retro game beep sounds
const playSynthBeep = (freq: number, duration: number) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration - 0.02);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.debug("Audio play blocked by browser policy or omitted", e);
  }
};

// Synthesis helper for shutter sound
const playShutterSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = audioCtx.sampleRate * 0.12;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    
    noise.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  } catch (e) {
    console.debug("Audio play blocked", e);
  }
};

export default function App() {
  // Camera & Capture states
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  
  // App workflow states
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MindAnalysisResult | null>(null);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  
  // Loading texts iteration to keep children happy & responsive
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const loadingSteps = [
    "찰칵! 마음 사진 현상기 가동 중... 📸",
    "예쁜 눈썹과 반짝이는 눈 관찰하는 중... 👀",
    "사랑스러운 입술과 귀여운 볼 확인 중... 💋",
    "손하트나 신나는 포즈가 있는지 찾아보는 중... ✌️",
    "Gemini AI 분석가가 우리 친구의 진심 마음을 읽어내는 중... ✨"
  ];

  // Diary records state
  const [records, setRecords] = useState<SavedEmotionRecord[]>([]);
  // Detail view state for records
  const [selectedRecord, setSelectedRecord] = useState<SavedEmotionRecord | null>(null);
  // Deletion confirmation modal state
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize camera and load saved diaries on mount
  useEffect(() => {
    startCamera();
    
    // Load local storage diaries
    try {
      const stored = localStorage.getItem("mind_camera_diaries");
      if (stored) {
        setRecords(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load stored diaries", e);
    }
  }, []);

  // Update loading step phrase while analyzing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle countdown recursive trigger
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      // Play tick beep
      playSynthBeep(650, 0.15);
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Shutter click!
      playShutterSound();
      triggerSnapshot();
      setCountdown(null);
    }
  }, [countdown]);

  // Start webcam feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      
      const constraints = {
        video: { 
          facingMode: "user", 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera check failed relative to permission / device:", err);
      setCameraActive(false);
      setCameraError(
        "카메라를 켤 수 없어요! 전면 카메라 권한을 허용해주시거나, 아래 업로드 버튼을 사용해 예쁜 사진을 직접 업로드해 볼 수도 있어요. 💖"
      );
    }
  };

  // Close webcam stream on block switches if needed
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Start countdown
  const startCountdownSequence = () => {
    setCountdown(3);
    setCapturedPhoto(null);
    setAnalysisResult(null);
    setUserVote(null);
    setAnalysisError(null);
  };

  // Capture current mirror frame physically to canvas
  const triggerSnapshot = () => {
    if (!videoRef.current) {
      setAnalysisError("비디오 센서를 복구하지 못했습니다.");
      return;
    }
    
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setAnalysisError("캔버스를 준비하지 못했습니다.");
      return;
    }
    
    // Physical mirroring context! Mirror horizontally matching the preview exactly
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    // Paint frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transform
    if (isMirrored) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    const base64Url = canvas.toDataURL("image/png");
    setCapturedPhoto(base64Url);
    
    // Submit to AI
    analyzePhotoWithGemini(base64Url);
  };

  // Process file uploads (Drag & Drop or Manual selection)
  const handleUploadedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 마음 분석을 시작할 수 있어요! 🌸");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCapturedPhoto(dataUrl);
      setAnalysisResult(null);
      setUserVote(null);
      setAnalysisError(null);
      playShutterSound();
      analyzePhotoWithGemini(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // API query: Send to Server
  const analyzePhotoWithGemini = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageBase64 })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "서버 마음 분석 응답 실패");
      }
      
      setAnalysisResult(data);
    } catch (err: any) {
      console.error("Gemini Vision Fetch Error:", err);
      setAnalysisError(err.message || "마음의 주파수 분석에 비연결 오류가 나타났어요. AI 비밀 설정키를 다시 조회해보세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save Record locally
  const saveDiaryEntry = () => {
    if (!capturedPhoto || !analysisResult) return;
    
    const formattedDate = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newRecord: SavedEmotionRecord = {
      id: "mind_" + Date.now(),
      photoUrl: capturedPhoto,
      emotion: analysisResult.emotion,
      description: analysisResult.description,
      isThatRight: analysisResult.isThatRight,
      tags: analysisResult.tags,
      timestamp: formattedDate,
      isConfirmed: userVote
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem("mind_camera_diaries", JSON.stringify(updated));
    
    playSynthBeep(880, 0.25);
    showToast("🎀 머금던 진심이 그날의 마음 보관함에 고이 저장되었어요!");

    // Reset state and restart camera
    setCapturedPhoto(null);
    setAnalysisResult(null);
    setUserVote(null);
    startCamera();
  };

  // Show toast notification briefly
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete Record Trigger
  const deleteRecord = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecordToDelete(id);
  };

  const confirmDeleteRecord = () => {
    if (!recordToDelete) return;
    const updated = records.filter(r => r.id !== recordToDelete);
    setRecords(updated);
    localStorage.setItem("mind_camera_diaries", JSON.stringify(updated));
    
    if (selectedRecord?.id === recordToDelete) {
      setSelectedRecord(null);
    }
    setRecordToDelete(null);
    playSynthBeep(330, 0.2);
  };

  return (
    <div 
      className="min-h-screen bg-custom flex flex-col relative overflow-x-hidden"
      style={{ backdropFilter: "blur(2px)" }}
    >
      {/* Decorative backdrop overlay */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-white border-2 border-pink-200 text-rose-700 font-cute font-bold text-sm px-6 py-3 rounded-2xl shadow-xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>



      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto px-4 py-3 flex-1 flex flex-col justify-between relative z-10">
        
        {/* Navigation & Brand Header */}
        <header className="text-center mb-6 mt-2">
          <div className="inline-flex flex-col items-center gap-1.5 bg-white/90 backdrop-blur-md px-8 py-3.5 rounded-[2rem] border-2 border-pink-100 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-3xl animate-bounce" style={{ animationDuration: "2s" }}>📸</span>
              <h1 className="text-4xl font-cute font-bold text-[#FF85A1] drop-shadow-sm italic tracking-wide">
                마음 사진기
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-150 text-pink-500 animate-pulse font-cute">
                Gemini Vision
              </span>
            </div>
            <p className="text-sm font-medium mt-1 text-[#B08992] tracking-wide font-cute opacity-90">
              오늘 너의 예쁜 마음을 담아줄게! ✨
            </p>
          </div>
        </header>

        {/* 2-Column Split: Interactive Screen Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto w-full">
          
          {/* LEFT COLUMN: Mirror Camera Control Panel (7 cols on large desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="camera-view-container relative">
              
              {/* Card visual ribbon */}
              <div className="bg-gradient-to-r from-pink-100 via-rose-200 to-pink-100 px-4 py-2 border-b-2 border-pink-100 flex justify-between items-center text-rose-700 font-cute font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400 animate-ping inline-block" />
                  실시간 마음 윙크 거울
                </span>
                <span className="text-xs opacity-80">MIRROR PROTOCOL</span>
              </div>

              {/* Viewport Core Block */}
              <div className="aspect-[4/3] w-full bg-rose-50/50 relative overflow-hidden flex items-center justify-center">
                
                {/* 1. Normal active camera preview (Mirror Mode: Horizontally Flipped scale-x-[-1]) */}
                {cameraActive && !capturedPhoto && (
                  <div className="w-full h-full relative">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      className={`w-full h-full object-cover transition-transform duration-300 transform ${isMirrored ? "scale-x-[-1]" : ""}`}
                      id="webcam-preview"
                    />
                    {/* Mirroring instruction water-badge */}
                    <div className="absolute top-3 left-3 bg-black/40 text-white/95 text-xs px-2 py-1 rounded-md font-cute pointer-events-none tracking-wide text-center">
                      {isMirrored ? "거울 모드 동작 중 🪞" : "일반 카메라 모드 🎥"}
                    </div>
                  </div>
                )}

                {/* 2. Photo has been Captured display */}
                {capturedPhoto && (
                  <div className="w-full h-full relative">
                    <img 
                      src={capturedPhoto} 
                      alt="Captured heart frame" 
                      className="w-full h-full object-cover animate-cute-fade-in"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-pink-500 text-white font-cute text-xs px-3 py-1 rounded-full shadow-md animate-bounce">
                      찰칵! 사진 찍기 완료 🎉
                    </div>
                  </div>
                )}

                {/* 3. Drag-and-drop Image Upload target if Camera is disabled or preferred */}
                {!cameraActive && !capturedPhoto && (
                  <div 
                    className={`w-full h-full flex flex-col justify-center items-center p-8 text-center transition-all duration-200 cursor-pointer ${
                      dragActive ? "bg-rose-100/60 border-4 border-dashed border-rose-400" : "bg-transparent"
                    }`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 mb-4 shadow-inner">
                      <Upload className="w-10 h-10 animate-bounce" />
                    </div>
                    <h3 className="font-cute font-bold text-lg text-rose-700">마음 사진 올리기</h3>
                    <p className="text-xs text-rose-600/80 max-w-sm mt-1 mb-4 leading-relaxed font-cute">
                      카메라가 없거나 켜지지 않아도 걱정 마세요!<br />
                      여기로 예쁜 인물 사진을 <strong>드래그 앤 드롭</strong> 하거나 <br />
                      <strong>클릭해서 파일</strong>을 선택해주세요 🌸
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 font-cute rounded-full bg-pink-200/50 text-rose-700 font-bold hover:bg-pink-300/50 transition">
                      <ImageIcon className="w-3.5 h-3.5" /> 컴퓨터에서 사진 가져오기
                    </span>
                  </div>
                )}

                {/* 🎯 Bouncing Big Countdown overlay */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div 
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: [1, 1.4, 1], opacity: 1 }}
                      exit={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.95 }}
                      className="absolute inset-0 flex items-center justify-center bg-pink-900/40 backdrop-blur-sm z-30"
                    >
                      <div className="text-center">
                        <span className="countdown-overlay block text-9xl font-cute font-black text-white">
                          {countdown === 0 ? "♥" : countdown}
                        </span>
                        <p className="text-white/95 font-cute text-xl font-bold tracking-widest mt-4 uppercase animate-pulse">
                          그대로 멈춰라!
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera Error banner in active mode */}
                {cameraActive && cameraError && (
                  <div className="absolute inset-0 bg-rose-50/98 p-6 flex flex-col justify-center items-center text-center z-10 transition-all">
                    <AlertCircle className="w-12 h-12 text-rose-500 mb-3 animate-spin duration-1000" />
                    <p className="text-sm font-cute text-rose-800 max-w-md leading-relaxed">
                      {cameraError}
                    </p>
                    <button 
                      onClick={startCamera}
                      className="mt-4 px-4 py-2 font-cute bg-rose-400 text-white rounded-full text-xs font-bold hover:bg-rose-500 shadow-md transition"
                    >
                      다시 카메라 연결 시도하기 🔄
                    </button>
                  </div>
                )}

              </div>

              {/* Action Trigger Buttons for Left Side */}
              <div className="p-4 bg-rose-50/40 border-t border-pink-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                
                {/* Camera state toggle indicator */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (cameraActive) {
                        stopCamera();
                      } else {
                        startCamera();
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full font-cute font-bold transition flex items-center gap-1.5 ${
                      cameraActive 
                        ? "bg-rose-100 text-rose-700 border border-rose-200" 
                        : "bg-pink-500 text-white shadow-sm hover:bg-pink-600"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {cameraActive ? "카메라 끄기 📴" : "카메라 켜기 거울 🎦"}
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => e.target.files?.[0] && handleUploadedFile(e.target.files[0])}
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 rounded-full font-cute font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> 직접 연출 사진 업로드
                  </button>

                  {cameraActive && (
                    <button 
                      onClick={() => setIsMirrored(!isMirrored)}
                      title="사진기를 좌우반전 시켜요"
                      className={`text-xs px-3 py-1.5 rounded-full font-cute font-bold border transition flex items-center gap-1 ${
                        isMirrored 
                          ? "bg-rose-100/80 text-rose-700 border-rose-200" 
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      좌우 반전 {isMirrored ? "ON 🪞" : "OFF 📷"}
                    </button>
                  )}
                </div>

                {/* Direct Countdown Click Trigger */}
                <div>
                  {!capturedPhoto ? (
                    <button
                      disabled={countdown !== null}
                      onClick={startCountdownSequence}
                      className="w-full sm:w-auto px-6 py-3 font-cute text-base font-bold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5 text-rose-100 animate-spin" style={{ animationDuration: '3s' }} />
                      3, 2, 1 찰칵! 시작하기 ✨
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setAnalysisResult(null);
                        setAnalysisError(null);
                        setUserVote(null);
                        if (cameraActive) startCamera();
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 font-cute text-sm font-bold bg-white text-rose-600 hover:bg-rose-50 rounded-full border-2 border-rose-200 shadow-sm transition hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      다시 사진 찍기
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: AI Analysis & Response Card Area (5 cols on large desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="bg-white/95 rounded-3xl border-4 border-rose-100 shadow-xl overflow-hidden relative min-h-[440px] flex flex-col">
              
              {/* Ribbon Header bar */}
              <div className="bg-rose-50 px-4 py-2 border-b-2 border-rose-100 flex justify-between items-center text-rose-700 font-cute font-semibold">
                <span className="flex items-center gap-1.5">
                  <Smile className="w-4.5 h-4.5 text-rose-500 animate-bounce" />
                  Gemini 마음 돋보기 결과
                </span>
                <span className="text-xs bg-rose-200/60 text-rose-800 px-2 py-0.5 rounded-full">AI REPORT</span>
              </div>

              {/* Central Dynamic Context Area */}
              <div className="p-6 flex-1 flex flex-col justify-center">

                {/* CASE 1: No Image taken/uploaded yet - Show Mascot speaking */}
                {!capturedPhoto && !isAnalyzing && !analysisResult && (
                  <div className="flex flex-col items-center py-2">
                    
                    {/* Cute speech bubble next to/under mascot styled from Design HTML */}
                    <div className="speech-bubble p-5 mb-5 w-full text-left">
                      <h4 className="font-cute font-bold text-[#FF85A1] mb-1.5 flex items-center gap-1.5 justify-center sm:justify-start">
                        <Heart className="w-4 h-4 fill-pink-400 text-pink-400 animate-pulse" />
                        마음이 마스코트의 꿀팁! 🧸
                      </h4>
                      <p className="text-sm text-[#8B5E3C] leading-relaxed font-cute">
                        "안녕! 내 이름은 <strong>마음이</strong>야! 🎀 3초 뒤에 카메라가 찍히면 내가 직접 눈, 코, 입, 그리고 깜찍한 손하트 제스처를 조목조목 사랑스럽게 분석해줄게! 어서 찰칵 시작해봐! 💕"
                      </p>
                    </div>

                    {/* Cute Mascot container with soft shadow */}
                    <div className="relative animate-mascot-bounce select-none mb-3">
                      <img 
                        src="https://i.imgur.com/4LrQlMs.png" 
                        alt="Mind mascot" 
                        className="w-36 h-36 object-contain mix-blend-multiply"
                        referrerPolicy="no-referrer"
                      />
                      {/* Artistic Shadow below image */}
                      <div className="w-24 h-3 bg-pink-200/50 rounded-full blur-sm absolute -bottom-1.5 left-6" />
                    </div>

                    {/* Fun decorative flower indicators */}
                    <div className="flex gap-4 mt-2 text-xs text-[#B08992]/80 font-cute font-semibold">
                      <span>🌸 브이 포즈</span>
                      <span>•</span>
                      <span>🌸 윙크하는 눈</span>
                      <span>•</span>
                      <span>🌸 귀여운 하트</span>
                    </div>

                  </div>
                )}

                {/* CASE 2: Loading State with pulsing step titles */}
                {isAnalyzing && (
                  <div className="text-center py-10 flex flex-col items-center justify-center flex-1">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin" />
                      <Heart className="w-6 h-6 text-rose-400 fill-rose-300 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    
                    <h4 className="font-cute font-bold text-lg text-rose-700 animate-pulse mb-2">
                      내면의 빛을 들여다보고 있어요
                    </h4>
                    
                    <div className="bg-rose-50/80 border border-pink-100 rounded-xl px-5 py-3 max-w-sm">
                      <p className="text-sm font-cute text-rose-800 leading-relaxed animate-cute-fade-in key={loadingStep}">
                        {loadingSteps[loadingStep]}
                      </p>
                    </div>

                    <span className="text-xs text-gray-500 mt-6 font-cute block">
                      잠시만 기다려 주시면 감성 가득 리포트가 소환됩니다... ♥
                    </span>
                  </div>
                )}

                {/* CASE 3: Active error screen if Gemini fails */}
                {analysisError && !isAnalyzing && (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <h4 className="font-cute font-bold text-rose-700 text-lg mb-2">어머나, 오류가 생겼어요!</h4>
                    <p className="text-sm text-gray-600 leading-relaxed bg-rose-50/70 p-3 rounded-xl border border-rose-100 mb-4 max-h-40 overflow-y-auto font-mono text-left">
                      {analysisError}
                    </p>
                    <button 
                      onClick={() => capturedPhoto && analyzePhotoWithGemini(capturedPhoto)}
                      className="px-5 py-2 font-cute text-xs font-bold bg-pink-500 text-white rounded-full hover:bg-pink-600 shadow transition"
                    >
                      분석 다시 시도하기 ♻
                    </button>
                  </div>
                )}

                {/* CASE 4: Heartwarming Results display */}
                {analysisResult && !isAnalyzing && (
                  <div className="flex flex-col gap-4 py-2 animate-cute-fade-in">
                    
                    {/* Emotion Banner badge with warm sparkle icon */}
                    <div className="bg-rose-50 border-2 border-rose-200/60 rounded-2xl p-3 flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💝</span>
                        <span className="text-xs text-rose-800 font-cute font-bold tracking-wider">감정 모드 식별 결과:</span>
                      </div>
                      <span className="font-cute font-bold text-lg bg-white px-3.5 py-1 rounded-full text-rose-600 border border-pink-100 shadow-sm animate-bounce">
                        {analysisResult.emotion}
                      </span>
                    </div>

                    {/* Features Tag Pills */}
                    <div className="flex flex-wrap gap-1.5 justify-center py-1">
                      {analysisResult.tags.map((tag, i) => (
                        <span 
                          key={i} 
                          className="text-xs font-cute font-bold bg-pink-100/60 text-rose-700 px-2.5 py-1 rounded-full border border-pink-200/40 hover:bg-pink-200/50 transition cursor-default"
                        >
                          # {tag}
                        </span>
                      ))}
                    </div>

                    {/* Visual Mascot stamp pointing to description */}
                    <div className="relative flex flex-col items-center w-full mb-1">
                      {/* Speech bubble in Case 4 */}
                      <div className="speech-bubble p-5 mb-5 w-full text-left">
                        <p className="text-sm font-cute text-[#8B5E3C] leading-relaxed">
                          {analysisResult.description}
                        </p>
                      </div>

                      {/* Mascot underneath */}
                      <div className="relative animate-mascot-bounce select-none">
                        <img 
                          src="https://i.imgur.com/4LrQlMs.png" 
                          alt="Mind mascot" 
                          className="w-24 h-24 object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                        <div className="w-16 h-2.5 bg-pink-200/50 rounded-full blur-sm absolute -bottom-1 left-4" />
                      </div>
                    </div>

                    {/* Dialog confirming question (Is that right? / 맞나요? 느낌) */}
                    <div className="bg-gradient-to-r from-pink-500/5 to-rose-500/5 border border-pink-200 rounded-2xl p-3 text-center sm:text-left shadow-sm">
                      <p className="text-xs font-cute text-rose-800 italic leading-relaxed text-center font-bold">
                        {analysisResult.isThatRight}
                      </p>

                      {/* Interactive Sweet Response Stamper */}
                      <div className="flex items-center justify-center gap-4 mt-2.5">
                        <button 
                          onClick={() => {
                            playSynthBeep(784, 0.15);
                            setUserVote(true);
                          }}
                          className={`px-4 py-1.5 rounded-full font-cute text-xs font-bold transition flex items-center gap-1 border ${
                            userVote === true 
                              ? "bg-rose-500 text-white border-rose-500 shadow" 
                              : "bg-white text-rose-700 hover:bg-rose-50 border-rose-200"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" /> 맞아요! 🥰
                        </button>

                        <button 
                          onClick={() => {
                            playSynthBeep(440, 0.15);
                            setUserVote(false);
                          }}
                          className={`px-4 py-1.5 rounded-full font-cute text-xs font-bold transition flex items-center gap-1 border ${
                            userVote === false 
                              ? "bg-gray-700 text-white border-gray-700 shadow" 
                              : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" /> 조금 달라요 🤔
                        </button>
                      </div>
                    </div>

                    {/* Save to Diary core control button */}
                    <button
                      onClick={saveDiaryEntry}
                      className="mt-2 w-full py-3 btn-pastel text-white font-cute font-bold rounded-2xl hover:-translate-y-0.5 active:translate-y-0 transition flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-5 h-5 text-rose-100" />
                      오늘의 감정기록 보관함에 저장하기 💾
                    </button>

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* 🎀 BOTTOM SECTION: Polaroid Album Scrapbook Area */}
        <section className="mt-12 mb-8 bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-pink-100 shadow-lg relative">
          
          {/* Card subtle background decor */}
          <div className="absolute top-2 right-4 text-3xl opacity-25 pointer-events-none select-none">🧸✨🎈</div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b-2 border-rose-100/50 pb-3 gap-3">
            <h2 className="text-2xl font-cute font-bold text-rose-800 flex items-center gap-1.5">
              <span>🎀</span>
              그날의 마음 보관함
              <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full">
                이전 기록 ({records.length}개)
              </span>
            </h2>

          </div>

          {records.length === 0 ? (
            /* Empty state placeholder drawing */
            <div className="py-12 text-center rounded-2xl border-2 border-dashed border-rose-200/40 bg-pink-50/20 max-w-lg mx-auto">
              <span className="text-5xl block mb-3">📂</span>
              <h3 className="font-cute font-bold text-rose-700 text-base">아직 마음 일기가 비여있어요</h3>
              <p className="text-xs text-rose-600/85 font-cute mt-1">
                위 카메라 거울을 이용해 예쁜 포즈를 짓고 사진을 찍어<br />
                오늘 처음으로 느끼는 감성 일기를 저장해 주세요! ♥
              </p>
            </div>
          ) : (
            /* Scrapbook polaroids grid */
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {records.map((record, index) => {
                // Alternately tilt layout to mimic hand placed polaroids!
                const rotationDeg = index % 3 === 0 ? "-2deg" : index % 3 === 1 ? "1.5deg" : "0.5deg";
                
                return (
                  <motion.div
                    key={record.id}
                    whileHover={{ scale: 1.05, rotate: "0deg", zIndex: 10 }}
                    onClick={() => {
                      playSynthBeep(523, 0.1);
                      setSelectedRecord(record);
                    }}
                    style={{ rotate: rotationDeg }}
                    className="bg-white p-3 pb-6 rounded-sm shadow-md border border-gray-100 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col relative group"
                  >
                    {/* Retro tape decor */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-rose-200/60 backdrop-blur-sm text-[10px] text-rose-800 font-cute font-bold px-3 py-1 rounded shadow-sm rotate-[-3deg] select-none pointer-events-none">
                      마음 기록 📌
                    </div>

                    {/* Mirrored photo matching preview */}
                    <div className="aspect-[4/3] w-full bg-rose-50 overflow-hidden rounded relative mb-3 mt-1.5">
                      <img 
                        src={record.photoUrl} 
                        alt="Scrapbook mirror snapshot" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Voting thumb bubble if exist */}
                      {record.isConfirmed !== null && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-cute font-bold bg-white text-rose-600 border border-rose-200 shadow-sm">
                          {record.isConfirmed ? "맞아요! 🥰" : "이견 있음 🤔"}
                        </div>
                      )}
                    </div>

                    {/* Polaroid Bottom captions */}
                    <div className="text-center font-cute text-xs mt-1">
                      <div className="font-bold text-rose-600 truncate mb-1">
                        {record.emotion}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3 text-rose-300" />
                        {record.timestamp.split(" ")[0]}
                      </div>
                    </div>

                    {/* Quick Delete stamp inside polaroid */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecord(record.id, e);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/95 hover:bg-rose-600 text-rose-500 hover:text-white border-2 border-pink-100 rounded-full transition-all duration-150 shadow-sm z-30"
                      title="보관함 카드 지우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </motion.div>
                );
              })}
            </div>
          )}

        </section>

      </div>

      {/* 🔮 LANDSCAPE RECORD EXPANDED DETAIL OVERLAY MODAL */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl border-4 border-rose-100 shadow-2xl max-w-xl w-full overflow-hidden relative"
            >
              
              {/* Decorative top pink bar */}
              <div className="bg-gradient-to-r from-pink-100 to-rose-200 px-6 py-3 border-b border-pink-100 flex items-center justify-between">
                <span className="font-cute font-bold text-rose-800 flex items-center gap-1">
                  <span>📅</span> {selectedRecord.timestamp} 마음 일기 카드
                </span>
                
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 px-2.5 rounded-full bg-white/75 text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition text-sm font-bold"
                >
                  <X className="w-4 h-4 inline" /> 닫기
                </button>
              </div>

              {/* Modal Core Area */}
              <div className="p-6 flex flex-col md:flex-row gap-6">
                
                {/* Visual Snapshot panel */}
                <div className="w-full md:w-1/2 flex flex-col gap-2">
                  <div className="aspect-[4/3] bg-rose-50 rounded-xl overflow-hidden shadow border border-gray-100 relative">
                    <img 
                      src={selectedRecord.photoUrl} 
                      alt="Historic snapshot mirror mode" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Status confirms indicator */}
                  {selectedRecord.isConfirmed !== null && (
                    <div className="text-center font-cute text-xs bg-rose-50/70 py-1.5 rounded-lg border border-pink-100 text-rose-800">
                      공감 스탬프: <span className="font-bold">{selectedRecord.isConfirmed ? "네, 제 마음이 맞아요! 🥰" : "실제 마음과 살짝 달라요 🤔"}</span>
                    </div>
                  )}
                </div>

                {/* Narrative core information */}
                <div className="w-full md:w-1/2 flex flex-col gap-3 text-left">
                  
                  {/* Emotion badge summary */}
                  <div>
                    <span className="text-[10px] text-gray-400 font-cute font-bold tracking-wider block uppercase mb-1">
                      분석된 기분 키워드
                    </span>
                    <span className="inline-block font-cute font-bold text-base bg-pink-100 text-rose-700 px-3 py-1 rounded-full border border-pink-200">
                      {selectedRecord.emotion}
                    </span>
                  </div>

                  {/* Character visual Tags */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedRecord.tags.map((tag, i) => (
                      <span key={i} className="text-[10.5px] font-cute bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full">
                        # {tag}
                      </span>
                    ))}
                  </div>

                  {/* Complete descriptions text */}
                  <div className="bg-rose-50/40 p-4 rounded-xl border border-pink-100/60 mt-1">
                    <p className="text-xs font-cute text-rose-900 leading-relaxed">
                      {selectedRecord.description}
                    </p>
                    <p className="text-xs font-cute text-rose-600/90 italic font-bold mt-2 pt-2 border-t border-rose-200/30">
                      {selectedRecord.isThatRight}
                    </p>
                  </div>

                </div>

              </div>

              {/* Modal footer controls */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    deleteRecord(selectedRecord.id);
                  }}
                  className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 text-xs font-cute font-bold rounded-xl border border-rose-200 transition flex items-center gap-1 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  보관함에서 삭제하기
                </button>

                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-cute text-sm font-bold rounded-xl shadow-md transition"
                >
                  확인 완료
                </button>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ CUSTOM DELETE CONFIRMATION MODAL (No window.confirm!) */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl border-4 border-rose-200 shadow-2xl max-w-sm w-full p-6 text-center relative"
            >
              <div className="text-5xl mb-3 animate-bounce" style={{ animationDuration: "2.5s" }}>🧸</div>
              <h3 className="font-cute font-bold text-lg text-rose-800 mb-2">마음 일기 기록 지우기</h3>
              <p className="text-sm font-cute text-rose-600/95 leading-relaxed mb-6">
                이 소중한 그날의 마음 기록 일기 카드를<br />
                보관함에서 정말로 지우시겠어요?
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-cute font-bold text-sm rounded-xl transition"
                >
                  아니오 🎀
                </button>
                <button
                  onClick={confirmDeleteRecord}
                  className="flex-1 py-1.5 bg-gradient-to-r from-red-400 to-rose-500 hover:brightness-105 text-white font-cute font-bold text-sm rounded-xl transition shadow-md"
                >
                  지울래요! 🗑️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
