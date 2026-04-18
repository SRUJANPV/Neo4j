from flask import Flask, jsonify, request
from flask_cors import CORS
from neo4j import GraphDatabase
import os
import csv

app = Flask(__name__)
CORS(app)

NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "cinedb")

driver = GraphDatabase.driver(
    "neo4j://127.0.0.1:7687",
    auth=("neo4j", "neo4j123"),
)

def normalize_text(value):
    return str(value or "").strip()

def normalize_user_id(value):
    return normalize_text(value).upper()

def parse_list_field(raw_value):
    if isinstance(raw_value, list):
        values = raw_value
    elif isinstance(raw_value, str):
        values = raw_value.replace("|", ",").split(",")
    else:
        values = []

    cleaned = []
    seen = set()
    for item in values:
        text = normalize_text(item)
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            cleaned.append(text)
    return cleaned

def resolve_existing_name(session, label, field, value):
    raw_value = normalize_text(value)
    if not raw_value:
        return ""

    query = f"""
    MATCH (n:{label})
    WHERE toLower(trim(n.{field})) = toLower(trim($value))
    RETURN n.{field} AS canonical
    LIMIT 1
    """
    record = session.run(query, value=raw_value).single()
    if record and record.get("canonical"):
        return record["canonical"].strip()
    return raw_value

# --------------------
# Home & Test
# --------------------
@app.route("/")
def home():
    return jsonify({"status": "CineGraphAI backend is running"})

@app.route("/test")
def test_neo4j():
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            record = session.run("MATCH (n) RETURN count(n) AS total_nodes").single()
        return jsonify({"total_nodes": record["total_nodes"] if record else 0})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------
# Add User
# --------------------
@app.route("/add_user", methods=["POST"])
def add_user():
    try:
        data = request.json or {}
        user_id = normalize_user_id(data.get("user_id"))
        name = normalize_text(data.get("name"))
        age = data.get("age")
        preferences = parse_list_field(data.get("preferences", []))

        if not user_id or not name:
            return jsonify({"error": "user_id and name are required"}), 400

        with driver.session(database=NEO4J_DATABASE) as session:
            existing = session.run(
                "MATCH (u:User {id: $uid}) RETURN count(u) AS total",
                uid=user_id,
            ).single()
            if existing and existing["total"] > 0:
                return jsonify({"error": "user_id already exists"}), 409

            session.run(
                """
                CREATE (u:User {id: $uid, name: $name, age: $age})
                """,
                uid=user_id,
                name=name,
                age=age,
            )

            for genre in preferences:
                canonical_genre = resolve_existing_name(session, "Genre", "name", genre)
                session.run(
                    """
                    MATCH (u:User {id: $uid})
                    MERGE (g:Genre {name: $genre})
                    MERGE (u)-[:PREFERS]->(g)
                    """,
                    uid=user_id,
                    genre=canonical_genre,
                )

        return jsonify({"status": "User added successfully", "preferences": preferences})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------
# Add Movie
# --------------------
@app.route("/add_movie", methods=["POST"])
def add_movie():
    try:
        data = request.json or {}
        movie_id = normalize_user_id(data.get("movie_id"))
        title = normalize_text(data.get("title"))
        year = data.get("year")
        genres = parse_list_field(data.get("genres", []))

        if not movie_id or not title:
            return jsonify({"error": "movie_id and title are required"}), 400

        with driver.session(database=NEO4J_DATABASE) as session:
            existing = session.run(
                "MATCH (m:Movie {id: $mid}) RETURN count(m) AS total",
                mid=movie_id,
            ).single()
            if existing and existing["total"] > 0:
                return jsonify({"error": "movie_id already exists"}), 409

            session.run(
                """
                CREATE (m:Movie {id: $mid, title: $title, year: $year})
                """,
                mid=movie_id,
                title=title,
                year=year,
            )

            for genre in genres:
                canonical_genre = resolve_existing_name(session, "Genre", "name", genre)
                session.run(
                    """
                    MATCH (m:Movie {id: $mid})
                    MERGE (g:Genre {name: $genre})
                    MERGE (m)-[:BELONGS_TO]->(g)
                    """,
                    mid=movie_id,
                    genre=canonical_genre,
                )

        return jsonify({"status": "Movie added successfully", "genres": genres})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------
# Link User to Movie
# --------------------
@app.route("/link_user_movie", methods=["POST"])
def link_user_movie():
    try:
        data = request.json or {}
        user_id = normalize_user_id(data.get("user_id"))
        movie_id = normalize_user_id(data.get("movie_id"))
        action = normalize_text(data.get("action", "WATCHED"))

        if not user_id or not movie_id:
            return jsonify({"error": "user_id and movie_id are required"}), 400

        valid_actions = ["WATCHED", "LIKED", "RATED"]
        if action not in valid_actions:
            action = "WATCHED"

        with driver.session(database=NEO4J_DATABASE) as session:
            session.run(
                f"""
                MATCH (u:User {{id: $uid}})
                MATCH (m:Movie {{id: $mid}})
                MERGE (u)-[:{action}]->(m)
                """,
                uid=user_id,
                mid=movie_id,
            )

        return jsonify({"status": f"User linked to movie with {action} relationship"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------
# User Insights
# --------------------
@app.route("/user_insights/<user_id>", methods=["GET"])
def user_insights(user_id):
    try:
        uid = normalize_user_id(user_id)

        with driver.session(database=NEO4J_DATABASE) as session:
            record = session.run(
                """
                MATCH (u:User {id: $uid})
                OPTIONAL MATCH (u)-[watched:WATCHED]->(m:Movie)
                OPTIONAL MATCH (u)-[liked:LIKED]->(m2:Movie)
                OPTIONAL MATCH (u)-[:PREFERS]->(g:Genre)
                RETURN
                    u.name AS user_name,
                    u.id AS user_id,
                    collect(DISTINCT m.title) AS watched_movies,
                    collect(DISTINCT m2.title) AS liked_movies,
                    collect(DISTINCT g.name) AS preferred_genres,
                    count(DISTINCT m) AS total_watched,
                    count(DISTINCT m2) AS total_liked
                """,
                uid=uid,
            ).single()

        if not record:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user_id": record["user_id"],
            "user_name": record["user_name"],
            "watched_movies": record["watched_movies"],
            "liked_movies": record["liked_movies"],
            "preferred_genres": record["preferred_genres"],
            "total_watched": record["total_watched"],
            "total_liked": record["total_liked"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------
# Recommendations
# --------------------
def build_rating_weighted_recommendations(uid, limit=5):
    """Build recommendations using collaborative + content-based filtering"""
    return f"""
    MATCH (target_user:User {{id: '{uid}'}})
    
    // Find similar users (users who liked similar genres)
    MATCH (target_user)-[:PREFERS]->(genre:Genre)<-[:PREFERS]-(sim_user:User)
    WHERE sim_user <> target_user
    
    // Find movies they watched
    MATCH (sim_user)-[:WATCHED|:LIKED]->(movie:Movie)-[:BELONGS_TO]->(genre)
    
    // Ensure target user hasn't watched this movie
    WHERE NOT (target_user)-[:WATCHED|:LIKED]->(movie)
    
    // Score: count of similar users who watched/liked it
    WITH movie, count(DISTINCT sim_user) AS score
    ORDER BY score DESC
    LIMIT {limit}
    
    RETURN COLLECT({{
        id: movie.id,
        title: movie.title,
        year: movie.year,
        score: score
    }}) AS recommendations
    """

@app.route("/recommend/<user_id>", methods=["GET"])
def recommend(user_id):
    try:
        uid = normalize_user_id(user_id)
        limit = request.args.get("limit", 5, type=int)

        with driver.session(database=NEO4J_DATABASE) as session:
            # Verify user exists
            user_check = session.run(
                "MATCH (u:User {id: $uid}) RETURN u",
                uid=uid
            ).single()

            if not user_check:
                return jsonify({"error": "User not found"}), 404

            # 1. Collaborative filtering - movies watched by similar users
            collab_query = f"""
            MATCH (target_user:User {{id: '{uid}'}})
            MATCH (target_user)-[:PREFERS]->(genre:Genre)<-[:PREFERS]-(sim_user:User)
            WHERE sim_user <> target_user
            MATCH (sim_user)-[:WATCHED|:LIKED]->(movie:Movie)-[:BELONGS_TO]->(genre)
            WHERE NOT (target_user)-[:WATCHED|:LIKED]->(movie)
            WITH movie, count(DISTINCT sim_user) AS score
            ORDER BY score DESC
            LIMIT {limit}
            RETURN COLLECT({{
                id: movie.id,
                title: movie.title,
                year: movie.year,
                score: score
            }}) AS collaborative
            """
            
            collab_result = session.run(collab_query).single()
            collaborative = collab_result["collaborative"] if collab_result else []

            # 2. Content-based filtering - movies in preferred genres
            content_query = f"""
            MATCH (target_user:User {{id: '{uid}'}})
            MATCH (target_user)-[:PREFERS]->(genre:Genre)<-[:BELONGS_TO]-(movie:Movie)
            WHERE NOT (target_user)-[:WATCHED|:LIKED]->(movie)
            WITH movie, count(DISTINCT genre) AS genre_match
            ORDER BY genre_match DESC
            LIMIT {limit}
            RETURN COLLECT({{
                id: movie.id,
                title: movie.title,
                year: movie.year,
                score: genre_match
            }}) AS content_based
            """
            
            content_result = session.run(content_query).single()
            content_based = content_result["content_based"] if content_result else []

            # 3. Weighted scoring - combined approach
            weighted_query = f"""
            MATCH (target_user:User {{id: '{uid}'}})
            MATCH (target_user)-[:PREFERS]->(genre:Genre)<-[:PREFERS]-(sim_user:User)
            WHERE sim_user <> target_user
            MATCH (sim_user)-[:WATCHED|:LIKED]->(movie:Movie)-[:BELONGS_TO]->(genre)
            WHERE NOT (target_user)-[:WATCHED|:LIKED]->(movie)
            WITH movie, count(DISTINCT sim_user) AS similar_users, count(DISTINCT genre) AS shared_genres
            WITH movie, similar_users, shared_genres, (similar_users * 2 + shared_genres) AS score
            ORDER BY score DESC
            LIMIT {limit}
            RETURN COLLECT({{
                id: movie.id,
                title: movie.title,
                year: movie.year,
                score: score,
                similar_users: similar_users,
                shared_genres: shared_genres
            }}) AS weighted
            """
            
            weighted_result = session.run(weighted_query).single()
            weighted_data = weighted_result["weighted"] if weighted_result else []
            # Restructure to match frontend expectations
            weighted = [
                {
                    "id": item["id"],
                    "title": item["title"],
                    "year": item["year"],
                    "score": item["score"],
                    "signals": {
                        "similar_users": item["similar_users"],
                        "shared_genres": item["shared_genres"]
                    }
                }
                for item in weighted_data
            ]

        return jsonify({
            "user_id": uid,
            "collaborative": collaborative,
            "content_based": content_based,
            "weighted": weighted
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------
# Similar Users
# --------------------
@app.route("/similar_users/<user_id>", methods=["GET"])
def similar_users(user_id):
    try:
        uid = normalize_user_id(user_id)

        with driver.session(database=NEO4J_DATABASE) as session:
            record = session.run(
                """
                MATCH (target_user:User {id: $uid})
                OPTIONAL MATCH (target_user)-[:WATCHED|:LIKED]->(watched_movie:Movie)<-[:WATCHED|:LIKED]-(similar:User)
                WHERE similar <> target_user
                WITH similar, count(DISTINCT watched_movie) AS shared_movies
                ORDER BY shared_movies DESC
                LIMIT 10
                RETURN collect({
                    user_id: similar.id,
                    user_name: similar.name,
                    similarity: shared_movies
                }) AS similar_users
                """,
                uid=uid,
            ).single()

        similar = record["similar_users"] if record else []
        return jsonify({"user_id": uid, "similar_users": similar})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------
# Graph API
# --------------------
@app.route("/graph", methods=["GET"])
def get_graph():
    try:
        with driver.session(database=NEO4J_DATABASE) as session:

            # Fetch nodes
            nodes_query = """
            MATCH (n)
            RETURN DISTINCT n
            """
            nodes_result = session.run(nodes_query)

            nodes = []
            node_seen = set()

            for record in nodes_result:
                n = record["n"]
                label = list(n.labels)[0]

                if label in ["User", "Movie"]:
                    node_id = f"{label}:{n.get('id')}"
                else:
                    node_id = f"{label}:{n.get('name')}"

                if not node_id or node_id in node_seen:
                    continue

                node_seen.add(node_id)
                nodes.append({
                    "id": node_id,
                    "label": label,
                    "name": node_id
                })

            # Fetch relationships
            rels_query = """
            MATCH (a)-[r]->(b)
            RETURN DISTINCT a, r, b
            """
            rels_result = session.run(rels_query)

            links = []
            link_seen = set()

            for record in rels_result:
                a = record["a"]
                b = record["b"]
                r = record["r"]

                def node_key(n):
                    label = list(n.labels)[0]
                    if label in ["User", "Movie"]:
                        return f"{label}:{n.get('id')}"
                    else:
                        return f"{label}:{n.get('name')}"

                source = node_key(a)
                target = node_key(b)

                if not source or not target:
                    continue

                key = (source, target, r.type)
                if key in link_seen:
                    continue

                link_seen.add(key)
                links.append({
                    "source": source,
                    "target": target,
                    "type": r.type
                })

            return jsonify({
                "nodes": nodes,
                "links": links
            }), 200

    except Exception as e:
        print("GRAPH ERROR:", e)
        return jsonify({"error": "Failed to load graph"}), 500

# --------------------
# Node Info
# --------------------
@app.route("/node_info/<node_id>", methods=["GET"])
def node_info(node_id):
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            # Extract label and id from node_id like "User:U001"
            parts = node_id.split(":", 1)
            if len(parts) != 2:
                return jsonify({"error": "Invalid node_id format"}), 400

            label, nid = parts

            if label in ["User", "Movie"]:
                query = f"""
                MATCH (n:{label} {{id: $nid}})
                OPTIONAL MATCH (n)-[r]->(related)
                RETURN n, collect({{type: type(r), target: related}}) AS relationships
                """
                result = session.run(query, nid=nid).single()
            else:
                query = f"""
                MATCH (n:{label} {{name: $nid}})
                OPTIONAL MATCH (n)-[r]->(related)
                RETURN n, collect({{type: type(r), target: related}}) AS relationships
                """
                result = session.run(query, nid=nid).single()

            if not result:
                return jsonify({"error": "Node not found"}), 404

            return jsonify({
                "node": dict(result["n"]),
                "relationships": result["relationships"]
            })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)



