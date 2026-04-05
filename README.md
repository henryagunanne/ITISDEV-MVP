# ITISDEV-Basketball-Analytics-System

---
![Course](https://img.shields.io/badge/Course-ITISDEV-blue)
![Institution](https://img.shields.io/badge/Institution-De%20La%20Salle%20University-green)

![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![Express](https://img.shields.io/badge/Framework-Express-blue)
![Express%20Handlebars](https://img.shields.io/badge/View%20Engine-Express%20Handlebars-orange)
![HTML5](https://img.shields.io/badge/HTML5-%3E%3D5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-%3E%3D3-1572B6?logo=css3&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-v5-purple?logo=bootstrap&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?logo=javascript&logoColor=black)
![jQuery](https://img.shields.io/badge/jQuery-v3.6-blue?logo=jquery&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)

![License](https://img.shields.io/badge/License-MIT-yellow)
![Academic Project](https://img.shields.io/badge/Project-Type%3A%20Academic-lightgrey)

--- 

**Major Course Output — ITISDEV**  
A full-stack web-based basketball statistics and analytics platform designed to support real-time data input, structured storage, and performance evaluation for collegiate teams.

---

## 🧠 Project Overview

The **ITISDEV Basketball Analytics System** is a centralized web application developed for the **DLSU Green Archers** to manage, record, and analyze basketball performance data.

The system replaces traditional spreadsheets and manual stat sheets with a **real-time, database-driven platform**, enabling accurate tracking of player and team performance across games and tournaments.

It is designed to support:
- Real-time stat encoding during live games  
- Automated analytics and reporting  
- Longitudinal performance tracking across a season  

This project demonstrates the practical application of **business systems development, RESTful APIs, and data analytics** in a sports context.

---

## 👥 Team Members

| Name | Primary Responsibilities |
|-----|--------------------------|
| **Henry Agunanne** | Backend Architecture, API Development, Database Design |
| **Juan Gabriel Alonzo** | Frontend Development, UI/UX |
| **Royce C. Benavidez** | Feature Development, Integration |
| **Matthew Lapura** | System Integration, Testing |
| **Alek John R. Medran** | QA, Validation, Documentation |

---

## 🎯 Objectives & Impact

This system aims to:

- Centralize basketball statistics into a structured database  
- Improve accuracy and consistency of recorded data  
- Enable faster generation of analytics and reports  
- Support data-driven coaching and decision-making  

### 💡 Impact

- 📊 Eliminates fragmented spreadsheets  
- ⚡ Provides real-time insights during games  
- 📈 Enables season-wide performance tracking  
- 🧠 Lays foundation for AI/ML-based analytics  

---

## 🧩 Technology Stack

| Layer | Technologies Used |
|------|------------------|
| Frontend | HTML, CSS, JavaScript, React |
| Backend | Node.js, Express |
| Database | MongoDB |
| Authentication | JWT / Session-based |
| Architecture | RESTful API, 3-Tier Architecture |

---

## 🏗️ System Architecture

The system follows a **three-tier architecture**:

- **Presentation Layer** – Admin dashboard for stat input and reports  
- **Application Layer** – REST API handling logic and analytics  
- **Data Layer** – MongoDB storing structured basketball data  

---

## 🚀 Core Features

- 🔐 Secure login and authentication  
- 👤 Player management system  
- 🏀 Game creation and management  
- ⏱️ Real-time statistics input  
- 📊 Automated analytics:
  - Per-game statistics  
  - Season averages  
- 📈 Structured performance reports  
- 🧠 Future support for Machine Learning insights  

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- MongoDB (Local or Atlas)

> ⚠️ MongoDB **must be running** before starting the application.

---

## 🗄️ Running MongoDB

### macOS (Homebrew)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
mongosh
