// ============================================
// Medo TV - JavaScript Application
// ============================================

// API Configuration
const API_BASE = 'https://api.dfkz.site/alooy/';
const ITEMS_PER_PAGE = 20;

// State Management
const state = {
    allContent: [],
    filteredContent: [],
    currentPage: 1,
    searchQuery: '',
    selectedCategory: 'all',
    favorites: JSON.parse(localStorage.getItem('medo-tv-favorites')) || [],
    watching: JSON.parse(localStorage.getItem('medo-tv-watching')) || [],
    currentFilter: 'all',
    selectedContent: null,
    currentEpisode: null
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const contentGrid = document.getElementById('contentGrid');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const detailsModal = document.getElementById('detailsModal');
const playerModal = document.getElementById('playerModal');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const filterBtns = document.querySelectorAll('.filter-btn');
const navBtns = document.querySelectorAll('.nav-btn');

// ============================================
// Initialize Application
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 Medo TV - Starting Application');
    loadContent();
    setupEventListeners();
});

// ============================================
// Event Listeners Setup
// ============================================
function setupEventListeners() {
    // Search
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.selectedCategory = e.target.dataset.category;
            state.currentPage = 1;
            filterAndDisplay();
        });
    });

    // Navigation Menu
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentFilter = e.target.dataset.filter;
            state.currentPage = 1;
            filterAndDisplay();
        });
    });

    // Pagination
    prevBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            displayContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    nextBtn.addEventListener('click', () => {
        const maxPages = Math.ceil(state.filteredContent.length / ITEMS_PER_PAGE);
        if (state.currentPage < maxPages) {
            state.currentPage++;
            displayContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Modal Close Buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
            const video = document.getElementById('videoPlayer');
            if (video) video.pause();
        });
    });

    // Close modal when clicking outside
    [detailsModal, playerModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                const video = document.getElementById('videoPlayer');
                if (video) video.pause();
            }
        });
    });
}

// ============================================
// Load Content from API
// ============================================
async function loadContent() {
    try {
        loading.classList.remove('hidden');
        errorMsg.classList.remove('show');
        
        console.log('📡 Fetching content from API...');
        const response = await fetch(API_BASE);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result && Array.isArray(data.result)) {
            state.allContent = data.result;
            console.log(`✅ Loaded ${state.allContent.length} items`);
            filterAndDisplay();
        } else {
            throw new Error('Invalid data format');
        }
    } catch (error) {
        console.error('❌ Error loading content:', error);
        showError('فشل في تحميل البيانات. يرجى محاولة تحديث الصفحة');
    } finally {
        loading.classList.add('hidden');
    }
}

// ============================================
// Filter and Display Content
// ============================================
function filterAndDisplay() {
    let filtered = [...state.allContent];

    // Apply category filter
    if (state.selectedCategory !== 'all') {
        filtered = filterByCategory(filtered, state.selectedCategory);
    }

    // Apply search filter
    if (state.searchQuery) {
        filtered = filtered.filter(item =>
            item.title.toLowerCase().includes(state.searchQuery.toLowerCase())
        );
    }

    // Apply navigation filter
    if (state.currentFilter === 'favorites') {
        filtered = filtered.filter(item =>
            state.favorites.some(fav => fav.id === item.id)
        );
    } else if (state.currentFilter === 'watching') {
        filtered = filtered.filter(item =>
            state.watching.some(watch => watch.id === item.id)
        );
    }

    state.filteredContent = filtered;
    state.currentPage = 1;
    displayContent();
    console.log(`🔍 Filtered: ${filtered.length} items`);
}

// ============================================
// Filter by Category
// ============================================
function filterByCategory(content, category) {
    const categoryKeywords = {
        ramadan: ['رمضان'],
        khaliji: ['خليجي'],
        arabic: ['عربي'],
        turkish: ['تركي', 'مدبلج'],
        foreign: ['اجنبي', 'English']
    };

    if (!categoryKeywords[category]) return content;

    return content.filter(item => {
        const title = item.title.toLowerCase();
        return categoryKeywords[category].some(keyword =>
            title.includes(keyword.toLowerCase())
        );
    });
}

// ============================================
// Display Content
// ============================================
function displayContent() {
    contentGrid.innerHTML = '';

    const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageContent = state.filteredContent.slice(start, end);

    if (pageContent.length === 0) {
        contentGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #aaa;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: var(--primary-color);"></i>
                <p style="font-size: 1.1rem;">لا توجد نتائج</p>
            </div>
        `;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    pageContent.forEach(item => {
        const contentElement = createContentElement(item);
        contentGrid.appendChild(contentElement);
    });

    updatePagination();
}

// ============================================
// Create Content Element
// ============================================
function createContentElement(item) {
    const div = document.createElement('div');
    div.className = 'content-item';

    const isFavorite = state.favorites.some(fav => fav.id === item.id);
    const favoriteClass = isFavorite ? 'active' : '';

    div.innerHTML = `
        ${isFavorite ? '<div class="favorite-badge"><i class="fas fa-heart"></i></div>' : ''}
        <div class="content-image">
            <img src="${item.image}" alt="${item.title}" 
                 onerror="this.src='https://via.placeholder.com/180x270/1a1a1a/e50914?text=No+Image'">
            <div class="content-overlay">
                <div class="content-title">${item.title}</div>
                <div class="content-episodes">${item.episodes}</div>
                <div class="content-buttons">
                    <button class="content-btn btn-watch" title="شاهد الآن">
                        <i class="fas fa-play"></i> شاهد
                    </button>
                    <button class="content-btn btn-favorite ${favoriteClass}" title="إضافة للمفضلة">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    div.querySelector('.btn-watch').addEventListener('click', (e) => {
        e.stopPropagation();
        showDetails(item);
    });

    div.querySelector('.btn-favorite').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(item, e.target.closest('.btn-favorite'));
    });

    div.addEventListener('click', () => showDetails(item));

    return div;
}

// ============================================
// Show Details Modal
// ============================================
function showDetails(item) {
    state.selectedContent = item;

    document.getElementById('detailsImage').src = item.image;
    document.getElementById('detailsTitle').textContent = item.title;
    document.getElementById('detailsEpisodes').textContent = item.episodes;

    const favoriteBtn = document.getElementById('favoriteBtn');
    const isFavorite = state.favorites.some(fav => fav.id === item.id);
    favoriteBtn.classList.toggle('active', isFavorite);

    document.getElementById('playBtn').onclick = playContent;
    favoriteBtn.onclick = toggleDetailsModalFavorite;

    detailsModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// ============================================
// Toggle Favorite
// ============================================
function toggleFavorite(item, button) {
    const index = state.favorites.findIndex(fav => fav.id === item.id);

    if (index > -1) {
        state.favorites.splice(index, 1);
        button.classList.remove('active');
        console.log(`❌ Removed from favorites: ${item.title}`);
    } else {
        state.favorites.push(item);
        button.classList.add('active');
        console.log(`❤️ Added to favorites: ${item.title}`);
    }

    localStorage.setItem('medo-tv-favorites', JSON.stringify(state.favorites));
}

// ============================================
// Toggle Favorite in Modal
// ============================================
function toggleDetailsModalFavorite() {
    if (state.selectedContent) {
        const button = document.getElementById('favoriteBtn');
        toggleFavorite(state.selectedContent, button);
    }
}

// ============================================
// Play Content
// ============================================
async function playContent() {
    try {
        const id = state.selectedContent.id;
        console.log(`▶️ Playing: ${state.selectedContent.title} (ID: ${id})`);
        
        const response = await fetch(`${API_BASE}series.php?id=${id}`);
        const data = await response.json();

        if (data.result && data.result.length > 0) {
            detailsModal.classList.remove('show');
            showPlayer(data.result, state.selectedContent);

            // Add to watching list
            if (!state.watching.some(w => w.id === state.selectedContent.id)) {
                state.watching.push(state.selectedContent);
                localStorage.setItem('medo-tv-watching', JSON.stringify(state.watching));
                console.log(`📺 Added to watching: ${state.selectedContent.title}`);
            }
        } else {
            showError('لا توجد حلقات متاحة');
        }
    } catch (error) {
        console.error('❌ Error playing content:', error);
        showError('حدث خطأ أثناء تحميل المحتوى');
    }
}

// ============================================
// Show Player
// ============================================
function showPlayer(episodes, content) {
    const episodesList = document.getElementById('episodesList');
    const videoPlayer = document.getElementById('videoPlayer');

    episodesList.innerHTML = '';

    console.log(`🎬 Loading ${episodes.length} episodes`);

    episodes.forEach((episode, index) => {
        const episodeBtn = document.createElement('button');
        episodeBtn.className = 'episode-item';
        if (index === 0) episodeBtn.classList.add('active');

        episodeBtn.innerHTML = `
            <strong>الحلقة ${index + 1}</strong>
            <small>${episode.title || content.title}</small>
        `;

        episodeBtn.addEventListener('click', () => {
            episodesList.querySelectorAll('.episode-item').forEach(btn =>
                btn.classList.remove('active')
            );
            episodeBtn.classList.add('active');
            playEpisode(episode, videoPlayer, index + 1);
        });

        episodesList.appendChild(episodeBtn);
    });

    // Play first episode
    if (episodes.length > 0) {
        playEpisode(episodes[0], videoPlayer, 1);
    }

    playerModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// ============================================
// Play Episode
// ============================================
function playEpisode(episode, player, episodeNum) {
    if (episode.url) {
        player.src = episode.url;
        player.play();
        console.log(`▶️ Playing episode ${episodeNum}`);
    }
}

// ============================================
// Handle Search
// ============================================
function handleSearch() {
    state.searchQuery = searchInput.value.trim();
    state.currentPage = 1;
    if (state.searchQuery) {
        console.log(`🔎 Searching for: ${state.searchQuery}`);
    }
    filterAndDisplay();
}

// ============================================
// Update Pagination
// ============================================
function updatePagination() {
    const maxPages = Math.ceil(state.filteredContent.length / ITEMS_PER_PAGE);
    pageInfo.textContent = `الصفحة ${state.currentPage} من ${maxPages}`;

    prevBtn.disabled = state.currentPage === 1;
    nextBtn.disabled = state.currentPage === maxPages;
}

// ============================================
// Show Error Message
// ============================================
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
    console.warn('⚠️ Error:', message);
    setTimeout(() => {
        errorMsg.classList.remove('show');
    }, 5000);
}

// Close modal when pressing ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        [detailsModal, playerModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
        const video = document.getElementById('videoPlayer');
        if (video) video.pause();
    }
});

console.log('✅ Application initialized successfully!');
