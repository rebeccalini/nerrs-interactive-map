// Initialize map centered on the US
const map = L.map('map', {
    zoomControl: false // Move zoom control to bottom right so it doesn't overlap sidebar
}).setView([39.8283, -98.5795], 5);

// Add zoom control to bottom left
L.control.zoom({
    position: 'bottomleft'
}).addTo(map);

// Add Esri World Imagery (Satellite) basemap
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 17
}).addTo(map);

// Custom markers
const siteIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: #3498db; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.8);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
});

const stateIcon = L.divIcon({
    className: 'custom-state-icon',
    html: `<div style="background-color: #9b59b6; width: 22px; height: 22px; border-radius: 4px; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.9); transform: rotate(45deg);"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
});

const favSiteIcon = L.divIcon({
    className: 'custom-icon-fav',
    html: `<div style="background-color: #f1c40f; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.8);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
});

const favStateIcon = L.divIcon({
    className: 'custom-state-icon-fav',
    html: `<div style="background-color: #f1c40f; width: 22px; height: 22px; border-radius: 4px; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.9); transform: rotate(45deg);"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
});

const rejectedSiteIcon = L.divIcon({
    className: 'custom-icon-rej',
    html: `<div style="background-color: #e74c3c; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.8);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
});

const rejectedStateIcon = L.divIcon({
    className: 'custom-state-icon-rej',
    html: `<div style="background-color: #e74c3c; width: 22px; height: 22px; border-radius: 4px; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.9); transform: rotate(45deg);"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
});

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const closeBtn = document.getElementById('close-btn');
const siteTitle = document.getElementById('site-title');
const siteSubtitle = document.getElementById('site-subtitle');
const graphsContainer = document.getElementById('graphs-container');
const trendGraph = document.getElementById('trend-graph');
const boxGraph = document.getElementById('box-graph');
const barGraph = document.getElementById('bar-graph');
const trendStats = document.getElementById('trend-stats');

const favBtn = document.getElementById('favorite-btn');
const rejectBtn = document.getElementById('reject-btn');
const favList = document.getElementById('favorites-list');
const starBtns = document.querySelectorAll('.graph-star-btn');

function getDisplayTitle(siteName) {
    const markerData = mapMarkers[siteName];
    if (markerData && markerData.stats.state) {
        return `${siteName} (${markerData.stats.state})`;
    }
    return siteName;
}

// State
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let rejected = JSON.parse(localStorage.getItem('rejected') || '[]');
// Stores which graphs are favorited for each site: { "siteName": { "trend": true, "box": false } }
let favoriteGraphs = JSON.parse(localStorage.getItem('favoriteGraphs') || '{}'); 
const mapMarkers = {}; 
let currentSiteName = null;

const graphLabels = {
    'trend': 'Annual Trend',
    'box': 'pH Distribution',
    'bar': '% Below 7.8'
};

// Render Favorites List
function renderFavorites() {
    favList.innerHTML = '';
    if (favorites.length === 0) {
        favList.innerHTML = '<li class="empty-msg">No saved sites yet.</li>';
        return;
    }
    favorites.forEach(site => {
        const li = document.createElement('li');
        
        const siteNameDiv = document.createElement('div');
        siteNameDiv.textContent = getDisplayTitle(site);
        li.appendChild(siteNameDiv);
        
        // Check if any graphs are favorited
        const favData = favoriteGraphs[site];
        if (favData) {
            const activeGraphs = Object.keys(favData).filter(k => favData[k]).map(k => graphLabels[k]);
            if (activeGraphs.length > 0) {
                const subTextDiv = document.createElement('div');
                subTextDiv.className = 'fav-graphs-subtext';
                activeGraphs.forEach(graphName => {
                    const line = document.createElement('div');
                    line.textContent = '⭐ ' + graphName;
                    subTextDiv.appendChild(line);
                });
                li.appendChild(subTextDiv);
            }
        }
        
        li.onclick = () => {
            const markerData = mapMarkers[site];
            if (markerData) {
                handleMarkerClick(site, markerData.isState, markerData.stats);
                const point = map.project(markerData.marker.getLatLng(), map.getZoom());
                point.x += 325; 
                map.panTo(map.unproject(point, map.getZoom()), {animate: true});
            }
        };
        favList.appendChild(li);
    });
}

// Update Marker Icon Color
function updateMarkerIcon(siteName) {
    if (!mapMarkers[siteName]) return;
    const isFav = favorites.includes(siteName);
    const isRej = rejected.includes(siteName);
    const isState = mapMarkers[siteName].isState;
    
    let icon;
    if (isFav) {
        icon = isState ? favStateIcon : favSiteIcon;
    } else if (isRej) {
        icon = isState ? rejectedStateIcon : rejectedSiteIcon;
    } else {
        icon = isState ? stateIcon : siteIcon;
    }
    
    mapMarkers[siteName].marker.setIcon(icon);
}

// Favorite Button Click
favBtn.addEventListener('click', () => {
    if (!currentSiteName) return;
    
    if (favorites.includes(currentSiteName)) {
        favorites = favorites.filter(s => s !== currentSiteName);
        favBtn.classList.remove('active');
        favBtn.innerHTML = '★ Save to Favorites';
    } else {
        favorites.push(currentSiteName);
        favBtn.classList.add('active');
        favBtn.innerHTML = '★ Saved';
        
        // Remove from rejected if necessary
        if (rejected.includes(currentSiteName)) {
            rejected = rejected.filter(s => s !== currentSiteName);
            rejectBtn.classList.remove('active');
            rejectBtn.innerHTML = '✖ Not Useful';
            localStorage.setItem('rejected', JSON.stringify(rejected));
        }
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateMarkerIcon(currentSiteName);
    renderFavorites();
});

// Reject Button Click
rejectBtn.addEventListener('click', () => {
    if (!currentSiteName) return;
    
    if (rejected.includes(currentSiteName)) {
        rejected = rejected.filter(s => s !== currentSiteName);
        rejectBtn.classList.remove('active');
        rejectBtn.innerHTML = '✖ Not Useful';
    } else {
        rejected.push(currentSiteName);
        rejectBtn.classList.add('active');
        rejectBtn.innerHTML = '✖ Marked Useless';
        
        // Remove from favorites if necessary
        if (favorites.includes(currentSiteName)) {
            favorites = favorites.filter(s => s !== currentSiteName);
            favBtn.classList.remove('active');
            favBtn.innerHTML = '★ Save to Favorites';
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
        
        // Unstar all graphs if marked not useful
        if (favoriteGraphs[currentSiteName]) {
            favoriteGraphs[currentSiteName] = {};
            localStorage.setItem('favoriteGraphs', JSON.stringify(favoriteGraphs));
            starBtns.forEach(btn => btn.classList.remove('active'));
        }
        
        renderFavorites();
    }
    
    localStorage.setItem('rejected', JSON.stringify(rejected));
    updateMarkerIcon(currentSiteName);
});

// Graph Star Button Click
starBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!currentSiteName) return;
        const graphType = btn.getAttribute('data-graph');
        
        if (!favoriteGraphs[currentSiteName]) {
            favoriteGraphs[currentSiteName] = {};
        }
        
        // Toggle state
        const isActive = favoriteGraphs[currentSiteName][graphType];
        favoriteGraphs[currentSiteName][graphType] = !isActive;
        
        // Update UI
        if (!isActive) {
            btn.classList.add('active');
            
            // Auto-favorite site when a graph is starred
            if (!favorites.includes(currentSiteName)) {
                favorites.push(currentSiteName);
                favBtn.classList.add('active');
                favBtn.innerHTML = '★ Saved';
                localStorage.setItem('favorites', JSON.stringify(favorites));
                updateMarkerIcon(currentSiteName);
                
                // Remove from rejected if necessary
                if (rejected.includes(currentSiteName)) {
                    rejected = rejected.filter(s => s !== currentSiteName);
                    rejectBtn.classList.remove('active');
                    rejectBtn.innerHTML = '✖ Not Useful';
                    localStorage.setItem('rejected', JSON.stringify(rejected));
                }
            }
        } else {
            btn.classList.remove('active');
            
            // Auto-unsave site when all graphs are unstarred
            const favData = favoriteGraphs[currentSiteName];
            const hasAnyActive = favData && Object.values(favData).some(val => val === true);
            
            if (!hasAnyActive && favorites.includes(currentSiteName)) {
                favorites = favorites.filter(s => s !== currentSiteName);
                favBtn.classList.remove('active');
                favBtn.innerHTML = '★ Save to Favorites';
                localStorage.setItem('favorites', JSON.stringify(favorites));
                updateMarkerIcon(currentSiteName);
            }
        }
        
        localStorage.setItem('favoriteGraphs', JSON.stringify(favoriteGraphs));
        renderFavorites();
    });
});

// Close sidebar event
closeBtn.addEventListener('click', () => {
    sidebar.classList.add('hidden');
});

// Handle marker click
function handleMarkerClick(siteName, isState, stats) {
    const safeName = siteName.replace(/ /g, "_").replace(/'/g, "");
    
    currentSiteName = siteName;
    
    favBtn.style.display = 'inline-flex';
    if (favorites.includes(siteName)) {
        favBtn.classList.add('active');
        favBtn.innerHTML = '★ Saved';
    } else {
        favBtn.classList.remove('active');
        favBtn.innerHTML = '★ Save to Favorites';
    }
    
    rejectBtn.style.display = 'inline-flex';
    if (rejected.includes(siteName)) {
        rejectBtn.classList.add('active');
        rejectBtn.innerHTML = '✖ Marked Useless';
    } else {
        rejectBtn.classList.remove('active');
        rejectBtn.innerHTML = '✖ Not Useful';
    }
    
    // Update graph star buttons based on state
    starBtns.forEach(btn => {
        const graphType = btn.getAttribute('data-graph');
        const isActive = favoriteGraphs[siteName] && favoriteGraphs[siteName][graphType];
        if (isActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    siteTitle.textContent = getDisplayTitle(siteName);
    siteSubtitle.textContent = isState 
        ? "Statewide aggregated visualization suite."
        : "Station-specific visualization suite.";
        
    trendGraph.src = `assets/${safeName}_trend.png?v=12`;
    boxGraph.src = `assets/${safeName}_box.png?v=12`;
    barGraph.src = `assets/${safeName}_bar.png?v=12`;
    
    if (stats.equation && stats.r2 && stats.equation !== "N/A") {
        trendStats.innerHTML = `${stats.equation} &nbsp;&nbsp;|&nbsp;&nbsp; ${stats.r2} &nbsp;&nbsp;|&nbsp;&nbsp; ${stats.p}`;
        trendStats.style.display = "block";
    } else {
        trendStats.style.display = "none";
    }
    
    graphsContainer.style.display = 'block';
    sidebar.classList.remove('hidden');
}

// Fetch coordinates and plot
fetch(`assets/sites.json?t=${new Date().getTime()}`)
    .then(response => response.json())
    .then(data => {
        for (const [siteName, coords] of Object.entries(data)) {
            const isState = siteName.includes("overall");
            const marker = L.marker([coords.lat, coords.lng]).addTo(map);
            
            mapMarkers[siteName] = {
                marker: marker,
                isState: isState,
                stats: coords
            };
            
            updateMarkerIcon(siteName);
            
            marker.bindTooltip(getDisplayTitle(siteName).toUpperCase(), {
                direction: 'top',
                offset: [0, -10],
                className: 'custom-tooltip'
            });
            
            marker.on('click', () => {
                handleMarkerClick(siteName, isState, coords);
                
                // Shift the map center RIGHT by half the sidebar width (325px) 
                // so the marker appears centered in the visible left portion
                const point = map.project(marker.getLatLng(), map.getZoom());
                point.x += 325; 
                map.panTo(map.unproject(point, map.getZoom()), {animate: true});
            });
        }
        
        // Initialize favorites list UI
        renderFavorites();
    })
    .catch(err => console.error("Error loading sites.json:", err));
