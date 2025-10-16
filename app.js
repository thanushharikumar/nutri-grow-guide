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
async function handleImageUpload(event) {
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
  
  // Read and convert to base64
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64Image = e.target.result.split(",")[1]; // Extract base64 only
    
    // Show preview
    const img = new Image();
    img.src = e.target.result;
    img.onload = async () => {
      // Store base64 in cropImageFile for backend processing
      cropImageFile = base64Image;
      
      // Update preview
      const preview = document.getElementById('image-preview');
      const previewImg = document.getElementById('preview-img');
      previewImg.src = e.target.result;
      preview.classList.remove('hidden');
      
      showToast('Image ready', 'Crop image loaded successfully', 'success');
    };
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
    // Step 1: Get location
    progressFill.style.width = '20%';
    showToast('Getting location...', 'Fetching your coordinates');
    
    let coordinates = null;
    try {
      coordinates = await WeatherService.getUserLocation();
    } catch (error) {
      console.log('Using default coordinates');
    }
    
    // Step 2: Call backend Edge Function
    progressFill.style.width = '50%';
    showToast('Analyzing data...', 'Processing soil, weather, and image data');
    
    const payload = {
      cropType: data.cropType,
      soilType: data.soilType,
      pH: data.pH,
      nitrogen: data.nitrogen,
      phosphorus: data.phosphorus,
      potassium: data.potassium,
      organicCarbon: data.organicCarbon,
      latitude: coordinates?.lat || null,
      longitude: coordinates?.lon || null,
      imageBase64: cropImageFile || null
    };
    
    console.log('Calling recommendation API with payload:', { 
      ...payload, 
      imageBase64: cropImageFile ? `${cropImageFile.substring(0, 50)}...` : null 
    });
    
    const response = await fetch('https://bkqzrfuyjugegxcqxwuo.supabase.co/functions/v1/getFertilizerRecommendation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcXpyZnV5anVnZWd4Y3F4d3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNDUyNDgsImV4cCI6MjA3MzgyMTI0OH0.Nj4n7IvvZutma2w-0leJa78n9l03rngzuxt9MQS5N5A'
      },
      body: JSON.stringify(payload)
    });
    
    progressFill.style.width = '80%';
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate recommendation');
    }
    
    currentResults = await response.json();
    console.log('Received recommendation:', currentResults);
    
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
              <strong>${currentResults.fertilizer?.nitrogen || 0} kg/ha</strong>
            </div>
            <div class="nutrient-item">
              <span>Phosphorus (P₂O₅):</span>
              <strong>${currentResults.fertilizer?.phosphorus || 0} kg/ha</strong>
            </div>
            <div class="nutrient-item">
              <span>Potassium (K₂O):</span>
              <strong>${currentResults.fertilizer?.potassium || 0} kg/ha</strong>
            </div>
          </div>
          ${currentResults.nutrientAnalysis ? `
            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 0.5rem;">
              <strong>Image Analysis:</strong> ${currentResults.nutrientAnalysis}
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Products -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recommended Products</h3>
        </div>
        <div class="card-content">
          ${currentResults.products?.map(product => `
            <div class="product-item">
              <h4>${product.name}</h4>
              <p><strong>Quantity:</strong> ${product.quantity} kg/ha</p>
              <p><strong>Timing:</strong> ${product.applicationTiming}</p>
            </div>
          `).join('') || '<p>No products recommended</p>'}
        </div>
      </div>
      
      <!-- Weather Considerations -->
      ${currentResults.weatherConsiderations?.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Weather Considerations</h3>
        </div>
        <div class="card-content">
          <ul style="list-style: disc; padding-left: 1.5rem;">
            ${currentResults.weatherConsiderations.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}
      
      <!-- Cost & Yield -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Expected Impact</h3>
        </div>
        <div class="card-content">
          <div class="nutrient-list">
            <div class="nutrient-item">
              <span>Expected Yield Increase:</span>
              <strong>${currentResults.expectedYieldIncrease || 0}%</strong>
            </div>
            <div class="nutrient-item">
              <span>Estimated Cost:</span>
              <strong>₹${currentResults.costEstimate || 0}/ha</strong>
            </div>
          </div>
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