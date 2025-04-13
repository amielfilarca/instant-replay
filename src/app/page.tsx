"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [bufferDuration, setBufferDuration] = useState(15); // Default buffer duration
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [bufferedChunks, setBufferedChunks] = useState<Blob[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const getCameraStream = async () => {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(videoStream);
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    getCameraStream();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!stream) return;

    const startRecording = () => {
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setBufferedChunks((prev) => [...prev, event.data]);
        }
      };
      recorder.onstop = () => {
        console.log("Recording stopped");
      };
      recorder.start();
      setRecording(true);
      console.log("Recording started");
    };

    const stopRecording = () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
        setRecording(false);
      }
    };

    if (recording) {
      startRecording();
    } else {
      stopRecording();
    }

    return () => {
      stopRecording();
    };
  }, [recording, stream]);

  useEffect(() => {
    // Trim buffer based on duration
    const trimBuffer = () => {
      if (bufferedChunks.length === 0) return;

      let totalDuration = 0;
      const chunksToKeep: Blob[] = [];

      for (let i = bufferedChunks.length - 1; i >= 0; i--) {
        const chunk = bufferedChunks[i];
        totalDuration += chunk.size; // Approximation: chunk.size as proxy for duration
        if (totalDuration <= bufferDuration * 100000) {
          // Approximation factor
          chunksToKeep.unshift(chunk);
        } else {
          break;
        }
      }
      setBufferedChunks(chunksToKeep);
    };

    trimBuffer();
  }, [bufferDuration, bufferedChunks]);

  const handleSaveRecording = () => {
    if (bufferedChunks.length === 0) return;

    const blob = new Blob(bufferedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = new Date().toISOString().replace(/:/g, "-");
    a.download = `replay-${filename}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
      <h1 className="text-2xl font-bold mb-4 text-primary">Instant Replay</h1>

      <video
        ref={videoRef}
        className="w-full max-w-2xl rounded-lg shadow-md"
        autoPlay
        muted
      />

      <div className="flex space-x-4 mt-4">
        <Button onClick={() => setRecording(!recording)} disabled={!stream}>
          {recording ? "Stop Recording" : "Start Recording"}
        </Button>
        <Button
          onClick={handleSaveRecording}
          disabled={bufferedChunks.length === 0}
        >
          Save Recording
        </Button>
        <Button variant="ghost" onClick={toggleSettings}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {settingsOpen && (
        <div className="mt-4 p-4 rounded-lg shadow-md bg-card w-full max-w-md">
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <div className="flex items-center space-x-2">
            <label htmlFor="bufferDuration" className="text-sm font-medium">
              Buffer Duration (seconds):
            </label>
            <Slider
              id="bufferDuration"
              defaultValue={[bufferDuration]}
              max={30}
              min={5}
              step={1}
              onValueChange={(value) => setBufferDuration(value[0])}
            />
            <span>{bufferDuration}</span>
          </div>
        </div>
      )}
    </div>
  );
}
