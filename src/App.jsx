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
  const [remaining, setRemaining] = useState(0);
  const [selected, setSelected] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20);



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

    // clear selection when folder changes
    setSelected([]);
    setVisibleCount(20);
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

  /* SELECT FILES */
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  /* DOWNLOAD ZIP */
  const downloadZip = async () => {
    if (selected.length === 0) {
      alert("Select files first");
      return;
    }

    const res = await axios.post(
      `${API}/files/download-zip/`,
      { files: selected },
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "files.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* MULTI UPLOAD */
  const uploadFiles = async (filesToUpload) => {
  setRemaining(filesToUpload.length);
  setUploadedCount(0);

  for (let i = 0; i < filesToUpload.length; i++) {
    const f = filesToUpload[i];

    setCurrentFileName(f.name);

    const formData = new FormData();
    formData.append("file", f);
    formData.append("name", f.name);

    if (currentFolder) {
      formData.append("folder", currentFolder.id);
    }

    await axios.post(`${API}/upload/`, formData, {
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded * 100) / e.total);
        setProgress(percent);
      },
    });

    // after one file completes
    setUploadedCount((prev) => prev + 1);
    setRemaining((prev) => prev - 1);
    setProgress(0);

    // 🔥 allow UI repaint
    await new Promise((r) => setTimeout(r, 0));
  }

  setCurrentFileName("");
  loadFiles(currentFolder?.id || null);
};




  /* DELETE FILE */
  const deleteFile = async (id) => {
    if (!confirm("Delete file?")) return;
    await axios.delete(`${API}/files/${id}/`);
    loadFiles(currentFolder?.id || null);
  };

  const bulkDelete = async () => {
  if (selected.length === 0) {
    alert("Select files first");
    return;
  }

  if (!confirm(`Delete ${selected.length} files?`)) return;

  for (let id of selected) {
    await axios.delete(`${API}/files/${id}/`);
  }

  setSelected([]);
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

      {currentFileName && (
  <div style={{ marginBottom: 10 }}>
    <strong>
      Uploading {uploadedCount + 1} / {uploadedCount + remaining}
    </strong>
    <p>{currentFileName}</p>

    <div
      style={{
        height: 8,
        width: 300,
        background: "#ddd",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "#2196f3",
          borderRadius: 4,
        }}
      />
    </div>

    <p>{progress}%</p>
    <p>{remaining} file{remaining !== 1 ? "s" : ""} remaining</p>
  </div>
)}



      {/* MULTI DOWNLOAD BUTTON */}
      {selected.length > 0 && (
  <div style={{ marginBottom: 10 }}>
    <button onClick={downloadZip}>
      Download {selected.length} files as ZIP
    </button>

    <button
      onClick={bulkDelete}
      style={{ marginLeft: 10, color: "red" }}
    >
      Delete {selected.length} files
    </button>
  </div>
)}


      <hr />

      {/* FILE LIST */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {files.slice(0, visibleCount).map((f) => {
          const preview =
            f.type === "image"
              ? f.file.replace("/upload/", "/upload/w_300,q_auto/")
              : f.file;


          return (
            <div key={f.id} style={{ width: 220 }}>
  <input
    type="checkbox"
    checked={selected.includes(f.id)}
    onChange={() => toggleSelect(f.id)}
  />

  {f.type === "image" && (
    <img
      src={f.file.replace("/upload/", "/upload/w_300,q_auto/")}
      loading="lazy"
      decoding="async"
      style={{ width: "100%", borderRadius: 8, cursor: "pointer" }}
      onClick={() => window.open(f.file)}
      onError={(e) => (e.target.style.display = "none")}
    />
  )}

  {f.type === "video" && (
    <video src={f.file} controls preload="none" width="100%" />
  )}

  {f.type === "raw" && (
    <a href={f.file} target="_blank" rel="noreferrer">
      Open File
    </a>
  )}

  <p>{f.name}</p>

  <button onClick={() => window.open(f.file)}>Open</button>
  <button onClick={() => renameFile(f.id)}>Rename</button>
  <button onClick={() => deleteFile(f.id)}>Delete</button>
</div>

          );
        })}
        
      </div>
      {visibleCount < files.length && (
          <button
            onClick={() => setVisibleCount((c) => c + 20)}
            style={{ marginTop: 20 }}
          >
            Load more ({files.length - visibleCount} remaining)
          </button>
        )}
    </div>
  );
}
