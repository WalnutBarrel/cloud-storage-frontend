import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://cloud-storage-backend-tzvw.onrender.com/api";

const formatSize = (bytes) => {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb < 1024
    ? `${mb.toFixed(2)} MB`
    : `${(mb / 1024).toFixed(2)} GB`;
};

export default function App() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const [dragging, setDragging] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  /* LOAD FOLDERS */
  const loadFolders = async () => {
    const res = await axios.get(`${API}/folders/`);
    setFolders(res.data);
  };

  /* LOAD FILES */
  const loadFiles = async (folderId = null) => {
    const url = folderId
      ? `${API}/files/?folder=${folderId}`
      : `${API}/files/`;

    const res = await axios.get(url);
    setFiles(res.data);

    const total = res.data.reduce((sum, f) => sum + (f.size || 0), 0);
    setTotalSize(total);
  };

  useEffect(() => {
    loadFolders();
    loadFiles();
  }, []);

  /* CREATE FOLDER */
  const createFolder = async () => {
    if (!newFolder) return;
    await axios.post(`${API}/folders/create/`, { name: newFolder });
    setNewFolder("");
    loadFolders();
  };

  /* MULTI UPLOAD (DRAG & DROP OR INPUT) */
  const uploadFiles = async (filesToUpload) => {
    for (let f of filesToUpload) {
      const formData = new FormData();
      formData.append("file", f);
      formData.append("name", f.name);

      if (currentFolder) {
        formData.append("folder", currentFolder.id);
      }

      await axios.post(`${API}/upload/`, formData, {
        onUploadProgress: (e) =>
          setProgress(Math.round((e.loaded * 100) / e.total)),
      });
    }

    setProgress(0);
    loadFiles(currentFolder?.id || null);
  };

  /* DELETE FILE */
  const deleteFile = async (id) => {
    if (!confirm("Delete file?")) return;
    await axios.delete(`${API}/files/${id}/`);
    loadFiles(currentFolder?.id || null);
  };

  /* RENAME FILE */
  const renameFile = async (id) => {
    const newName = prompt("New name?");
    if (!newName) return;
    await axios.put(`${API}/files/${id}/rename/`, { name: newName });
    loadFiles(currentFolder?.id || null);
  };

  /* SHARE FILE */
  const shareFile = async (id) => {
    const res = await axios.post(`${API}/files/${id}/share/`);
    await navigator.clipboard.writeText(res.data.share_url);
    alert("Share link copied!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>My Cloud Storage</h2>

      {/* STORAGE METER */}
      <div style={{ marginBottom: 20 }}>
        <strong>Storage used:</strong> {formatSize(totalSize)}
        <div
          style={{
            height: 10,
            width: 300,
            background: "#ddd",
            borderRadius: 5,
            marginTop: 5,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(
                (totalSize / (25 * 1024 * 1024 * 1024)) * 100,
                100
              )}%`,
              background: "#4caf50",
              borderRadius: 5,
            }}
          />
        </div>
        <small>Free limit ~25 GB</small>
      </div>

      {/* FOLDERS */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => {
            setCurrentFolder(null);
            loadFiles();
          }}
        >
          Home
        </button>

        {folders.map((f) => (
          <button
            key={f.id}
            style={{ marginLeft: 10 }}
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
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="New folder name"
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
        />
        <button onClick={createFolder}>Create Folder</button>
      </div>

      {/* DRAG & DROP UPLOAD */}
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
          border: "2px dashed #999",
          padding: 30,
          textAlign: "center",
          background: dragging ? "#eee" : "transparent",
          marginBottom: 20,
        }}
      >
        <p>
          Drag & drop files here
          {currentFolder ? ` (to ${currentFolder.name})` : " (to Home)"}
        </p>
        <input
          type="file"
          multiple
          onChange={(e) => uploadFiles([...e.target.files])}
        />
      </div>

      {progress > 0 && <p>Uploading: {progress}%</p>}

      <hr />

      {/* FILE LIST */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {files.map((f) => {
          const preview =
            f.type === "image"
              ? f.file.replace("/upload/", "/upload/f_jpg,q_auto,w_300/")
              : f.file;

          return (
            <div key={f.id} style={{ width: 220 }}>
              {f.type === "image" && (
                <img
                  src={preview}
                  style={{ width: "100%", borderRadius: 8 }}
                  onClick={() => window.open(f.file)}
                />
              )}

              {f.type === "video" && (
                <video src={f.file} controls width="100%" />
              )}

              {f.type === "raw" && (
                <a href={f.file} target="_blank">Open File</a>
              )}

              <p>{f.name}</p>
              <button onClick={() => window.open(f.file)}>Open</button>
              <button onClick={() => renameFile(f.id)}>Rename</button>
              <button onClick={() => deleteFile(f.id)}>Delete</button>
              <button onClick={() => shareFile(f.id)}>Share</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
