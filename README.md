# 📐 Aghdas Solution: Higher-Dimensional Simplex Dissection & Geometric Combinatorics

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math_Typesetting-3298dc)](https://katex.org/)

An interactive, high-contrast mathematical presentation deck exploring the **Aghdas Method (روش اقدس)** — an intuitive spatial geometry proof for Problems 12 & 13 of the Grade 7 Advanced Mathematics curriculum (National Organization for Development of Exceptional Talents - Sampad).

> **Developed by Amin Madani**  
> *Dabirestan Este'dad-haye Derakhshan Shahid Bahonar 3, Karaj*

---

## 🌟 Highlights

- **The Aghdas Method (روش اقدس)**: Resolves complex series summations ($\sum_{k=1}^n \frac{k(k+1)}{2}$) not through mechanical induction, but via spatial geometric symmetry — duplicating and assembling 4 discrete regular tetrahedra around a center to reveal closed-form combinatorial formulas ($\frac{n(n+1)(n+2)}{6}$).
- **Interactive 3D WebGL Studio**: Powered by Three.js with real-time tetrahedral slicing, modular cube packing, explode/merge animations, and live 4D tesseract / 4-simplex perspective projections.
- **Smart Classroom Scratchpad / Whiteboard**: An on-demand transparent overlay (`[W]`) featuring vector ink drawing, math grid paper, fluorescent highlighters, eraser, stroke history (Undo/Redo), and note export for smartboards and styluses.
- **Projector-Engineered Display**: Tuned for high-contrast classroom beamers with an intelligent responsive scale engine (90%, 82%, 100%), hollow-zero academic Persian digits (Font Yas), and Vazirmatn typography.
- **Offline & Self-Contained**: 100% offline-compatible — local KaTeX math typesetting, local Lucide SVG icons, bundled Three.js runtimes, and zero external runtime dependencies.

---

## 🧭 Slide Architecture

| Slide | Topic | Key Mathematical & Interactive Features |
| :---: | :--- | :--- |
| **01** | **Cover & Introduction** | Title, academic affiliations, geometric specs badge, presenter credits |
| **02** | **Step-by-Step Problem Breakdown** | Interactive 6-step walkthrough of the staircase sum & triangular numbers |
| **03** | **Analytical Solution** | Algebraic formulation, table of partial sums, and the core structural challenge |
| **04** | **3D Dissection of Single Tetrahedron** | Interactive 3D voxel model: discrete cube decomposition of the pyramid |
| **05** | **The 4-Copy Spatial Assembly** | 3D visual proof: rotating and locking 4 copies into a unified symmetrical block |
| **06** | **Algebraic Synthesis & Verification** | Closed-form formula derivation with an interactive live calculator ($n = 1 \dots 100$) |
| **07** | **Khayyam-Pascal Triangle Connection** | Combinatorial tetrahedral numbers $\binom{n+2}{3}$ & the Hockey-Stick identity |
| **08** | **Generalization to $d$-Dimensional Simplexes** | Comprehensive 0D to 4D simplex comparison table & live 4D rotation simulation |
| **09** | **Complete Proof Summary** | Step-by-step summary from 1D segment to 4D pentatope with interactive tabs |
| **10** | **Appreciation & Finale** | Clean, minimalist closing slide with institutional insignia |

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut | Action |
| :--- | :--- |
| `Space` / `→` / `PageDown` | Next Slide / Reveal Next Fragment |
| `←` / `PageUp` | Previous Slide |
| `Home` / `End` | Jump to First / Last Slide |
| `W` | Toggle Smart Whiteboard / Scratchpad Overlay |
| `F` | Toggle Fullscreen Mode |
| `P` / `Ctrl + P` | Open Printable Classroom Handout Mode |
| `Ctrl + Shift + Z` | Cycle Projector Scale (90% &rarr; 82% &rarr; 100%) |
| `Esc` | Close Whiteboard / Exit Fullscreen |

---

## 🚀 Quick Start

Because this project is completely self-contained with no node build pipelines or remote CDNs required:

### Option 1: Direct File Launch
Simply double-click `index.html` in your modern web browser (Chrome, Edge, Firefox, Brave).

### Option 2: Local HTTP Server (Recommended for WebGL)
Run any local server from the project directory:

```bash
# Python 3
python3 -m http.server 8085

# Node.js
npx serve .
```
Then navigate to `http://localhost:8085`.

---

## 🛠️ Technology Stack

- **Core**: Vanilla HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid)
- **Design System**: Vercel Geist & Shadcn UI Design Principles (Technical Minimalist Grid)
- **Typography**: Yas Persian Academic Font (Hollow Zero), Vazirmatn
- **3D Engine**: Three.js (r128) + OrbitControls
- **Mathematics Engine**: KaTeX (Local offline build)
- **Vector Icons**: Lucide Icons

---

## 📄 License & Attribution

Developed by **Amin Madani**.  
Released under the [MIT License](LICENSE).
