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
}

export const mockRecordings: Recording[] = [
  {
    id: 'rec-001',
    title: 'Morning Walk',
    duration: 187,
    timestamp: '2026-02-20T09:15:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=400&h=300&fit=crop',
    resolution: '1080p',
    fps: 30,
    fileSize: 245,
    audioSource: 'Rode VideoMicro II',
  },
  {
    id: 'rec-002',
    title: 'Coffee Shop Vlog',
    duration: 342,
    timestamp: '2026-02-19T14:30:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
    resolution: '4K',
    fps: 30,
    fileSize: 890,
    audioSource: 'Shure MV88+',
  },
  {
    id: 'rec-003',
    title: 'Street Photography',
    duration: 95,
    timestamp: '2026-02-19T11:00:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop',
    resolution: '1080p',
    fps: 60,
    fileSize: 156,
    audioSource: 'Built-in Mic',
  },
  {
    id: 'rec-004',
    title: 'Sunset Timelapse',
    duration: 60,
    timestamp: '2026-02-18T18:45:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&h=300&fit=crop',
    resolution: '4K',
    fps: 30,
    fileSize: 320,
    audioSource: 'Ray-Ban Meta Built-in',
  },
  {
    id: 'rec-005',
    title: 'Interview Setup',
    duration: 1205,
    timestamp: '2026-02-18T10:00:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=300&fit=crop',
    resolution: '1080p',
    fps: 30,
    fileSize: 1580,
    audioSource: 'Rode VideoMicro II',
  },
  {
    id: 'rec-006',
    title: 'Park Run',
    duration: 420,
    timestamp: '2026-02-17T07:30:00Z',
    thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
    resolution: '720p',
    fps: 60,
    fileSize: 380,
    audioSource: 'AirPods Pro',
  },
];
