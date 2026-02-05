import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  MediaFile,
  Project,
  Timeline,
  Track,
  Clip,
  ProcessingState,
  ImageAdjustments,
  DEFAULT_IMAGE_ADJUSTMENTS,
} from "@/types";

interface EditorState {
  // Project
  project: Project | null;
  isDirty: boolean;

  // Media Library
  mediaFiles: MediaFile[];
  selectedMediaId: string | null;

  // Timeline
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  zoom: number;

  // Image Editor
  currentImage: MediaFile | null;
  imageAdjustments: ImageAdjustments;
  originalImageData: ImageData | null;

  // Processing
  processingState: ProcessingState;
  ffmpegLoaded: boolean;

  // UI
  activeTab: "editor" | "timeline" | "image";
  sidebarOpen: boolean;
  darkMode: boolean;

  // Actions
  // Project actions
  createProject: (name: string) => void;
  loadProject: (project: Project) => void;
  saveProject: () => Project | null;
  setProjectName: (name: string) => void;

  // Media actions
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  selectMedia: (id: string | null) => void;

  // Timeline actions
  addTrack: (type: Track["type"]) => void;
  removeTrack: (id: string) => void;
  addClipToTrack: (trackId: string, mediaId: string, startTime: number) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;

  // Image editor actions
  setCurrentImage: (image: MediaFile | null) => void;
  setImageAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  resetImageAdjustments: () => void;
  setOriginalImageData: (data: ImageData | null) => void;

  // Processing actions
  setProcessingState: (state: Partial<ProcessingState>) => void;
  setFfmpegLoaded: (loaded: boolean) => void;

  // UI actions
  setActiveTab: (tab: EditorState["activeTab"]) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

const createDefaultProject = (name: string): Project => ({
  id: uuidv4(),
  name,
  createdAt: new Date(),
  updatedAt: new Date(),
  timeline: {
    tracks: [],
    duration: 0,
    currentTime: 0,
  },
  settings: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    outputFormat: "mp4",
  },
});

const defaultAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  project: null,
  isDirty: false,
  mediaFiles: [],
  selectedMediaId: null,
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  selectedTrackId: null,
  zoom: 1,
  currentImage: null,
  imageAdjustments: { ...defaultAdjustments },
  originalImageData: null,
  processingState: {
    status: "idle",
    progress: 0,
  },
  ffmpegLoaded: false,
  activeTab: "editor",
  sidebarOpen: true,
  darkMode: false,

  // Project actions
  createProject: (name) => {
    const project = createDefaultProject(name);
    set({ project, isDirty: false, mediaFiles: [] });
  },

  loadProject: (project) => {
    set({ project, isDirty: false });
  },

  saveProject: () => {
    const { project } = get();
    if (project) {
      const updatedProject = {
        ...project,
        updatedAt: new Date(),
      };
      set({ project: updatedProject, isDirty: false });
      return updatedProject;
    }
    return null;
  },

  setProjectName: (name) => {
    set((state) => ({
      project: state.project ? { ...state.project, name } : null,
      isDirty: true,
    }));
  },

  // Media actions
  addMediaFile: (file) => {
    set((state) => ({
      mediaFiles: [...state.mediaFiles, file],
      isDirty: true,
    }));
  },

  removeMediaFile: (id) => {
    set((state) => ({
      mediaFiles: state.mediaFiles.filter((f) => f.id !== id),
      selectedMediaId:
        state.selectedMediaId === id ? null : state.selectedMediaId,
      isDirty: true,
    }));
  },

  selectMedia: (id) => {
    set({ selectedMediaId: id });
  },

  // Timeline actions
  addTrack: (type) => {
    set((state) => {
      if (!state.project) return state;

      const newTrack: Track = {
        id: uuidv4(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${
          state.project.timeline.tracks.length + 1
        }`,
        type,
        clips: [],
        muted: false,
        locked: false,
        visible: true,
      };

      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            tracks: [...state.project.timeline.tracks, newTrack],
          },
        },
        isDirty: true,
      };
    });
  },

  removeTrack: (id) => {
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            tracks: state.project.timeline.tracks.filter((t) => t.id !== id),
          },
        },
        selectedTrackId:
          state.selectedTrackId === id ? null : state.selectedTrackId,
        isDirty: true,
      };
    });
  },

  addClipToTrack: (trackId, mediaId, startTime) => {
    set((state) => {
      if (!state.project) return state;

      const media = state.mediaFiles.find((f) => f.id === mediaId);
      if (!media) return state;

      const newClip: Clip = {
        id: uuidv4(),
        mediaId,
        name: media.name,
        startTime,
        duration: media.duration || 5,
        inPoint: 0,
        outPoint: media.duration || 5,
        effects: [],
      };

      const updatedTracks = state.project.timeline.tracks.map((track) => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: [...track.clips, newClip],
          };
        }
        return track;
      });

      // Update timeline duration
      const maxEndTime = Math.max(
        ...updatedTracks.flatMap((t) =>
          t.clips.map((c) => c.startTime + c.duration)
        ),
        0
      );

      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            tracks: updatedTracks,
            duration: maxEndTime,
          },
        },
        isDirty: true,
      };
    });
  },

  removeClip: (trackId, clipId) => {
    set((state) => {
      if (!state.project) return state;

      const updatedTracks = state.project.timeline.tracks.map((track) => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== clipId),
          };
        }
        return track;
      });

      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            tracks: updatedTracks,
          },
        },
        selectedClipId:
          state.selectedClipId === clipId ? null : state.selectedClipId,
        isDirty: true,
      };
    });
  },

  updateClip: (trackId, clipId, updates) => {
    set((state) => {
      if (!state.project) return state;

      const updatedTracks = state.project.timeline.tracks.map((track) => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id === clipId) {
                return { ...clip, ...updates };
              }
              return clip;
            }),
          };
        }
        return track;
      });

      return {
        project: {
          ...state.project,
          timeline: {
            ...state.project.timeline,
            tracks: updatedTracks,
          },
        },
        isDirty: true,
      };
    });
  },

  selectClip: (clipId) => {
    set({ selectedClipId: clipId });
  },

  selectTrack: (trackId) => {
    set({ selectedTrackId: trackId });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(10, zoom)) });
  },

  // Image editor actions
  setCurrentImage: (image) => {
    set({
      currentImage: image,
      imageAdjustments: { ...defaultAdjustments },
      originalImageData: null,
    });
  },

  setImageAdjustments: (adjustments) => {
    set((state) => ({
      imageAdjustments: { ...state.imageAdjustments, ...adjustments },
    }));
  },

  resetImageAdjustments: () => {
    set({ imageAdjustments: { ...defaultAdjustments } });
  },

  setOriginalImageData: (data) => {
    set({ originalImageData: data });
  },

  // Processing actions
  setProcessingState: (state) => {
    set((prev) => ({
      processingState: { ...prev.processingState, ...state },
    }));
  },

  setFfmpegLoaded: (loaded) => {
    set({ ffmpegLoaded: loaded });
  },

  // UI actions
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  toggleDarkMode: () => {
    set((state) => {
      const newDarkMode = !state.darkMode;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", newDarkMode);
      }
      return { darkMode: newDarkMode };
    });
  },
}));
