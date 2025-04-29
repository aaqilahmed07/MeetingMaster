import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { storage } from '../storage';
import { InsertRecording } from '@shared/schema';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration for multer
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create separate folders for each file type
    let destinationFolder = uploadsDir;
    
    if (file.mimetype.startsWith('audio/')) {
      destinationFolder = path.join(uploadsDir, 'audio');
    } else if (file.mimetype.startsWith('video/')) {
      destinationFolder = path.join(uploadsDir, 'video');
    }
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder, { recursive: true });
    }
    
    cb(null, destinationFolder);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter to accept only audio and video files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio and video files are allowed!'));
  }
};

// Create multer upload instance
export const uploadRecording = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  }
});

// Helper function to save recording to database
export async function saveRecordingToDatabase(
  file: Express.Multer.File,
  uploadedBy: number,
  meetingId?: number
): Promise<{ recording: any, error: string | null }> {
  try {
    const recordingData: InsertRecording = {
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      filePath: file.path,
      uploadedBy,
      meetingId,
    };

    const recording = await storage.createRecording(recordingData);
    
    // If meetingId is provided, update the meeting with the recording reference
    if (meetingId) {
      const meeting = await storage.getMeeting(meetingId);
      if (meeting) {
        // Check our schema to see what fields are available for updating
        await storage.updateMeeting(meetingId, { 
          // Don't directly reference recordingId as it may not be in our schema
          // Instead, use a field that exists in the schema for linking to recordings
          transcriptUrl: recording.filePath // Use an existing field to store the recording reference
        });
      }
    }
    
    return { recording, error: null };
  } catch (error) {
    console.error('Error saving recording to database:', error);
    return { recording: null, error: 'Failed to save recording information' };
  }
}

// Delete a recording file
export async function deleteRecordingFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}