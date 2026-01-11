import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://cloud-storage-backend-tzvw.onrender.com/api";

export default function App() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [progress, setProgress] = useState(0);

  const loadFiles = async () => {
    const res = await axios.get(`${API}/files/`);
    setFiles(res.data);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const upload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || file.name);

    await axios.post(`${API}/upload/`, formData, {
      onUploadProgress: e =>
        setProgress(Math.round((e.loaded * 100) / e.total)),
    });

    setProgress(0);
    setFile(null);
    setName("");
    loadFiles();
  };

  const deleteFile = async (id) => {
    if (!confirm("Delete file?")) return;
    await axios.delete(`${API}/files/${id}/`);
    loadFiles();
  };

  const renameFile = async (id) => {
    const newName = prompt("New name?");
    if (!newName) return;
    await axios.put(`${API}/files/${id}/rename/`, { name: newName });
    loadFiles();
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Cloud Storage</h2>

      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
      <br /><br />
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <br /><br />
      <button onClick={upload}>Upload</button>

      {progress > 0 && <p>Uploading: {progress}%</p>}

      <hr />

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {files.map(f => {
          const preview =
            f.type === "image"
              ? f.file.replace("/upload/", "/upload/f_jpg,q_auto,w_300/")
              : f.file;

          return (
            <div key={f.id} style={{ width: 220 }}>
              {f.type === "image" && <img src={preview} width="100%" />}
              {f.type === "video" && <video src={f.file} controls width="100%" />}
              {f.type === "raw" && <a href={f.file}>Open File</a>}

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
