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
  const [selected, setSelected] = useState([]);
  const [newFolder, setNewFolder] = useState("");
  const [totalSize, setTotalSize] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");

  // FAST ZIP (Cloudinary)
  const [zipLinks, setZipLinks] = useState([]);
  const [zipLoading, setZipLoading] = useState(false);

  const uploadFiles = async (filesToUpload) => {
  for (let i = 0; i < filesToUpload.length; i++) {
    const f = filesToUpload[i];
    setCurrentFile(f.name);

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

    setProgress(0);
  }

  setCurrentFile("");
  loadFiles(currentFolder?.id || null);
};


  /* ===========================
     LOAD DATA
  =========================== */

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

    const total = res.data.reduce((sum, f) => sum + (f.size || 0), 0);
    setTotalSize(total);

    setSelected([]);
    setVisibleCount(20);
  };

  useEffect(() => {
    loadFolders();
    loadFiles();
  }, []);

  /* ===========================
     CREATE FOLDER
  =========================== */

  const createFolder = async () => {
    if (!newFolder) return;
    await axios.post(`${API}/folders/create/`, { name: newFolder });
    setNewFolder("");
    loadFolders();
  };

  /* ===========================
     SELECTION
  =========================== */

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ===========================
     FAST ZIP (CLOUDINARY)
  =========================== */

  const generateFastZips = async () => {
  try {
    setZipLoading(true);

    const res = await axios.post(
      `${API}/files/create-cloudinary-zip/`
    );

    const zips = res.data.zips || [];

    if (zips.length === 0) {
      alert("No ZIPs returned");
      return;
    }

    alert(
      "Your browser may ask to allow multiple downloads.\nClick ALLOW once."
    );

    // 🔥 Auto-download all ZIPs
    for (let i = 0; i < zips.length; i++) {
      const zip = zips[i];

      const a = document.createElement("a");
      a.href = zip.download_url;
      a.download = `${zip.account}.zip`; // filename
      document.body.appendChild(a);
      a.click();
      a.remove();

      // small delay to avoid Chrome blocking
      await new Promise((r) => setTimeout(r, 800));
    }

  } catch (err) {
    console.error(err);
    alert("Failed to generate ZIPs");
  } finally {
    setZipLoading(false);
  }
};


  /* ===========================
     FILE ACTIONS
  =========================== */

  const deleteFile = async (id) => {
    if (!confirm("Delete file?")) return;
    await axios.delete(`${API}/files/${id}/`);
    loadFiles(currentFolder?.id || null);
  };

  const renameFile = async (id) => {
    const newName = prompt("New name?");
    if (!newName) return;
    await axios.put(`${API}/files/${id}/rename/`, { name: newName });
    loadFiles(currentFolder?.id || null);
  };

  const downloadFile = (url) => {
    window.open(`${url}?fl_attachment`, "_blank");
  };

  /* ===========================
     UI
  =========================== */

  return (
    <div style={{ padding: 20 }}>
      <h2>My Cloud Storage</h2>

      {/* STORAGE */}
      <p>
        <strong>Used:</strong> {formatSize(totalSize)}
      </p>

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
          placeholder="New folder"
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
    border: "2px dashed #999",
    padding: 25,
    textAlign: "center",
    background: dragging ? "#eee" : "transparent",
    marginBottom: 20,
  }}
>
  <p>
    Drag & drop files here
    {currentFolder ? ` (to ${currentFolder.name})` : ""}
  </p>

  <input
    type="file"
    multiple
    onChange={(e) => uploadFiles([...e.target.files])}
  />
</div>

{currentFile && (
  <div style={{ marginBottom: 15 }}>
    <p>Uploading: <b>{currentFile}</b></p>
    <div
      style={{
        height: 6,
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
  </div>
)}


      {/* FAST ZIP */}
      <hr />
      <button onClick={generateFastZips} disabled={zipLoading}>
  {zipLoading ? "Preparing ZIPs..." : "Fast Download All Images (ZIP)"}
</button>


      {zipLinks.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <h4>ZIP Downloads</h4>
          {zipLinks.map((z, i) => (
            <p key={i}>
              <a href={z.download_url} target="_blank" rel="noreferrer">
                ⬇ {z.account} ({z.count} images)
              </a>
            </p>
          ))}
        </div>
      )}

      <hr />

      {/* FILE LIST */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {files.slice(0, visibleCount).map((f) => (
          <div key={f.id} style={{ width: 220 }}>
            <input
              type="checkbox"
              checked={selected.includes(f.id)}
              onChange={() => toggleSelect(f.id)}
            />

            {f.type === "image" && (
              <img
                src={f.file.replace("/upload/", "/upload/w_300,q_auto/")}
                style={{ width: "100%", borderRadius: 6 }}
                onClick={() => window.open(f.file)}
              />
            )}

            {f.type === "video" && (
              <video src={f.file} controls width="100%" />
            )}

            <p>{f.name}</p>
            <p style={{ fontSize: 12 }}>
              Stored in <b>{f.storage_account?.name}</b>
            </p>

            <button onClick={() => downloadFile(f.file)}>Download</button>
            <button onClick={() => renameFile(f.id)}>Rename</button>
            <button onClick={() => deleteFile(f.id)}>Delete</button>
          </div>
        ))}
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
