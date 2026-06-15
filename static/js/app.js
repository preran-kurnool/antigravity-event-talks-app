// State Management
let allReleaseNotes = [];
let filteredNotes = [];
let currentFilter = 'all'; // 'all', 'feature', 'change', 'deprecation', 'fix'
let searchQuery = '';
let currentSort = 'newest'; // 'newest', 'oldest'
let activeTweetItem = null;

// Progress Ring Configuration
const CIRCLE_RADIUS = 11;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshSpinner = document.getElementById('refresh-spinner');
const lastUpdatedText = document.getElementById('last-updated-text');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const notesGrid = document.getElementById('notes-grid');

// Search & Sort Elements
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const sortSelect = document.getElementById('sort-select');
const activeFiltersContainer = document.getElementById('active-filters-container');
const badgesWrapper = document.getElementById('badges-wrapper');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// Stats Elements
const statCards = document.querySelectorAll('.stat-card');
const countAll = document.getElementById('count-all');
const countFeature = document.getElementById('count-feature');
const countChange = document.getElementById('count-change');
const countDeprecation = document.getElementById('count-deprecation');
const countFix = document.getElementById('count-fix');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const progressCircle = document.getElementById('progress-circle');
const publishTweetBtn = document.getElementById('publish-tweet-btn');
const xPreviewTitle = document.getElementById('x-preview-title');
const xPreviewDesc = document.getElementById('x-preview-desc');

// Initialize Progress Ring
if (progressCircle) {
    progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
    progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    resetFiltersBtn.addEventListener('click', resetAllFilters);
    clearFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Search input handlers
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSort();
    });
    
    // Sorting handler
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndSort();
    });
    
    // Stat card filter handlers
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.getAttribute('data-filter');
            setCategoryFilter(filterType);
        });
    });
    
    // Modal Close handlers
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Tweet editor text handler
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Publish tweet button handler
    publishTweetBtn.addEventListener('click', publishTweet);
});

// Toast Helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2" stroke-linecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/></svg>`;
    } else {
        iconSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="8" x2="12.01" y2="8" stroke-width="2"/></svg>`;
    }
    
    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);
    
    // Fade out after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Fetch Notes from Backend
async function fetchReleaseNotes(forceRefresh = false) {
    // Show Loading
    setLoadingState(true);
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allReleaseNotes = data.notes;
            
            // Update UI components
            lastUpdatedText.textContent = `Last updated: ${data.last_updated}`;
            updateDashboardMetrics();
            applyFiltersAndSort();
            
            if (forceRefresh) {
                showToast("Release notes refreshed successfully!", "success");
            }
        } else {
            throw new Error(data.error || "Failed to fetch updates");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        errorMessage.textContent = err.message || "Could not establish connection to the update feed.";
        setLoadingState(false);
        notesGrid.style.display = 'none';
        errorState.style.display = 'flex';
        showToast("Error retrieving release notes feed", "error");
    }
}

// UI State Toggles
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshSpinner.classList.add('spin');
        lastUpdatedText.textContent = "Updating feed...";
        document.querySelector('.status-dot').classList.add('loading');
        
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        notesGrid.style.display = 'none';
    } else {
        refreshBtn.disabled = false;
        refreshSpinner.classList.remove('spin');
        document.querySelector('.status-dot').classList.remove('loading');
        loadingState.style.display = 'none';
    }
}

// Update Dashboard Statistics counts
function updateDashboardMetrics() {
    countAll.textContent = allReleaseNotes.length;
    
    const countByType = {
        Feature: 0,
        Change: 0,
        Deprecation: 0,
        Fix: 0
    };
    
    allReleaseNotes.forEach(note => {
        const t = note.type.toLowerCase();
        if (t.includes('feature')) countByType.Feature++;
        else if (t.includes('change')) countByType.Change++;
        else if (t.includes('deprecation') || t.includes('deprecate')) countByType.Deprecation++;
        else if (t.includes('fix')) countByType.Fix++;
    });
    
    countFeature.textContent = countByType.Feature;
    countChange.textContent = countByType.Change;
    countDeprecation.textContent = countByType.Deprecation;
    countFix.textContent = countByType.Fix;
}

// Set Category Filter (via Dashboard click)
function setCategoryFilter(filterType) {
    currentFilter = filterType.toLowerCase();
    
    // Update active UI classes
    statCards.forEach(card => {
        if (card.getAttribute('data-filter') === filterType) {
            card.classList.add('active-filter');
        } else {
            card.classList.remove('active-filter');
        }
    });
    
    applyFiltersAndSort();
}

// Handle Client Side Search
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    
    if (searchQuery.length > 0) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    applyFiltersAndSort();
}

// Reset Filters
function resetAllFilters() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    setCategoryFilter('all');
}

// Filter and Sort Processing
function applyFiltersAndSort() {
    setLoadingState(false);
    
    filteredNotes = allReleaseNotes.filter(note => {
        // 1. Category Filter match
        let matchesCategory = true;
        if (currentFilter !== 'all') {
            const t = note.type.toLowerCase();
            if (currentFilter === 'feature') {
                matchesCategory = t.includes('feature');
            } else if (currentFilter === 'change') {
                matchesCategory = t.includes('change');
            } else if (currentFilter === 'deprecation') {
                matchesCategory = (t.includes('deprecation') || t.includes('deprecate'));
            } else if (currentFilter === 'fix') {
                matchesCategory = t.includes('fix');
            }
        }
        
        // 2. Search query match
        let matchesSearch = true;
        if (searchQuery) {
            matchesSearch = note.type.toLowerCase().includes(searchQuery) ||
                            note.date.toLowerCase().includes(searchQuery) ||
                            note.text_content.toLowerCase().includes(searchQuery);
        }
        
        return matchesCategory && matchesSearch;
    });
    
    // Sorting
    filteredNotes.sort((a, b) => {
        const dateA = new Date(a.raw_date || a.date);
        const dateB = new Date(b.raw_date || b.date);
        
        if (currentSort === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // Update Filter Badges Indicators
    updateFilterBadgesUI();
    
    // Render Results
    renderNotesGrid();
}

// Manage Filter Badges Row UI
function updateFilterBadgesUI() {
    badgesWrapper.innerHTML = '';
    let showBadges = false;
    
    if (currentFilter !== 'all') {
        showBadges = true;
        const badge = createBadgeElement(`Category: ${currentFilter}`, () => setCategoryFilter('all'));
        badgesWrapper.appendChild(badge);
    }
    
    if (searchQuery) {
        showBadges = true;
        const badge = createBadgeElement(`Search: "${searchQuery}"`, () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            applyFiltersAndSort();
        });
        badgesWrapper.appendChild(badge);
    }
    
    activeFiltersContainer.style.display = showBadges ? 'flex' : 'none';
}

function createBadgeElement(text, onRemove) {
    const badge = document.createElement('div');
    badge.className = 'filter-badge';
    badge.innerHTML = `
        <span>${text}</span>
        <button aria-label="Remove filter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    badge.querySelector('button').addEventListener('click', onRemove);
    return badge;
}

// Render release notes cards
function renderNotesGrid() {
    notesGrid.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        notesGrid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    notesGrid.style.display = 'grid';
    
    filteredNotes.forEach(item => {
        const card = document.createElement('article');
        
        // Match specific note CSS classes based on type
        const typeClass = item.type.toLowerCase();
        let classModifier = 'note-general';
        let badgeModifier = 'badge-general';
        
        if (typeClass.includes('feature')) {
            classModifier = 'note-feature';
            badgeModifier = 'badge-feature';
        } else if (typeClass.includes('change')) {
            classModifier = 'note-change';
            badgeModifier = 'badge-change';
        } else if (typeClass.includes('deprecation') || typeClass.includes('deprecate')) {
            classModifier = 'note-deprecation';
            badgeModifier = 'badge-deprecation';
        } else if (typeClass.includes('fix')) {
            classModifier = 'note-fix';
            badgeModifier = 'badge-fix';
        }
        
        card.className = `note-card ${classModifier}`;
        card.setAttribute('data-id', item.id);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="badge ${badgeModifier}">${item.type}</span>
                    <time class="card-date" datetime="${item.raw_date}">${item.date}</time>
                </div>
                <div class="card-actions-top">
                    <button class="icon-btn btn-share-x" title="Compose post on X" aria-label="Compose post on X">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${item.html_content}
            </div>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="ext-link-wrapper">
                    <span>View in Official Docs</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                </a>
            </div>
        `;
        
        // Add click listener to the Tweet button
        card.querySelector('.btn-share-x').addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetComposer(item);
        });
        
        notesGrid.appendChild(card);
    });
}

// Generate the pre-populated X/Twitter text
function generateTweetText(item) {
    const prefix = `📢 BigQuery ${item.type} Update (${item.date})\n\n`;
    const hashtags = `\n\n#BigQuery #GoogleCloud`;
    const detailsUrl = `\nRead details: ${item.link}`;
    
    const reservedChars = prefix.length + hashtags.length + detailsUrl.length;
    const maxContentChars = 280 - reservedChars;
    
    let content = item.text_content;
    
    // Truncate if exceeds the limits
    if (content.length > maxContentChars) {
        content = content.substring(0, maxContentChars - 3) + "...";
    }
    
    return `${prefix}${content}${detailsUrl}${hashtags}`;
}

// Open Tweet Composer Modal
function openTweetComposer(item) {
    activeTweetItem = item;
    
    // Formulate default tweet text
    const defaultText = generateTweetText(item);
    tweetTextarea.value = defaultText;
    
    // Set X link attachment details
    xPreviewTitle.textContent = `BigQuery Release Notes (${item.date})`;
    
    // Clean up preview description
    let previewDesc = item.text_content;
    if (previewDesc.length > 120) {
        previewDesc = previewDesc.substring(0, 117) + "...";
    }
    xPreviewDesc.textContent = previewDesc;
    
    // Open Modal
    tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Calculate initial character numbers
    updateCharCounter();
    
    // Focus textarea
    setTimeout(() => {
        tweetTextarea.focus();
        tweetTextarea.setSelectionRange(tweetTextarea.value.length, tweetTextarea.value.length);
    }, 100);
}

// Close Tweet Composer Modal
function closeTweetModal() {
    tweetModal.style.display = 'none';
    document.body.style.overflow = '';
    activeTweetItem = null;
}

// Update Character Counter & progress ring color
function updateCharCounter() {
    const maxChars = 280;
    const textLength = tweetTextarea.value.length;
    const remaining = maxChars - textLength;
    
    charCounter.textContent = remaining;
    
    // Colors & warning classes based on remaining characters
    charCounter.className = 'char-count';
    if (remaining <= 20 && remaining >= 0) {
        charCounter.classList.add('warning');
    } else if (remaining < 0) {
        charCounter.classList.add('error');
    }
    
    // Progress Circle Stroke Calculation
    if (progressCircle) {
        const percentage = Math.min(textLength / maxChars, 1);
        const strokeOffset = CIRCLE_CIRCUMFERENCE - (percentage * CIRCLE_CIRCUMFERENCE);
        progressCircle.style.strokeDashoffset = strokeOffset;
        
        // Progress Ring Colors
        if (remaining < 0) {
            progressCircle.style.stroke = '#ef4444'; // Red
        } else if (remaining <= 20) {
            progressCircle.style.stroke = '#f59e0b'; // Amber
        } else {
            progressCircle.style.stroke = '#1d9bf0'; // Twitter Blue
        }
    }
    
    // Disable tweet button if over character limit or empty
    if (textLength === 0 || remaining < 0) {
        publishTweetBtn.disabled = true;
        publishTweetBtn.style.opacity = '0.5';
        publishTweetBtn.style.pointerEvents = 'none';
    } else {
        publishTweetBtn.disabled = false;
        publishTweetBtn.style.opacity = '1';
        publishTweetBtn.style.pointerEvents = 'auto';
    }
}

// Trigger standard Twitter Web Intent sharing
function publishTweet() {
    const tweetText = tweetTextarea.value;
    if (!tweetText || tweetText.length > 280) {
        showToast("Invalid tweet content length", "error");
        return;
    }
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    // Open X Intent
    window.open(intentUrl, '_blank', 'width=550,height=420,toolbar=0,status=0');
    
    showToast("Opening X/Twitter to publish your post...", "success");
    closeTweetModal();
}
