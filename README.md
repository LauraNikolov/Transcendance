
## 🎮 Transcendence – 42 School Project

This project was developed as part of my **final project at 42 School**.  
The complete subject is included in this repository for more details on the objectives and technical requirements.

## 📌 Project status

Some features required by the subject are not yet fully implemented, but this version is **stable and functional** enough to demonstrate the architecture and core mechanics of the application.

## 🚀 How to run

1. Clone the repository. 

2. Install dependencies:  
   ```bash
   npm install --force
   ```
3. Start in development mode:  
   ```bash
   npm run dev
   ```

## 🎮 How to play

- Open the app in your browser (usually at `http://localhost:8080`).
- Create or join a game room.
- Play against other online players in real-time.
-  For local mode, make sure to add a **guest** user in the database to enable guest access.
 - Controls for Player 1:  
  - Move: **O** (left), **L** (right)  
  - Shoot: **P**
- Controls for Player 2:  
  - Move: **Q** (left), **W** (right)  
  - Shoot: **D**

## 🛠️ Tech stack

- **Node.js** & **Fastify** (backend)  
- **Socket.IO** for real-time communication  
- **Babylon.js** (Null Engine) for 3D server-side logic  

---
