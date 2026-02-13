"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { DropArea } from "./DropArea";
import { UploadedFile } from "./UploadedFile";

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      console.log("[UploadZone] Rejected file type:", selectedFile.type);
      return;
    }
    console.log("[UploadZone] File accepted:", selectedFile.name);
    setFile(selectedFile);
    toast.success(`${selectedFile.name} uploaded successfully`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    console.log("[UploadZone] File cleared");
  };

  if (file) {
    return <UploadedFile file={file} onClear={clearFile} />;
  }

  return (
    <DropArea
      isDragging={isDragging}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onBrowse={() => inputRef.current?.click()}
      inputRef={inputRef}
      onInputChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
    />
  );
}
