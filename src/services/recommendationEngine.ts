// src/pages/Recommendation.tsx
import React, { useState } from "react";
import { SoilHealthService } from "@/services/SoilHealthService";
import { analyzeCropImage } from "@/services/cropAnalysisService";
import "@/index.css"; // Ensure you keep your base styles imported

export default function Recommendation() {
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [currentCropAnalysis, setCurrentCropAnalysis] = useState<any>(null);

  // ✅ Simple Toast System
  const showToast = (title: string, description: string, type: string = "default") => {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-description">${description}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  // ✅ Fetch Soil Data via Mock Service
  const fetchSoilData = async () => {
    const btn = document.getElementById("fetch-soil-btn") as HTMLButtonElement | null;
    if (!btn) return;

    btn.disabled = true;
    btn.textContent = "Fetching...";

    try {
      showToast("Requesting location...", "Allow browser access to continue.");

      // Get coordinates
      const coordinates = await new Promise<{ lat: number; lon: number }>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            }),
          () => {
            showToast("Location denied", "Using default: New Delhi", "error");
            resolve({ lat: 28.6139, lon: 77.209 });
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      console.log("🌍 Coordinates:", coordinates);

      const soilData = await SoilHealthService.getSoilHealthData(coordinates);
      if (!soilData) throw new Error("No soil data found");

      const mapping: Record<string, any> = {
        pH: soilData.pH,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
        organicCarbon: soilData.organicCarbon,
      };

      // Populate form fields
      Object.entries(mapping).forEach(([id, value]) => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) input.value = value;
      });

      showToast("Soil data loaded ✅", `Card: ${soilData.cardNumber}`, "success");
    } catch (error: any) {
      console.error("❌ Soil data error:", error);
      showToast("Soil data service error", error.message || "Unknown error", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        Fetch from SHC
      `;
    }
  };

  // ✅ Handle Image Upload + Preview
  const handleCropImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCropImageFile(file);
    setCropPreview(previewUrl);
    showToast("Analyzing crop image...", "Please wait a moment.");

    try {
      const analysis = await analyzeCropImage(file);
      console.log("✅ Crop analysis result:", analysis);
      setCurrentCropAnalysis(analysis);
      showToast("Crop image validated ✅", `Health: ${analysis.cropHealth}`, "success");
    } catch (err: any) {
      console.error("❌ Image analysis failed:", err);
      showToast("Crop analysis failed", err.message, "error");
    }
  };

  return (
    <div className="app">
      <h2>Sustainable Fertilizer Usage Optimizer</h2>

      {/* 🌱 Soil Section */}
      <section className="soil-section">
        <h3>Soil Analysis Data</h3>
        <button id="fetch-soil-btn" onClick={fetchSoilData}>
          <svg
            className="btn-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
          </svg>
          Fetch from SHC
        </button>

        <div className="form-grid">
          <input id="pH" placeholder="Soil pH" />
          <input id="nitrogen" placeholder="Nitrogen (ppm)" />
          <input id="phosphorus" placeholder="Phosphorus (ppm)" />
          <input id="potassium" placeholder="Potassium (ppm)" />
          <input id="organicCarbon" placeholder="Organic Carbon (%)" />
        </div>
      </section>

      {/* 🌿 Crop Image Upload */}
      <section className="crop-upload-section">
        <h3>Crop Image Analysis</h3>
        <label htmlFor="crop-image">Upload crop image for AI analysis</label>
        <input
          type="file"
          id="crop-image"
          accept="image/*"
          onChange={handleCropImageChange}
        />

        {cropPreview && (
          <img
            src={cropPreview}
            alt="Crop Preview"
            style={{
              width: "200px",
              marginTop: "10px",
              borderRadius: "8px",
              display: "block",
            }}
          />
        )}
      </section>

      {/* Analysis Results */}
      {currentCropAnalysis && (
        <section className="results-section">
          <h3>AI Crop Health Report</h3>
          <p>Health: {currentCropAnalysis.cropHealth}</p>
          <p>Confidence: {(currentCropAnalysis.confidence * 100).toFixed(1)}%</p>
          {currentCropAnalysis.deficiencies?.length > 0 ? (
            <ul>
              {currentCropAnalysis.deficiencies.map((d: any, i: number) => (
                <li key={i}>
                  {d.nutrient.toUpperCase()} - {d.severity} ({Math.round(d.confidence * 100)}%)
                </li>
              ))}
            </ul>
          ) : (
            <p>No major deficiencies detected ✅</p>
          )}
        </section>
      )}

      <div id="toast-container" className="toast-container"></div>
    </div>
  );
}
