export function dashboardView() {
  return `
    <section class="card dashboard">
      <h2>🎬 CineGraphAI</h2>
      <p class="muted">Experience the power of graph-based movie intelligence. Discover connections, get personalized recommendations, and explore the movie universe like never before.</p>

      <div class="dashboard-grid">
        <button data-view="graph">
          <strong>📊 Explore Movie Graph</strong><br>
          <small>Visualize connections between users, movies, actors, and directors</small>
        </button>
        <button data-view="addUser">
          <strong>👤 Add User Profile</strong><br>
          <small>Create new user profiles with preferences</small>
        </button>
        <button data-view="addMovie">
          <strong>🎬 Add Movie Catalog</strong><br>
          <small>Expand your movie database</small>
        </button>
        <button data-view="link">
          <strong>🔗 Link User Activity</strong><br>
          <small>Record watched, liked, or rated movies</small>
        </button>
        <button data-view="insights">
          <strong>📈 User Insights</strong><br>
          <small>Discover viewing patterns and preferences</small>
        </button>
        <button data-view="recommend">
          <strong>🎯 Recommendation Engine</strong><br>
          <small>Get AI-powered movie suggestions</small>
        </button>
        <button data-view="import">
          <strong>📤 Import Ratings CSV</strong><br>
          <small>Bulk upload user ratings</small>
        </button>
      </div>
    </section>
  `;
}

export function addUserView() {
  return `
    <section class="card">
      <h2>➕ Add New User</h2>
      <p class="muted">Create a user profile to start receiving personalized recommendations</p>
      
      <input id="userId" placeholder="User ID (e.g., U101)" />
      <input id="userName" placeholder="Full Name" />
      <input id="userAge" type="number" placeholder="Age" />
      <input id="userPreferences" placeholder="Favorite Genres (comma separated, e.g., Action, Drama)" />
      
      <button id="submitUser" class="primary-btn">✨ Create User Profile</button>
      <p id="userStatus" class="status"></p>
      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}

export function addMovieView() {
  return `
    <section class="card">
      <h2>🎬 Add New Movie</h2>
      <p class="muted">Expand your movie collection with detailed metadata</p>
      
      <input id="movieId" placeholder="Movie ID (e.g., M101)" />
      <input id="movieTitle" placeholder="Movie Title" />
      <input id="movieYear" type="number" placeholder="Release Year" />
      <input id="movieGenres" placeholder="Genres (comma separated)" />
      <input id="movieActors" placeholder="Actors (comma separated)" />
      <input id="movieDirectors" placeholder="Directors (comma separated)" />
      
      <button id="submitMovie" class="primary-btn">🎥 Add Movie</button>
      <p id="movieStatus" class="status"></p>
      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}

export function linkView() {
  return `
    <section class="card">
      <h2>🔗 Link User Activity</h2>
      <p class="muted">Record how users interact with movies</p>
      
      <input id="linkUserId" placeholder="User ID" />
      <input id="linkMovieId" placeholder="Movie ID" />

      <div class="split-actions">
        <select id="linkAction">
          <option value="WATCHED">👁️ WATCHED</option>
          <option value="LIKED">❤️ LIKED</option>
          <option value="RATED">⭐ RATED</option>
        </select>
        <input id="linkRating" type="number" min="0" max="5" step="0.5" placeholder="Rating (0-5, for RATED only)" />
      </div>

      <button id="linkUserMovieBtn" class="primary-btn">🔗 Create Connection</button>
      <p id="linkStatus" class="status"></p>
      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}

export function insightsView() {
  return `
    <section class="card">
      <h2>📊 User Insights Dashboard</h2>
      <p class="muted">Deep dive into user preferences and viewing patterns</p>
      
      <input id="insightUserId" placeholder="Enter User ID" />
      <button id="fetchInsights" class="primary-btn">🔍 Analyze User</button>
      <div id="insightResult" class="result-block"></div>
      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}

export function recommendationView() {
  return `
    <section class="card">
      <h2>🎯 AI Recommendation Engine</h2>
      <p class="muted">Get personalized movie recommendations powered by graph algorithms</p>
      
      <input id="recUserId" placeholder="Enter User ID" />
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button id="fetchRecommendations" class="primary-btn">🎬 Get Recommendations</button>
        <button id="fetchSimilar" class="ghost-btn">👥 Find Similar Users</button>
      </div>
      <div id="recommendResult" class="result-block"></div>
      <div id="similarResult" class="result-block"></div>
      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}

export function importCSVView() {
  return `
    <section class="card">
      <h2>📤 Bulk Import Ratings</h2>
      <p class="muted">Upload a CSV file with user ratings for batch processing</p>
      <p class="muted" style="font-size: 0.85rem;">Expected columns: user_id, user_name, movie_id, movie_title, year, genres, watched, liked, rating</p>
      
      <input id="csvFile" type="file" accept=".csv" style="padding: 8px;" />
      <button id="uploadCSV" class="primary-btn">📁 Upload & Process</button>
      <p id="csvStatus" class="status"></p>
      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}

export function graphView() {
  return `
    <section class="graph-page">
      <div class="graph-toolbar">
        <div class="graph-actions-row">
          <button id="resetFilterBtn" class="graph-action-btn">🔄 Reset All Filters</button>
          <button id="cleanLayoutBtn" class="graph-action-btn">🧹 Clean Layout</button>
          <button id="clusterGraphBtn" class="graph-action-btn">🎯 Cluster Nodes</button>
          <button id="resetViewBtn" class="graph-action-btn">🔍 Reset View</button>
          <button id="refreshGraph" class="graph-action-btn">🔄 Refresh Graph</button>
        </div>

        <div class="legend-row">
          <button type="button" class="legend user" data-node-category="User">👤 Users</button>
          <button type="button" class="legend movie" data-node-category="Movie">🎬 Movies</button>
          <button type="button" class="legend genre" data-node-category="Genre">🏷️ Genres</button>
          <button type="button" class="legend actor" data-node-category="Actor">⭐ Actors</button>
          <button type="button" class="legend director" data-node-category="Director">🎥 Directors</button>
        </div>

        <div class="search-row">
          <select id="relFilter">
            <option value="">📌 All Relationships</option>
            <option value="WATCHED">👁️ WATCHED</option>
            <option value="LIKED">❤️ LIKED</option>
            <option value="RATED">⭐ RATED</option>
            <option value="BELONGS_TO">🏷️ BELONGS_TO</option>
            <option value="ACTED_IN">🎭 ACTED_IN</option>
            <option value="DIRECTED">🎬 DIRECTED</option>
          </select>
          <select id="graphFocusFilter">
            <option value="">🌐 All Graph Data</option>
            <option value="actors">🎭 Show Only Actors</option>
            <option value="recommendations">🎯 Show Recommendations</option>
            <option value="similar_users">👥 Highlight Similar Users</option>
          </select>
          <input id="nodeSearch" placeholder="🔍 Search by ID or name..." />
          <button id="findNode" class="ghost-btn">🔎 Find</button>
          <button id="clearSearchBtn" class="ghost-btn">🗑️ Clear</button>
        </div>
      </div>

      <div class="graph-content">
        <div id="graph-container"></div>
        <aside class="node-panel">
          <h3>🔍 Node Inspector</h3>
          <div id="details-panel" class="muted">✨ Click any node to explore its connections and relationships</div>
        </aside>
      </div>

      <button class="back-btn" data-view="dashboard">← Back to Dashboard</button>
    </section>
  `;
}