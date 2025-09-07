// Main Application Logic

// Global state
let currentResults = null;
let currentWeather = null;
let currentCropAnalysis = null;
let cropImageFile = null;

// Navigation
function navigateToPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show target page
  const targetPage = document.getElementById(`${pageName}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === pageName) {
      link.classList.add('active');
    }
  });
  
  // Update mobile select
  const mobileSelect = document.querySelector('.nav-mobile');
  if (mobileSelect) {
    mobileSelect.value = pageName;
  }
}

// Toast notifications
function showToast(title, description, type = 'default') {
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
}

// Image upload handler
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large', 'Please select an image smaller than 5MB', 'error');
    return;
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Invalid file type', 'Please select a JPEG or PNG image', 'error');
    return;
  }
  
  cropImageFile = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    img.src = e.target.result;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

// Fetch soil data
async function fetchSoilData() {
  const btn = document.getElementById('fetch-soil-btn');
  btn.disabled = true;
  btn.textContent = 'Fetching...';
  
  try {
    showToast('Fetching soil data...', 'Getting location and soil health card data');
    
    let coordinates;
    try {
      coordinates = await WeatherService.getUserLocation();
    } catch (error) {
      showToast('Location Permission Required', 'Using default coordinates for demo', 'error');
      coordinates = { lat: 28.6139, lon: 77.2090 };
    }
    
    const soilData = await SoilHealthService.getSoilHealthData(coordinates);
    
    // Populate form
    document.getElementById('soilType').value = soilData.soilType;
    document.getElementById('pH').value = soilData.pH;
    document.getElementById('nitrogen').value = soilData.nitrogen;
    document.getElementById('phosphorus').value = soilData.phosphorus;
    document.getElementById('potassium').value = soilData.potassium;
    document.getElementById('organicCarbon').value = soilData.organicCarbon;
    
    showToast('Soil data loaded!', `Found soil health card: ${soilData.cardNumber}`, 'success');
  } catch (error) {
    showToast('Soil data service error', 'Unable to connect to soil health database', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      </svg>
      Fetch from SHC
    `;
  }
}

// Form submission
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = {
    cropType: formData.get('cropType'),
    soilType: formData.get('soilType'),
    pH: parseFloat(formData.get('pH')),
    nitrogen: parseInt(formData.get('nitrogen')),
    phosphorus: parseInt(formData.get('phosphorus')),
    potassium: parseInt(formData.get('potassium')),
    organicCarbon: parseFloat(formData.get('organicCarbon'))
  };
  
  // Show loading
  document.getElementById('loading-card').classList.remove('hidden');
  const progressFill = document.getElementById('progress-fill');
  
  try {
    // Step 1: Weather data
    progressFill.style.width = '20%';
    showToast('Getting weather data...', 'Fetching current weather conditions');
    
    let coordinates;
    try {
      coordinates = await WeatherService.getUserLocation();
    } catch (error) {
      coordinates = null;
    }
    
    currentWeather = await WeatherService.getWeatherData(coordinates);
    
    // Step 2: Crop analysis (if image provided)
    if (cropImageFile) {
      progressFill.style.width = '50%';
      showToast('Analyzing crop image...', 'AI is analyzing your crop for deficiencies');
      currentCropAnalysis = await CropAnalysisService.analyzeCropImage(cropImageFile);
    }
    
    // Step 3: Generate recommendations
    progressFill.style.width = '80%';
    showToast('Generating recommendations...', 'Creating personalized fertilizer plan');
    
    const soilData = {
      soilType: data.soilType,
      pH: data.pH,
      nitrogen: data.nitrogen,
      phosphorus: data.phosphorus,
      potassium: data.potassium,
      organicCarbon: data.organicCarbon
    };
    
    currentResults = RecommendationEngine.generateRecommendation(
      data.cropType, soilData, currentWeather, currentCropAnalysis
    );
    
    progressFill.style.width = '100%';
    
    // Show results
    setTimeout(() => {
      document.getElementById('loading-card').classList.add('hidden');
      document.getElementById('recommendation-form').classList.add('hidden');
      document.getElementById('results-section').classList.remove('hidden');
      displayResults();
      showToast('Analysis complete!', `Sustainability score: ${currentResults.sustainabilityScore}%`, 'success');
    }, 500);
    
  } catch (error) {
    document.getElementById('loading-card').classList.add('hidden');
    showToast('Analysis failed', 'Please check your inputs and try again', 'error');
  }
}

// Display results
function displayResults() {
  const container = document.getElementById('results-content');
  container.innerHTML = `
    <div class="results-grid">
      <!-- Sustainability Score -->
      <div class="card sustainability-card">
        <div class="card-header">
          <h3 class="card-title">Sustainability Score</h3>
        </div>
        <div class="card-content">
          <div class="score-display">${currentResults.sustainabilityScore}%</div>
          <p class="score-text">${currentResults.sustainabilityScore >= 80 ? "Excellent sustainability!" : 
            currentResults.sustainabilityScore >= 60 ? "Good environmental stewardship" : 
            "Room for improvement"}</p>
        </div>
      </div>
      
      <!-- Fertilizer Recommendations -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Fertilizer Recommendations (kg/ha)</h3>
        </div>
        <div class="card-content">
          <div class="nutrient-list">
            <div class="nutrient-item">
              <span>Nitrogen (N):</span>
              <strong>${currentResults.fertilizer.nitrogen} kg/ha</strong>
            </div>
            <div class="nutrient-item">
              <span>Phosphorus (P₂O₅):</span>
              <strong>${currentResults.fertilizer.phosphorus} kg/ha</strong>
            </div>
            <div class="nutrient-item">
              <span>Potassium (K₂O):</span>
              <strong>${currentResults.fertilizer.potassium} kg/ha</strong>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Products -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recommended Products</h3>
        </div>
        <div class="card-content">
          ${currentResults.products.map(product => `
            <div class="product-item">
              <h4>${product.name}</h4>
              <p><strong>Quantity:</strong> ${product.quantity} kg/ha</p>
              <p><strong>Timing:</strong> ${product.applicationTiming}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Reset form
function resetForm() {
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('recommendation-form').classList.remove('hidden');
  document.getElementById('loading-card').classList.add('hidden');
  
  // Reset variables
  currentResults = null;
  currentWeather = null;
  currentCropAnalysis = null;
  cropImageFile = null;
  
  // Reset image preview
  document.getElementById('image-preview').classList.add('hidden');
  document.getElementById('cropImage').value = '';
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  // Set up form submission
  document.getElementById('recommendation-form').addEventListener('submit', handleFormSubmit);
  
  // Set up navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPage(link.dataset.page);
    });
  });
  
  console.log('Sustainable Fertilizer Usage Optimizer loaded successfully!');
});