# 🎬 Movie Recommendation System

An intelligent Movie Recommendation System built using **Python**, **Machine Learning**, and **Cosine Similarity**. The system recommends movies based on content similarity using the **TMDB 5000 Movies Dataset**. It also enhances the user experience by fetching **movie posters from IMDb APIs** and **short movie descriptions from the Wikipedia API**.

---

## 📌 Features

- Recommend similar movies instantly
- Content-Based Recommendation System
- Cosine Similarity algorithm
- Uses TMDB 5000 Movies Dataset
- Fetches high-quality movie posters
- Retrieves short movie descriptions
- Clean and interactive user interface
- Fast recommendation generation

---


## 📂 Dataset

- TMDB 5000 Movies Dataset
- TMDB 5000 Credits Dataset

---

## 🛠 Technologies Used

- Python
- Pandas
- NumPy
- Scikit-learn
- Cosine Similarity
- Pickle
- Flask / Streamlit
- IMDb API
- Wikipedia API

---

## ⚙️ How It Works

1. Load the TMDB 5000 Movies Dataset.
2. Perform data preprocessing and feature engineering.
3. Combine important textual features such as:
   - Genres
   - Keywords
   - Cast
   - Crew
   - Overview
4. Convert text into vectors.
5. Compute similarity using Cosine Similarity.
6. Recommend the most similar movies.
7. Fetch movie posters from the IMDb API.
8. Retrieve a short movie description using the Wikipedia API.

---

## 📁 Project Structure

```
Movie-Recommendation-System/
│
├── app.py
├── recommendation.py
├── model.pkl
├── movies.pkl
├── requirements.txt
├── README.md
├── static/
├── templates/
├── dataset/
└── images/
```

---

## 📦 Installation

Clone the repository

```bash
git clone https://github.com/TusharPanchal19/Movie-Recommendation-System.git
```

Move into the project

```bash
cd Movie-Recommendation-System
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run the application

```bash
python app.py
---

## 📊 Machine Learning Workflow

- Data Collection
- Data Cleaning
- Feature Engineering
- Vectorization
- Cosine Similarity
- Recommendation Generation
- Poster Retrieval
- Movie Description Retrieval

---

## 🔮 Future Improvements

- User Authentication
- Personalized Recommendations
- Hybrid Recommendation System
- Deep Learning Recommendations
- Movie Ratings
- Watchlist
- Trailer Integration
- Genre Filtering
- Voice Search

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Tushar Panchal**

B.Tech CSE (AI & ML)

GitHub: https://github.com/TusharPanchal19


⭐ If you found this project helpful, consider giving it a Star.