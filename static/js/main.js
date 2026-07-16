// --- CineMatch.AI JS Implementation ---

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allMovies = [];
    let activeSuggestionIndex = -1;
    let movieDetailsCache = {}; // Cache to store fetched TMDB details

    // DOM Elements
    const movieSearch = document.getElementById('movieSearch');
    const recommendBtn = document.getElementById('recommendBtn');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const loadingState = document.getElementById('loadingState');
    const loadingMessage = document.getElementById('loadingMessage');
    const recommendationsSection = document.getElementById('recommendationsSection');
    const recommendationsTitle = document.getElementById('recommendationsTitle');
    const recommendationsGrid = document.getElementById('recommendationsGrid');



    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalPoster = document.getElementById('modalPoster');
    const modalTitle = document.getElementById('modalTitle');
    const modalRating = document.getElementById('modalRating');
    const modalYear = document.getElementById('modalYear');
    const modalRuntime = document.getElementById('modalRuntime');
    const modalMatchScore = document.getElementById('modalMatchScore');
    const modalGenres = document.getElementById('modalGenres');
    const modalOverview = document.getElementById('modalOverview');

    // Loading Messages Cycling list
    const loadingPhrases = [
        "Analyzing movie plot tags...",
        "Extracting NLP keywords...",
        "Calculating cosine similarity...",
        "Sorting vectors in hyperspace...",
        "Contacting TMDB for high-res posters...",
        "Formatting recommendation grid..."
    ];
    let loadingInterval = null;



    // Fetch movie list from backend for autocompletion
    fetch('/api/movies')
        .then(res => res.json())
        .then(data => {
            allMovies = data;
            console.log(`Loaded ${allMovies.length} movie suggestions.`);
        })
        .catch(err => console.error("Failed to load movie suggestions:", err));

    // --- Autocomplete logic ---
    movieSearch.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        activeSuggestionIndex = -1;
        
        if (!query) {
            hideDropdown();
            return;
        }

        // Filter movie titles
        const matches = allMovies.filter(title => {
            const titleLower = title.toLowerCase();
            return titleLower.startsWith(query) || titleLower.includes(" " + query);
        }).slice(0, 8); // Limit to 8 suggestions

        if (matches.length > 0) {
            renderSuggestions(matches, query);
        } else {
            // General filter fallback if no words start with search term
            const fallbackMatches = allMovies.filter(title => title.toLowerCase().includes(query)).slice(0, 8);
            if (fallbackMatches.length > 0) {
                renderSuggestions(fallbackMatches, query);
            } else {
                hideDropdown();
            }
        }
    });

    // Keyboard navigation in suggestions dropdown
    movieSearch.addEventListener('keydown', (e) => {
        const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex > -1) {
                selectSuggestion(items[activeSuggestionIndex].textContent);
            } else {
                triggerRecommendation();
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });

    function renderSuggestions(matches, query) {
        autocompleteDropdown.innerHTML = '';
        matches.forEach(title => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            
            // Highlight matching text portion
            const index = title.toLowerCase().indexOf(query);
            if (index !== -1) {
                const before = title.substring(0, index);
                const match = title.substring(index, index + query.length);
                const after = title.substring(index + query.length);
                div.innerHTML = `${before}<span>${match}</span>${after}`;
            } else {
                div.textContent = title;
            }

            div.addEventListener('click', () => selectSuggestion(title));
            autocompleteDropdown.appendChild(div);
        });
        autocompleteDropdown.classList.remove('hidden');
    }

    function highlightSuggestion(items) {
        items.forEach((item, index) => {
            if (index === activeSuggestionIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
                movieSearch.value = item.textContent;
            } else {
                item.classList.remove('active');
            }
        });
    }

    function selectSuggestion(title) {
        movieSearch.value = title;
        hideDropdown();
        triggerRecommendation();
    }

    function hideDropdown() {
        autocompleteDropdown.classList.add('hidden');
        autocompleteDropdown.innerHTML = '';
        activeSuggestionIndex = -1;
    }

    // Hide dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!movieSearch.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            hideDropdown();
        }
    });

    // --- Recommendation Logic ---
    recommendBtn.addEventListener('click', triggerRecommendation);

    function triggerRecommendation() {
        const movieQuery = movieSearch.value.trim();
        if (!movieQuery) return;

        hideDropdown();
        showLoading(true);
        recommendationsSection.classList.add('hidden');

        const params = new URLSearchParams({ movie: movieQuery });
        fetch(`/api/recommend?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    displayRecommendations(data);
                } else {
                    alert(data.message || "An error occurred fetching recommendations.");
                    showLoading(false);
                }
            })
            .catch(err => {
                console.error("API Error:", err);
                alert("Failed to connect to recommendation service.");
                showLoading(false);
            });
    }

    function showLoading(show) {
        if (show) {
            loadingState.classList.remove('hidden');
            let counter = 0;
            loadingMessage.textContent = loadingPhrases[0];
            loadingInterval = setInterval(() => {
                counter = (counter + 1) % loadingPhrases.length;
                loadingMessage.textContent = loadingPhrases[counter];
            }, 1200);
        } else {
            loadingState.classList.add('hidden');
            if (loadingInterval) {
                clearInterval(loadingInterval);
                loadingInterval = null;
            }
        }
    }

    async function displayRecommendations(data) {
        const inputMovie = data.input_movie;
        const list = data.recommendations;
        
        recommendationsTitle.textContent = `Recommendations because you liked "${inputMovie.title}"`;
        recommendationsGrid.innerHTML = '';

        // Iterate through recommendations and populate card placeholders
        for (const item of list) {
            const card = createMovieCardPlaceholder(item);
            recommendationsGrid.appendChild(card);
            
            // Async load TMDB poster and metadata
            loadCardMetadata(card, item.movie_id, item.score);
        }

        showLoading(false);
        recommendationsSection.classList.remove('hidden');
        
        // Smooth scroll to recommendations
        recommendationsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function createMovieCardPlaceholder(movie) {
        const div = document.createElement('div');
        div.className = 'movie-card';
        div.setAttribute('data-id', movie.movie_id);
        div.setAttribute('data-title', movie.title);

        div.innerHTML = `
            <div class="poster-container">
                <div class="card-fallback-info">
                    <i class="fa-solid fa-clapperboard"></i>
                    <span>Loading details...</span>
                </div>
            </div>
            <div class="card-bottom-info">
                <h4 class="card-bottom-title">${movie.title}</h4>
                <div class="card-bottom-meta">
                    <span class="match-score">${Math.round(movie.score * 100)}% Match</span>
                </div>
            </div>
        `;
        return div;
    }

    function loadCardMetadata(cardElement, tmdbId, matchScore, clientApiKey) {
        const params = new URLSearchParams({ movie_id: tmdbId });
        if (clientApiKey) {
            params.append('api_key', clientApiKey);
        }

        fetch(`/api/movie_details?${params.toString()}`)
            .then(res => res.json())
            .then(details => {
                const posterContainer = cardElement.querySelector('.poster-container');
                const bottomMeta = cardElement.querySelector('.card-bottom-meta');
                
                let posterSrc = '';
                let ratingHtml = '';
                let year = 'N/A';
                
                if (details.success && details.poster_path) {
                    let posterSrc = details.poster_path;
                    if (!posterSrc.startsWith('http')) {
                        posterSrc = `https://image.tmdb.org/t/p/w500${posterSrc}`;
                    }
                    const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
                    ratingHtml = `<span class="rating-badge"><i class="fa-solid fa-star"></i> ${rating}</span>`;
                    
                    if (details.release_date) {
                        year = details.release_date.split('-')[0];
                    }
                    
                    // Cache details for click modal
                    movieDetailsCache[tmdbId] = {
                        ...details,
                        matchScore: matchScore
                    };
                    
                    // Update card design to fully detailed hover state
                    posterContainer.innerHTML = `
                        <img src="${posterSrc}" alt="${details.title}" class="poster-img" loading="lazy">
                        <div class="card-overlay">
                            <h4 class="card-title">${details.title}</h4>
                            <div class="card-meta">
                                <span class="rating-badge"><i class="fa-solid fa-star"></i> ${rating}</span>
                                <span class="match-score">${Math.round(matchScore * 100)}% Match</span>
                            </div>
                        </div>
                    `;
                    
                    bottomMeta.innerHTML = `
                        ${ratingHtml}
                        <span style="margin-left:auto; color: var(--text-secondary); font-size: 0.8rem;">${year}</span>
                    `;

                    // Add click event to open details modal
                    cardElement.addEventListener('click', () => openMovieDetails(tmdbId));

                } else {
                    // Fail state: missing API key or bad network
                    const displayTitle = cardElement.getAttribute('data-title');
                    
                    posterContainer.innerHTML = `
                        <div class="card-fallback-info">
                            <i class="fa-solid fa-circle-exclamation" style="color: var(--warning)"></i>
                            <span style="font-size: 0.9rem; font-weight:600; padding: 0 10px;">Poster Unavailable</span>
                            ${details.api_key_missing ? '<span style="font-size: 0.75rem; opacity:0.7">API Key Required</span>' : ''}
                        </div>
                    `;
                    
                    // Minimal cache for modal even without TMDB poster
                    movieDetailsCache[tmdbId] = {
                        success: false,
                        title: displayTitle,
                        matchScore: matchScore,
                        overview: "Additional details are unavailable without a valid TMDB API Key. Please click the Settings panel in the top right to configure yours.",
                        genres: ["Recommender Model Match"],
                        vote_average: 0
                    };
                    
                    cardElement.addEventListener('click', () => openMovieDetails(tmdbId));
                }
            })
            .catch(err => {
                console.error("Error loading card details:", err);
                const posterContainer = cardElement.querySelector('.poster-container');
                posterContainer.innerHTML = `
                    <div class="card-fallback-info">
                        <i class="fa-solid fa-circle-xmark" style="color: var(--danger)"></i>
                        <span style="font-size: 0.8rem">Error loading</span>
                    </div>
                `;
            });
    }

    // --- Details Modal ---
    function openMovieDetails(tmdbId) {
        const movie = movieDetailsCache[tmdbId];
        if (!movie) return;

        // Populate elements
        modalTitle.textContent = movie.title;
        modalMatchScore.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${Math.round(movie.matchScore * 100)}% Match`;
        modalOverview.textContent = movie.overview || "No overview available.";
        
        // Rating
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        modalRating.textContent = rating;
        
        // Genres
        modalGenres.innerHTML = '';
        const genres = movie.genres || [];
        genres.forEach(g => {
            const badge = document.createElement('span');
            badge.className = 'genre-tag';
            badge.textContent = g;
            modalGenres.appendChild(badge);
        });

        if (movie.success) {
            // Set poster and backdrop if available
            let posterSrc = movie.poster_path;
            if (posterSrc && !posterSrc.startsWith('http')) {
                posterSrc = `https://image.tmdb.org/t/p/w500${posterSrc}`;
            }
            modalPoster.src = posterSrc || '';
            modalPoster.style.display = posterSrc ? 'block' : 'none';
            
            if (movie.backdrop_path) {
                let backdropSrc = movie.backdrop_path;
                if (!backdropSrc.startsWith('http')) {
                    backdropSrc = `https://image.tmdb.org/t/p/w1280${backdropSrc}`;
                }
                modalBackdrop.style.backgroundImage = `url('${backdropSrc}')`;
                modalBackdrop.style.display = 'block';
            } else {
                modalBackdrop.style.display = 'none';
            }
            
            // Release year
            if (movie.release_date) {
                modalYear.textContent = movie.release_date.split('-')[0];
                modalYear.style.display = 'inline-flex';
            } else {
                modalYear.style.display = 'none';
            }
            
            // Runtime
            if (movie.runtime) {
                modalRuntime.textContent = `${movie.runtime} min`;
                modalRuntime.style.display = 'inline-flex';
            } else {
                modalRuntime.style.display = 'none';
            }
        } else {
            // Mock template for keyless mode
            modalPoster.style.display = 'none';
            modalBackdrop.style.display = 'none';
            modalYear.style.display = 'none';
            modalRuntime.style.display = 'none';
        }

        // Open details modal
        detailsModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Stop background scrolling
    }

    closeDetailsModal.addEventListener('click', () => {
        detailsModal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore scroll
    });

    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
            detailsModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });


});
