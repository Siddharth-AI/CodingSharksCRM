"use client";

import React, { useRef, useState, useEffect } from "react";
import { useAppSelector } from "@/hooks/redux";
import { selectAuthToken } from "@/store/slices/authSlice";

interface MediaAsset {
  id: string;
  type: "image" | "video";
  url: string;
  file_name: string | null;
  created_at: string;
}

interface MediaUploadProps {
  label: string;
  type: "image" | "video";
  currentUrl?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const ACCEPT = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  video: "video/mp4,video/quicktime,video/avi,video/x-matroska,video/3gpp",
};

const MAX_SIZE = {
  image: 10 * 1024 * 1024, // 10 MB
  video: 100 * 1024 * 1024, // 100 MB
};

export const MediaUpload: React.FC<MediaUploadProps> = ({
  label,
  type,
  currentUrl,
  onUpload,
  onRemove,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upload" | "existing">("upload");
  const [existingMedia, setExistingMedia] = useState<MediaAsset[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const token = useAppSelector(selectAuthToken);

  // Load existing media when switching to existing tab
  useEffect(() => {
    if (tab === "existing" && existingMedia.length === 0 && !loadingMedia) {
      loadExistingMedia();
    }
  }, [tab]);

  const loadExistingMedia = async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/media/list?type=${type}&limit=100`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setExistingMedia(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load existing media:", err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > MAX_SIZE[type]) {
      setError(
        `File too large. Max size: ${type === "video" ? "100MB" : "10MB"}`,
      );
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || "Upload failed");
      onUpload(json.data.url);
      // Refresh media list after successful upload
      setExistingMedia([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectExisting = (mediaUrl: string) => {
    onUpload(mediaUrl);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}{" "}
        <span className="text-gray-400 font-normal text-xs">(optional)</span>
      </label>

      {currentUrl ? (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-start gap-3">
            {/* Preview */}
            <div className="shrink-0">
              {type === "image" ? (
                <img
                  src={currentUrl}
                  alt="Uploaded"
                  className="w-24 h-24 object-cover rounded-md border"
                />
              ) : (
                <video
                  src={currentUrl}
                  className="w-24 h-24 object-cover rounded-md border"
                  controls={false}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">
                {currentUrl.split("/").pop()}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab("upload");
                    inputRef.current?.click();
                  }}
                  disabled={disabled || uploading}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50">
                  Replace
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={disabled || uploading}
                  className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                tab === "upload"
                  ? "bg-blue-50 text-blue-700 border-r border-gray-200"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-r border-gray-200"
              }`}>
              📤 Upload New
            </button>
            <button
              type="button"
              onClick={() => setTab("existing")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                tab === "existing"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}>
              📚 Use Existing
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
              {error}
            </div>
          )}

          {/* Upload Tab */}
          {tab === "upload" && (
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                uploading
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => inputRef.current?.click()}>
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl mb-1">
                    {type === "image" ? "🖼️" : "🎬"}
                  </div>
                  <p className="text-sm text-gray-600">
                    Click to upload {type === "image" ? "image" : "video"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {type === "image"
                      ? "JPG, PNG, GIF, WebP — max 10MB"
                      : "MP4, MOV, AVI, MKV — max 100MB"}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Existing Media Tab */}
          {tab === "existing" && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              {loadingMedia ? (
                <div className="flex items-center justify-center gap-2 text-gray-600 py-4">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm">Loading media library...</span>
                </div>
              ) : existingMedia.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No {type}s uploaded yet. Upload one to get started.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {existingMedia.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => handleSelectExisting(media.url)}
                      className="flex flex-col items-center gap-1 p-2 rounded border border-gray-300 hover:border-blue-400 hover:shadow cursor-pointer transition-all">
                      {type === "image" ? (
                        <img
                          src={media.url}
                          alt={media.file_name || "Media"}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-12 h-12 object-cover rounded"
                          controls={false}
                        />
                      )}
                      <span className="text-xs text-gray-500 truncate w-full text-center">
                        {media.file_name
                          ? media.file_name.substring(0, 12)
                          : "File"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(media.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};
