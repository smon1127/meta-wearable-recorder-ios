export interface Recording {
  id: string;
  title: string;
  duration: number;
  timestamp: string;
  thumbnail: string;
  resolution: string;
  fps: number;
  fileSize: number;
  audioSource: string;
  deviceType: 'rayban-meta' | 'phone-camera';
}
