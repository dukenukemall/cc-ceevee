"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { DropArea } from "./DropArea";
import { UploadedFile } from "./UploadedFile";
import { ScanResults } from "@/components/scan/ScanResults";
import { ScanSkeleton } from "@/components/scan/ScanSkeleton";
import { scanCv } from "@/actions/scanCv";
import type { ScanWithResults } from "@/types/scan";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanWithResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }
    console.log("[UploadZone] File accepted:", selectedFile.name, selectedFile.size);
    setFile(selectedFile);
    setScanResult(null);
    toast.success(`${selectedFile.name} ready to scan`);
  }, []);

  const handleScan = async () => {
    if (!file || isScanning) return;
    setIsScanning(true);
    console.log("[UploadZone] Starting scan for:", file.name);

    const formData = new FormData();
    formData.append("file", file);

    const result = await scanCv(formData);

    if (result.error) {
      console.error("[UploadZone] Scan error:", result.error);
      toast.error(result.error);
    } else if (result.data) {
      setScanResult(result.data);
      toast.success("Scan complete!");
    }

    setIsScanning(false);
  };

  const resetAll = () => {
    setFile(null);
    setScanResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (isScanning) return <ScanSkeleton />;
  if (scanResult) return <ScanResults scan={scanResult} onReset={resetAll} />;
  if (file) return <UploadedFile file={file} onClear={resetAll} onScan={handleScan} isScanning={isScanning} />;

  return (
    <DropArea
      isDragging={isDragging}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onBrowse={() => inputRef.current?.click()}
      inputRef={inputRef}
      onInputChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
    />
  );
}
