import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, FileText, FileIcon, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  title: string;
  acceptTypes: string;
  uploadEndpoint: string;
  onSuccess?: (data: any) => void;
  meetingId?: number;
}

export function FileUpload({
  title,
  acceptTypes,
  uploadEndpoint,
  onSuccess,
  meetingId,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadSuccess(false);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadSuccess(false);
    setUploadError(null);

    // Create form data
    const formData = new FormData();
    formData.append(acceptTypes.includes("audio") || acceptTypes.includes("video") ? "recording" : "transcript", file);
    
    // Add meeting ID if provided
    if (meetingId) {
      formData.append("meetingId", meetingId.toString());
    }

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 5;
          return newProgress < 90 ? newProgress : prevProgress;
        });
      }, 100);

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, the browser will set it with the boundary
        credentials: "include",
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      setProgress(100);
      setUploadSuccess(true);
      
      const data = await response.json();
      
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully",
        variant: "default",
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadSuccess(false);
      setUploadError(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadSuccess(false);
    setUploadError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-4
            ${uploadSuccess ? "border-green-500 bg-green-50" : ""}
            ${uploadError ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {!file && !uploading && !uploadSuccess ? (
            <>
              <UploadCloud className="h-12 w-12 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported files: {acceptTypes.replace(/\./g, "").toUpperCase()}
                </p>
              </div>
            </>
          ) : uploadSuccess ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-700">Upload successful!</p>
              <p className="text-xs text-gray-500">{file?.name}</p>
            </div>
          ) : uploadError ? (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm font-medium text-red-700">Upload failed</p>
              <p className="text-xs text-red-500">{uploadError}</p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {acceptTypes.includes("audio") ? (
                  <FileIcon className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileText className="h-8 w-8 text-blue-500" />
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{file?.name}</p>
                  <p className="text-xs text-gray-500">
                    {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : ""}
                  </p>
                </div>
              </div>
              {uploading && (
                <>
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-xs text-center text-gray-500">
                    Uploading... {progress}%
                  </p>
                </>
              )}
            </div>
          )}
          <Input
            type="file"
            ref={fileInputRef}
            accept={acceptTypes}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {file || uploadSuccess || uploadError ? (
          <>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={uploading}
            >
              Reset
            </Button>
            {!uploadSuccess && (
              <Button
                onClick={handleUpload}
                disabled={uploading || !file}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            )}
          </>
        ) : (
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            Select File
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}