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
    if (!file) {
      alert("Select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || file.name);

    await axios.post(`${API}/upload/`, formData);

    setFile(null);
    setName("");
    loadFiles();
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>My Cloud Storage</h2>

      {/* Upload Section */}
      <input
        placeholder="File name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <br /><br />

      <button onClick={upload}>Upload</button>

      <hr />

      {/* Preview Section */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {files.map((f) => {
          // Cloudinary compressed preview
          const previewUrl = f.file.replace(
            "/upload/",
            "/upload/f_jpg,q_auto,w_300/"
          );

          return (
            <div key={f.id} style={{ width: 220 }}>
              <img
                src={previewUrl}
                alt={f.name}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
                onClick={() => window.open(f.file, "_blank")}
              />

              <p>{f.name}</p>

              <button onClick={() => window.open(f.file, "_blank")}>
  Open / Download original
</button>

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
