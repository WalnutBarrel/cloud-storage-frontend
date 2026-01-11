import { useEffect, useState } from "react";
import axios from "axios";


const API = "https://cloud-storage-backend-tzvw.onrender.com/api";

const formatSize = (bytes) => {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb < 1024
    ? `${mb.toFixed(2)} MB`
    : `${(mb / 1024).toFixed(2)} GB`;
};


export default function App() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const [file, setFile] = useState(null);
  const [totalSize, setTotalSize] = useState(0);
  const [name, setName] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [progress, setProgress] = useState(0);

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

  /* UPLOAD FILE */
  const upload = async () => {
    if (!file) return alert("Select a file");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || file.name);

    if (currentFolder) {
      formData.append("folder", currentFolder.id);
    }

    await axios.post(`${API}/upload/`, formData, {
      onUploadProgress: (e) =>
        setProgress(Math.round((e.loaded * 100) / e.total)),
    });

    setProgress(0);
    setFile(null);
    setName("");
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
              width: `${Math.min((totalSize / (25 * 1024 * 1024 * 1024)) * 100, 100)}%`,
              background: "#4caf50",
              borderRadius: 5,
            }}
          />
        </div>

        <small>Free limit ~25 GB</small>
      </div>


      {/* FOLDER BAR */}
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

      {/* UPLOAD */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="File name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br /><br />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <br /><br />
        <button onClick={upload}>
          Upload {currentFolder ? `to ${currentFolder.name}` : "to Home"}
        </button>

        {progress > 0 && <p>Uploading: {progress}%</p>}
      </div>

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
