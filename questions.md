# Build "Gym Progress Visualizer" Project View

This plan outlines the architecture for adding a brand new project—the "Gym Progress Visualizer" (based on your Hevy Firebase Dashboard)—to your portfolio. We will follow the structured storytelling layout that has worked beautifully so far.

## User Review Required

> [!IMPORTANT]
> Please review the Open Questions below and provide the content so I can plug it directly into the new page structure!

## Proposed Changes

### 1. Global Data & Routing
#### [MODIFY] [projects.js](file:///c:/Users/felip/Projects/e-portfolio/src/data/projects.js)
- Append a new project object with `id: "gym-visualizer"`, title, and a placeholder image.

#### [MODIFY] [App.jsx](file:///c:/Users/felip/Projects/e-portfolio/src/App.jsx)
- Import the new `GymVisualizer` component and set up a new `<Route path="/project/gym-visualizer" element={<GymVisualizer />} />`.

### 2. Project Component
#### [NEW] `src/pages/projects/GymVisualizer.jsx`
- Create the standard, beautiful structure using `ProjectLayout`, `OverviewSection`, `ProblemSolutionSection`, `PlotTwistSection`, `ResultsSection` (with color/vertical toggles), and `OutroSection`.

---

## Open Questions

Based on your past work with the Hevy app and Firebase migration, here is what I need from you to construct the page:

1. **Overview Section**
   - **Headline**: A premium, real-time custom analytics dashboard for deep Hevy workout progression tracking.
   - **My Role**: Fullstack Developer
   - **The Stack**: React, TypeScript, Vite, Firebase Firestore, Recharts, Custom CSS (Glassmorphism & animations)
   - **The Impact**: Transformed raw static CSV data into a visually stunning, real-time dashboard that automatically visualizes workout volume, muscle group distributions, and exercise frequencies without manual spreadsheet crunching.

2. **Problem & Solution Section**
   - **The Problem**: The Hevy mobile app lacked deep, customizable desktop analytics. Tracking detailed historical volume trends and specific muscle splits required manually exporting and analyzing bulky CSV files, which was tedious and not scalable.
   - **The Solution**: I built a bespoke web dashboard designed with a 'Dark Mode First' premium aesthetic. It aggregates workout data, automatically maps exercises to muscle groups, and leverages dynamic filters (e.g., Last 30 Days) to compute and display actionable insights immediately.

3. **The "Plot Twist" (A technical challenge)**
   - **The Hurdle**: The project originally relied on parsing local client-side CSV files (`papaparse`). Migrating to a live **Firebase Firestore** backend was tough because the data shape changed from flat CSV rows to heavily nested JSON structures (workout documents containing arrays of varied exercise sets). 
   - **The Solution**: I engineered a unified custom React hook (`hooks/useWorkoutData`) equipped with adapter logic. It fetches raw Firestore documents and normalizes the nested JSON on-the-fly into a clean, strongly-typed TypeScript schema. This abstraction ensured seamless data flow, allowing the complex Recharts components to render effortlessly without rewriting the frontend visualization layer.

4. **Results / Features Section**
   - **Key Features to Highlight**:
     1. Real-Time Firebase Firestore Synchronization
     2. Interactive Data Visualizations via Recharts (Volume Area Charts & Muscle Pie Charts)
     3. Automated Muscle Group Mapping and Normalization
     4. Premium Glassmorphic UI with Micro-Animations
   - **Video Format**: Standard horizontal layout works best to showcase the wide desktop dashboard and charts.

5. **Outro**
   - **GitHub Link**: https://github.com/FelipeRuizM/the-data-app
   - **Live Demo**: https://FelipeRuizM.github.io/the-data-app
   - (Note: Assuming standard username/repo format from the `package.json` homepage URL).
