import os
import pickle
import urllib.request
import urllib.parse
import json
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
# Enable CORS for convenience
CORS = None # We will import or use simple CORS if needed, but since we are serving frontend from Flask, CORS is not strictly needed.

# Global variables for caching model data
movies_list = []
similarity = None
movie_titles = []

# Fetch TMDB API key from backend environment
TMDB_API_KEY = os.getenv('TMDB_API_KEY', '').strip()

def load_recommendation_data():
    global movies_list, similarity, movie_titles
    try:
        print("--> Loading movies dictionary...")
        with open('movies_dict.pkl', 'rb') as f:
            movies_dict = pickle.load(f)
        
        # movies_dict keys: ['movie_id', 'title', 'tags']
        # Reconstruct list of dictionaries sorted by index keys
        indices = sorted(list(movies_dict['title'].keys()))
        movies_list = []
        for idx in indices:
            movies_list.append({
                'index': idx,
                'movie_id': int(movies_dict['movie_id'][idx]),
                'title': str(movies_dict['title'][idx]),
                'tags': str(movies_dict['tags'][idx])
            })
        
        # Cache unique sorted titles for autocomplete
        movie_titles = sorted(list(set(m['title'] for m in movies_list)))
        print(f"--> Successfully loaded {len(movies_list)} movies.")
        
        print("--> Loading similarity matrix (this may take a few seconds)...")
        with open('similarity.pkl', 'rb') as f:
            similarity = pickle.load(f)
        print("--> Successfully loaded similarity matrix.")
    except Exception as e:
        print(f"--> ERROR loading data models: {e}")

# Load models at startup
load_recommendation_data()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/movies', methods=['GET'])
def get_movies():
    """Returns list of all movie titles for autocomplete dropdown."""
    return jsonify(movie_titles)

@app.route('/api/recommend', methods=['GET'])
def recommend_movies():
    """Computes similarity recommendations for the requested movie."""
    movie_title = request.args.get('movie', '').strip()
    if not movie_title:
        return jsonify({'success': False, 'message': 'No movie title provided.'}), 400
    
    if not movies_list or similarity is None:
        return jsonify({'success': False, 'message': 'Recommendation models are not loaded.'}), 500
        
    # Match the movie title case-insensitively
    movie_title_lower = movie_title.lower()
    matched_movie = None
    
    # Exact match check
    for m in movies_list:
        if m['title'].lower() == movie_title_lower:
            matched_movie = m
            break
            
    # Substring match fallback
    if not matched_movie:
        for m in movies_list:
            if movie_title_lower in m['title'].lower():
                matched_movie = m
                break
                
    if not matched_movie:
        return jsonify({
            'success': False,
            'message': f'Movie "{movie_title}" not found in our database.'
        }), 404
        
    try:
        movie_index = matched_movie['index']
        # Fetch similarity distances for this movie index
        distances = similarity[movie_index]
        
        # Sort indices based on similarity score in descending order
        # Skipping the first element as it's the movie itself (dist = 1.0)
        similarity_scores = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
        
        recommendations = []
        for idx, score in similarity_scores:
            if idx == movie_index:
                continue
            recommendations.append({
                'movie_id': movies_list[idx]['movie_id'],
                'title': movies_list[idx]['title'],
                'score': float(score)
            })
            # Limit to top 6 recommended movies
            if len(recommendations) >= 6:
                break
                
        return jsonify({
            'success': True,
            'input_movie': matched_movie,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Recommendation error: {str(e)}'}), 500

@app.route('/api/movie_details', methods=['GET'])
def get_movie_details():
    """Fetches details (poster, description, rating) from TMDB API, with a fallback to IMDbOT + Wikipedia."""
    movie_id = request.args.get('movie_id', '').strip()
    client_key = request.args.get('api_key', '').strip()
    
    if not movie_id:
        return jsonify({'success': False, 'message': 'No movie_id provided.'}), 400
        
    # Choose API key (client key has priority if provided, fallback to backend key)
    api_key = client_key if client_key else TMDB_API_KEY
    
    # Try TMDB API first IF api_key is configured
    if api_key:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={api_key}&language=en-US"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode('utf-8'))
                
            return jsonify({
                'success': True,
                'movie_id': data.get('id'),
                'title': data.get('title'),
                'overview': data.get('overview'),
                'poster_path': data.get('poster_path'),
                'backdrop_path': data.get('backdrop_path'),
                'release_date': data.get('release_date'),
                'vote_average': data.get('vote_average'),
                'vote_count': data.get('vote_count'),
                'runtime': data.get('runtime'),
                'genres': [g['name'] for g in data.get('genres', [])]
            })
        except Exception as e:
            print(f"--> TMDB API failed (API key exists but call failed): {e}. Falling back to alternative API.")
    else:
        print("--> TMDB API key not configured. Using alternative API fallback.")

    # Fallback to IMDbOT API + Wikipedia API
    # 1. Resolve movie title and tags from movies_list
    movie_title = ""
    movie_tags = ""
    try:
        m_id_int = int(movie_id)
        for m in movies_list:
            if m['movie_id'] == m_id_int:
                movie_title = m['title']
                movie_tags = m.get('tags', '')
                break
    except ValueError:
        pass

    if not movie_title:
        return jsonify({'success': False, 'message': f'Movie ID {movie_id} not found in local database.'}), 404

    # 2. Get poster and year from IMDbOT API
    poster_url = ""
    year = ""
    actors = ""
    try:
        query_encoded = urllib.parse.quote(movie_title)
        url_imdbot = f"https://imdb.iamidiotareyoutoo.com/search?q={query_encoded}"
        req_imdbot = urllib.request.Request(url_imdbot, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_imdbot, timeout=4) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
        if res_data.get('ok') and res_data.get('description'):
            matches = res_data['description']
            # Find the best match
            best_match = None
            for item in matches:
                if item.get('#TITLE', '').lower() == movie_title.lower():
                    best_match = item
                    break
            if not best_match:
                # Substring matching fallback
                for item in matches:
                    if movie_title.lower() in item.get('#TITLE', '').lower() or item.get('#TITLE', '').lower() in movie_title.lower():
                        best_match = item
                        break
            if not best_match and matches:
                best_match = matches[0]

            if best_match:
                poster_url = best_match.get('#IMG_POSTER', '')
                year = str(best_match.get('#YEAR', ''))
                actors = best_match.get('#ACTORS', '')
    except Exception as e:
        print(f"--> IMDbOT API fallback error: {e}")

    # 3. Get overview/synopsis from Wikipedia API
    overview = ""
    try:
        # Search Wikipedia for the page title first (using "{movie_title} film")
        search_query = f"{movie_title} film"
        search_encoded = urllib.parse.quote(search_query)
        url_search = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={search_encoded}&format=json&utf8=1"
        req_search = urllib.request.Request(url_search, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_search, timeout=3) as search_res:
            search_data = json.loads(search_res.read().decode('utf-8'))
            
        if search_data.get('query', {}).get('search'):
            wiki_title = search_data['query']['search'][0]['title']
            # Fetch summary for the matched title
            title_encoded = urllib.parse.quote(wiki_title)
            url_sum = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title_encoded}"
            req_sum = urllib.request.Request(url_sum, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_sum, timeout=3) as sum_res:
                sum_data = json.loads(sum_res.read().decode('utf-8'))
                overview = sum_data.get('extract', '')
                
                # If poster wasn't found from IMDbOT, try Wikipedia original image
                if not poster_url:
                    poster_url = sum_data.get('originalimage', {}).get('source', '')
                    if not poster_url:
                        poster_url = sum_data.get('thumbnail', {}).get('source', '')
    except Exception as e:
        print(f"--> Wikipedia API fallback error: {e}")

    # Fallback synopsis if Wikipedia failed
    if not overview:
        if actors:
            overview = f"'{movie_title}' is a film starring {actors}. Released in the year {year or 'N/A'}."
        else:
            clean_tags = movie_tags.replace('action', '').replace('adventur', '').replace('fantasi', '').replace('sciencefict', '')
            clean_tags = ' '.join(clean_tags.split()[:25])
            overview = f"A popular movie match for '{movie_title}'. Keywords: {clean_tags}..."

    # 4. Reconstruct Genres from movie_tags
    GENRE_MAP = {
        'action': 'Action',
        'adventur': 'Adventure',
        'fantasi': 'Fantasy',
        'sciencefict': 'Sci-Fi',
        'sci-fi': 'Sci-Fi',
        'thriller': 'Thriller',
        'drama': 'Drama',
        'romanc': 'Romance',
        'comedi': 'Comedy',
        'horror': 'Horror',
        'mysteri': 'Mystery',
        'crime': 'Crime',
        'famili': 'Family',
        'anim': 'Animation',
        'histori': 'History',
        'war': 'War',
        'music': 'Music',
        'documentari': 'Documentary',
        'western': 'Western'
    }
    
    genres = []
    if movie_tags:
        tags_lower = movie_tags.lower()
        for stem, clean_name in GENRE_MAP.items():
            if stem in tags_lower:
                if clean_name not in genres:
                    genres.append(clean_name)
    genres = genres[:3]
    if not genres:
        genres = ['Recommender Match']

    return jsonify({
        'success': True,
        'movie_id': movie_id,
        'title': movie_title,
        'overview': overview,
        'poster_path': poster_url,
        'backdrop_path': poster_url,
        'release_date': f"{year}-01-01" if year else "N/A",
        'vote_average': 7.5,
        'vote_count': 120,
        'runtime': 120,
        'genres': genres
    })

if __name__ == '__main__':
    # Print status message
    print("--------------------------------------------------")
    print(f"Backend Server Starting on http://127.0.0.1:5000")
    print(f"Backend TMDB Key Status: {'CONFIGURED' if TMDB_API_KEY else 'NOT CONFIGURED'}")
    print("--------------------------------------------------")
    app.run(debug=True, port=5000)
