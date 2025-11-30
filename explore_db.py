from sql_utils import MySQLConnector
from dotenv import load_dotenv

load_dotenv('.env.local')

connector = MySQLConnector()
connector.connect()

print("\n" + "="*60)
print("DATABASE STRUCTURE")
print("="*60)

print("\ncliperest_book table:")
print("-" * 40)
result = connector.execute_query("DESCRIBE cliperest_book")
if result:
    for row in result:
        print(f"  {row['Field']:25} {row['Type']}")

print("\ncliperest_clipping table:")
print("-" * 40)
result = connector.execute_query("DESCRIBE cliperest_clipping")
if result:
    for row in result:
        print(f"  {row['Field']:25} {row['Type']}")

print("\nSample ministores (first 5):")
print("-" * 40)
result = connector.execute_query("""
    SELECT id, name, numClips, created 
    FROM cliperest_book 
    ORDER BY id DESC 
    LIMIT 5
""")
if result:
    for row in result:
        print(f"  ID: {row['id']:6} | Clips: {row['numClips']:4} | {row['name'][:50]}")

print("\nSample clipping URLs (first 3):")
print("-" * 40)
result = connector.execute_query("""
    SELECT id, book_id, url, thumbnail 
    FROM cliperest_clipping 
    LIMIT 3
""")
if result:
    for row in result:
        print(f"  Book ID: {row['book_id']} | URL: {row['url'][:80] if row['url'] else 'None'}...")

print("\nGood test ministores (with 5+ images):")
print("-" * 40)
result = connector.execute_query("""
    SELECT id, name, numClips 
    FROM cliperest_book 
    WHERE numClips >= 5 
    ORDER BY numClips DESC 
    LIMIT 5
""")
if result:
    for row in result:
        print(f"  ID: {row['id']:6} | Clips: {row['numClips']:4} | {row['name'][:50]}")
    print(f"\nTry: python catalog_generator.py {result[0]['id']}")

connector.disconnect()
