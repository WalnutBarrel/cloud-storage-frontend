import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://cloud-storage-backend-tzvw.onrender.com/api";

export default function App() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const [file, setFile] = useState(null);
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
