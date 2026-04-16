# Meditrack-AI 🏥

Meditrack-AI is an intelligent, full-stack medical management platform designed to bridge the gap between complex diagnostic reporting and proactive patient care. Built with a focus on clinical precision and data-driven insights, it empowers healthcare providers with AI-augmented tools for better decision-making.

![Meditrack-AI Banner](https://picsum.photos/seed/meditrack/1200/400)

## ✨ Core Features

### 🧠 AI Diagnostic Synthesis
- **Report Analyzer**: Leverages Gemini 1.5 Pro to extract key insights, urgent actions, and biomarkers from uploaded PDFs, images, or raw clinical notes.
- **Biomarker Extraction**: Automatically identifies and parses laboratory values (e.g., HbA1c, Cholesterol, Glucose) to populate longitudinal records.

### 💊 Medication Adherence Engine
- **Inventory Monitoring**: Real-time tracking of medication supply with custom "Low Threshold" warnings.
- **Dose Scheduling**: Support for multi-dose daily schedules with temporal awareness.
- **Protocol Breach Alerts**: Automated system-wide notifications for missed doses or critical supply shortages.
- **30-Day Adherence Heatmap**: Visual dot-grid representation of patient compliance history (Taken vs. Missed vs. Skipped).

### 📈 Longitudinal Health Analytics
- **Biomarker Trends**: Interactive time-series visualizations of patient biomarkers to monitor clinical trajectories.
- **Patient Dossiers**: Centralized repository for clinical history, diagnostic archives, and current pharmacotherapy.

### 💬 Medical Intelligence Chat
- **Med-Chat**: A context-aware consultation interface for clinical interrogation, symptom cross-referencing, and trajectory synthesis.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Utility-first, responsive design)
- **Database**: Firebase Firestore (NoSQL, Real-time sync)
- **Auth**: Firebase Authentication (Google OAuth)
- **AI/LLM**: Google Gemini API (@google/genai)
- **Visualization**: Recharts (D3-based React charts)
- **Icons**: Lucide React
- **Animations**: Motion (framer-motion)

## 🏗️ Project Structure

```text
src/
├── components/          # Reusable UI & Logic Components
│   ├── AlertSystem      # Global notification engine
│   ├── MedicationTracker# Adherence & Inventory management
│   ├── ReportAnalyzer   # AI Synthesis portal
│   └── ...
├── services/            # API & Third-party integrations
├── utils/               # Formatting & helper functions
├── firebase/            # Database configuration & error handlers
└── App.tsx              # Main routing & layout engine
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- A Firebase Project
- A Google AI Studio API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/meditrack-ai.git
   cd meditrack-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add your credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_apiKey
   VITE_FIREBASE_AUTH_DOMAIN=your_authDomain
   VITE_FIREBASE_PROJECT_ID=your_projectId
   VITE_FIREBASE_APP_ID=your_appId
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🛡️ Security & Privacy

Meditrack-AI implements strict **Firestore Security Rules** to ensure that:
- Patient data is strictly scoped to the authenticated owner.
- Clinical records are protected by least-privilege access patterns.
- Adherence logs are immutable and cryptographically linked to user UIDs.

## ⚖️ Disclaimer

*This application is a clinical support prototype. All AI-generated outputs are probabilistic and must be verified by a licensed medical professional before being used for diagnostic or treatment purposes.*

---
Built with ❤️ for better healthcare.
