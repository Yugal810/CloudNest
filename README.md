# CloudNest Storage Engine 
[![Storage System CI](https://github.com/Yugal810/Distributed-file-storage/actions/workflows/main.yml/badge.svg)](https://github.com/Yugal810/Distributed-file-storage/actions/workflows/main.yml)

A high-performance, resilient Distributed File Storage System (DFS) built with **FastAPI** and **React**. The system leverages client-side multipart streaming and cryptography to isolate workloads, chunk heavy payloads, and dynamically shard assets directly across virtual infrastructure nodes using AWS S3.


## System Features

* **High-Scale Memory Protection:** Bypasses traditional server RAM boundaries (OOM bottlenecks) by slicing large files (up to 10 GB+) into strict 1MB chunks directly in the browser using the HTML5 Blob API.
* **Direct Cloud Ingestion (AWS S3 Presigned URLs):** Keeps backend resource overhead near zero by generating short-lived cryptographic tokens, allowing the client to stream data slices directly to S3 storage.
* **Dynamic Cluster Node Scaling:** Replaces hardcoded node targets with an unchanging list with an intelligent layout topology that dynamically provisions virtual array node footprints (`node1` up to `node_cluster_10`) contextually matching file constraints.
* **Multi-MIME UI Thumbnail Engine:** Dynamically analyzes database metadata constraints to map and render custom responsive icon vectors for Images, Videos, PDFs, and Code blocks seamlessly.
* **Robust Enterprise Security:** Hardened with OAuth2 protocol standards, state-driven JWT session management, Bcrypt password hashing, and customized AWS bucket CORS policies.
* **DevOps & Automations:** Fully integrated end-to-end continuous deployment/continuous integration (CI/CD) pipelines managed via GitHub Actions.

---

## How to Run Locally

### 1. Backend Setup (FastAPI)
1. Navigate to the backend workspace:
```bash
   cd backend
2. Create and activate a virtual environment:
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/Mac:
   source venv/bin/activate
3. Install the application requirements:
   pip install -r requirements.txt
4. Spin up the ASGI server:
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup (React + Vite)
1. Navigate to the frontend directory:
   cd frontend
2. Install the necessary node dependencies:
   npm install
3. Launch the local dev server:
   npm run dev
