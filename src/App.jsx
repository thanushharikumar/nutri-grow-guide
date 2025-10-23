import React, { useState, useEffect } from 'react';
import { WeatherService, SoilHealthService, CropAnalysisService, FertilizerService } from './services';

export default function App() {
  const [currentResults, setCurrentResults] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [currentCropAnalysis, setCurrentCropAnalysis] = useState(null);
  const [cropImageFile, setCropImageFile] = useState(null);

  // Toast notifications
  const showToast = (title, description, type = 'default') => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-description">${description}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  };

  // Geolocation handler
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      showToast('Location Error', 'Geolocation is not supported by your browser', 'error');
      return null;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          console.log('User location:', coords);
          resolve(coords);
        },
        (error) => {
          showToast('Location Permission Denied', 'Please enable location to continue', 'error');
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Fetch soil data
  const fetchSoilData = async () => {
    const btn = document.getElementById('fetch-soil-btn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.textContent = 'Fetching...';
    
    try {
      showToast('Requesting location...', 'Please allow location access in your browser.');

      // Get location
      const coordinates = await requestUserLocation()
        .catch(() => {
          showToast('Location permission denied', 'Using default location (New Delhi)', 'error');
          return { lat: 28.6139, lon: 77.2090 };
        });

      console.log("User coordinates:", coordinates);

      // Fetch soil data
      const soilData = await SoilHealthService.getSoilHealthData(coordinates);
      
      if (!soilData) {
        throw new Error('No soil data received');
      }

      // Update form fields
      const fields = {
        'soilType': soilData.soilType || '',
        'pH': soilData.pH || '',
        'nitrogen': soilData.nitrogen || '',
        'phosphorus': soilData.phosphorus || '',
        'potassium': soilData.potassium || '',
        'organicCarbon': soilData.organicCarbon || ''
      };

      // Update all form fields
      let hasData = false;
      for (const [id, value] of Object.entries(fields)) {
        const element = document.getElementById(id);
        if (element) {
          element.value = value;
          if (value) hasData = true;
        }
      }

      if (!hasData) {
        throw new Error('No valid soil data found for this location');
      }

      showToast('Soil data loaded!', `Found soil health card: ${soilData.cardNumber}`, 'success');
    } catch (error) {
      console.error('Soil data error:', error);
      showToast(
        'Soil data service error',
        error.message || 'Unable to connect to soil health database',
        'error'
      );
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          Fetch from SHC
        `;
      }
    }
  };

  return (
    <div className="app">
      {/* Your existing JSX structure here */}
      <button id="fetch-soil-btn" onClick={fetchSoilData}>
        <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        Fetch from SHC
      </button>
    </div>
  );
}