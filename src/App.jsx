import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://cloud-storage-backend-tzvw.onrender.com/api";

const formatSize = (bytes) => {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb < 1024 ? `${mb.toFixed(2)} MB` : `${(mb / 1024).toFixed(2)} GB`;
};

export default function App() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [selected, setSelected] = useState([]);
  const [newFolder, setNewFolder] = useState("");
  const [totalSize, setTotalSize] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20);

  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");

  const [zipLoading, setZipLoading] = useState(false);

  /* =========================
     LOAD DATA
  ========================= */

  const loadFolders = async () => {
    const res = await axios.get(`${API}/folders/`);
    setFolders(res.data);
  };

  const loadFiles = async (folderId = null) => {
    const url = folderId
      ? `${API}/files/?folder=${folderId}`
      : `${API}/files/`;

    const res = await axios.get(url);
    setFiles(res.data);

    const total = res.data.reduce((s, f) => s + (f.size || 0), 0);
    setTotalSize(total);

    setSelected([]);
    setVisibleCount(20);
  };

  useEffect(() => {
    loadFolders();
    loadFiles();
  }, []);

  /* =========================
     UPLOAD (PARALLEL)
  ========================= */

  const uploadFiles = async (filesToUpload) => {
    const MAX_PARALLEL = 3;
    let index = 0;

    const uploadSingle = async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      if (currentFolder) formData.append("folder", currentFolder.id);

      await axios.post(`${API}/upload/`, formData, {
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
          setCurrentFile(file.name);
        },
      });
    };

    while (index < filesToUpload.length) {
      const batch = filesToUpload.slice(index, index + MAX_PARALLEL);
      await Promise.all(batch.map(uploadSingle));
      index += MAX_PARALLEL;
    }

    setProgress(0);
    setCurrentFile("");
    loadFiles(currentFolder?.id || null);
  };

  /* =========================
     FOLDERS
  ========================= */

  const createFolder = async () => {
    if (!newFolder) return;
    await axios.post(`${API}/folders/create/`, { name: newFolder });
    setNewFolder("");
    loadFolders();
  };

  /* =========================
     SELECTION
  ========================= */

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.length} files?`)) return;
    for (let id of selected) {
      await axios.delete(`${API}/files/${id}/`);
    }
    loadFiles(currentFolder?.id || null);
  };

  const bulkDownload = async () => {
    const res = await axios.post(
      `${API}/files/download-zip/`,
      { files: selected },
      { responseType: "blob" }
    );

    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "files.zip";
    a.click();
  };

  /* =========================
     FAST ZIP (CLOUDINARY)
  ========================= */

  const generateFastZips = async () => {
    try {
      setZipLoading(true);
      const res = await axios.post(
        `${API}/files/create-cloudinary-zip/`
      );

      alert("Allow multiple downloads once.");
      for (let z of res.data.zips || []) {
        const a = document.createElement("a");
        a.href = z.download_url;
        a.download = `${z.account}.zip`;
        a.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    } finally {
      setZipLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <div style={{ padding: 16 }}>
      <h2>My Cloud Storage</h2>
      <p><b>Used:</b> {formatSize(totalSize)}</p>

      {/* FOLDERS */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => loadFiles()}>Home</button>
        {folders.map((f) => (
          <button
            key={f.id}
            style={{ marginLeft: 8 }}
            onClick={() => {
              setCurrentFolder(f);
              loadFiles(f.id);
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* CREATE FOLDER */}
      <div style={{ marginBottom: 15 }}>
        <input
          placeholder="📁 New folder"
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
        />
        <button onClick={createFolder}>Create</button>
      </div>

      {/* UPLOAD */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploadFiles([...e.dataTransfer.files]);
        }}
        style={{
          border: "2px dashed #aaa",
          padding: 25,
          borderRadius: 10,
          background: dragging ? "#eef6ff" : "#fafafa",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <h4>📤 Upload</h4>
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf"
          onChange={(e) => uploadFiles([...e.target.files])}
        />
      </div>

      {currentFile && (
        <div style={{ marginBottom: 10 }}>
          Uploading <b>{currentFile}</b> ({progress}%)
          <div style={{ height: 6, background: "#ddd" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#4caf50",
              }}
            />
          </div>
        </div>
      )}

      {/* FAST ZIP */}
      <button onClick={generateFastZips} disabled={zipLoading}>
        {zipLoading ? "Preparing ZIPs..." : "⚡ Fast Download All Images"}
      </button>

      {/* BULK BAR */}
      {selected.length > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 10,
            background: "#fff",
            padding: 10,
            marginTop: 15,
            borderRadius: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <b>{selected.length} selected</b><br />
          <button onClick={bulkDownload}>⬇ ZIP</button>
          <button style={{ color: "red" }} onClick={bulkDelete}>
            🗑 Delete
          </button>
        </div>
      )}

      <hr />

      {/* FILE GRID (MOBILE FRIENDLY) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {files.slice(0, visibleCount).map((f) => {
          const active = selected.includes(f.id);
          return (
            <div
              key={f.id}
              onClick={() => toggleSelect(f.id)}
              style={{
                border: active ? "3px solid #2196f3" : "1px solid #ccc",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
              }}
            >
              {f.type === "image" && (
                <img
                  src={f.file.replace("/upload/", "/upload/w_300,q_auto/")}
                  style={{
                    width: "100%",
                    borderRadius: 6,
                    opacity: active ? 0.7 : 1,
                  }}
                />
              )}

              {f.type === "video" && (
                <video src={f.file} controls width="100%" />
              )}

              <p style={{ fontSize: 13 }}>{f.name}</p>
              <small>📦 {f.storage_account?.name}</small>
            </div>
          );
        })}
      </div>

      {visibleCount < files.length && (
        <button
          onClick={() => setVisibleCount((c) => c + 20)}
          style={{ marginTop: 20 }}
        >
          Load more ({files.length - visibleCount})
        </button>
      )}
    </div>
  );
}
