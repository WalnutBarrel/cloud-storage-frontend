import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://cloud-storage-backend-tzvw.onrender.com/api";


function App() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [files, setFiles] = useState([]);

  const loadFiles = async () => {
    const res = await axios.get(`${API}/files/`);
    setFiles(res.data);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const upload = async () => {
    if (!file) return alert("Select file");

    const formData = new FormData();
    formData.append("name", name || file.name);
    formData.append("file", file);

    await axios.post(`${API}/upload/`, formData);
    setFile(null);
    setName("");
    loadFiles();
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>My Cloud Storage</h2>

      <input
        placeholder="File name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <br /><br />

      <button onClick={upload}>Upload</button>

      <hr />

      <ul>
        {files.map((f) => (
          <li key={f.id}>
            <a href={f.file} target="_blank">{f.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
