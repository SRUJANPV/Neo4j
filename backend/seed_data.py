from db import run_query

# ----------------- Genres -----------------
genres = [
    "Sci-Fi",
    "Thriller",
    "Drama",
    "Action",
    "Comedy",
    "Crime",
    "Adventure",
]

for genre in genres:
    run_query("MERGE (:Genre {name: $name})", {"name": genre})


# ----------------- Movies -----------------
movies = [
    ("M001", "Inception", 2010, ["Sci-Fi", "Thriller", "Action"]),
    ("M002", "Interstellar", 2014, ["Sci-Fi", "Drama", "Adventure"]),
    ("M003", "The Dark Knight", 2008, ["Action", "Crime", "Drama"]),
    ("M004", "The Prestige", 2006, ["Drama", "Thriller"]),
    ("M005", "Tenet", 2020, ["Sci-Fi", "Action", "Thriller"]),
    ("M006", "The Wolf of Wall Street", 2013, ["Drama", "Comedy", "Crime"]),
]

for movie_id, title, year, movie_genres in movies:
    run_query(
        """
        MERGE (m:Movie {id: $id})
        SET m.title = $title,
            m.year = $year
        """,
        {"id": movie_id, "title": title, "year": year},
    )

    for genre in movie_genres:
        run_query(
            """
            MERGE (m:Movie {id: $movie_id})
            MERGE (g:Genre {name: $genre})
            MERGE (m)-[:BELONGS_TO]->(g)
            """,
            {"movie_id": movie_id, "genre": genre},
        )


# ----------------- Actors + ACTED_IN -----------------
actors = [
    ("Leonardo DiCaprio", ["M001", "M006"]),
    ("Joseph Gordon-Levitt", ["M001"]),
    ("Matthew McConaughey", ["M002"]),
    ("Anne Hathaway", ["M002"]),
    ("Christian Bale", ["M003", "M004"]),
    ("Hugh Jackman", ["M004"]),
    ("John David Washington", ["M005"]),
]

for actor_name, movie_ids in actors:
    run_query("MERGE (:Actor {name: $name})", {"name": actor_name})
    for movie_id in movie_ids:
        run_query(
            """
            MERGE (a:Actor {name: $actor})
            MERGE (m:Movie {id: $movie_id})
            MERGE (a)-[:ACTED_IN]->(m)
            """,
            {"actor": actor_name, "movie_id": movie_id},
        )


# ----------------- Directors + DIRECTED -----------------
directors = [
    ("Christopher Nolan", ["M001", "M002", "M003", "M004", "M005"]),
    ("Martin Scorsese", ["M006"]),
]

for director_name, movie_ids in directors:
    run_query("MERGE (:Director {name: $name})", {"name": director_name})
    for movie_id in movie_ids:
        run_query(
            """
            MERGE (d:Director {name: $director})
            MERGE (m:Movie {id: $movie_id})
            MERGE (d)-[:DIRECTED]->(m)
            """,
            {"director": director_name, "movie_id": movie_id},
        )


# ----------------- Users + User -> Movie relationships -----------------
users = [
    {
        "id": "U001",
        "name": "Srujan",
        "age": 24,
        "preferences": ["Sci-Fi", "Thriller"],
        "watched": ["M001", "M003", "M004"],
        "liked": ["M001", "M003"],
        "rated": [("M001", 5.0), ("M003", 4.5), ("M004", 4.0)],
    },
    {
        "id": "U002",
        "name": "Aarav",
        "age": 26,
        "preferences": ["Sci-Fi", "Action"],
        "watched": ["M001", "M002", "M005"],
        "liked": ["M001", "M002", "M005"],
        "rated": [("M001", 4.5), ("M002", 5.0), ("M005", 4.0)],
    },
    {
        "id": "U003",
        "name": "Meera",
        "age": 23,
        "preferences": ["Drama", "Crime"],
        "watched": ["M003", "M004", "M006"],
        "liked": ["M003", "M006"],
        "rated": [("M003", 4.0), ("M006", 5.0)],
    },
]

for user in users:
    run_query(
        """
        MERGE (u:User {id: $id})
        SET u.name = $name,
            u.age = $age
        """,
        {"id": user["id"], "name": user["name"], "age": user["age"]},
    )

    for genre in user["preferences"]:
        run_query(
            """
            MERGE (u:User {id: $uid})
            MERGE (g:Genre {name: $genre})
            MERGE (u)-[:PREFERS]->(g)
            """,
            {"uid": user["id"], "genre": genre},
        )

    for movie_id in user["watched"]:
        run_query(
            """
            MERGE (u:User {id: $uid})
            MERGE (m:Movie {id: $movie_id})
            MERGE (u)-[:WATCHED]->(m)
            """,
            {"uid": user["id"], "movie_id": movie_id},
        )

    for movie_id in user["liked"]:
        run_query(
            """
            MERGE (u:User {id: $uid})
            MERGE (m:Movie {id: $movie_id})
            MERGE (u)-[:LIKED]->(m)
            """,
            {"uid": user["id"], "movie_id": movie_id},
        )

    for movie_id, rating in user["rated"]:
        run_query(
            """
            MERGE (u:User {id: $uid})
            MERGE (m:Movie {id: $movie_id})
            MERGE (u)-[r:RATED]->(m)
            SET r.rating = $rating
            """,
            {"uid": user["id"], "movie_id": movie_id, "rating": rating},
        )

print("CineGraphAI graph seeded successfully")
