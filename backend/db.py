from neo4j import GraphDatabase
import os

URI = "neo4j://127.0.0.1:7687"
USER = "neo4j"
PASSWORD = "neo4j123"
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "cinedb")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

def run_query(query, params=None):
    with driver.session(database=NEO4J_DATABASE) as session:
        return list(session.run(query, params or {}))
