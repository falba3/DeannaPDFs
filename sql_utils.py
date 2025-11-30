import os
import mysql.connector
import datetime


class MySQLConnector:
    def __init__(self):
        self.host = os.getenv("DB_HOST")
        self.port = 3306
        self.username = os.getenv("DB_USERNAME")
        self.password = os.getenv("DB_PASSWORD")
        self.database = os.getenv("DB_DATABASE")
        self.connection = None

    def connect(self):
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.username,
                password=self.password,
                database=self.database
            )
            print("Connected to the database successfully!")
        except mysql.connector.Error as err:
            print(f"Error connecting to the database: {err}")

    def disconnect(self):
        if self.connection:
            self.connection.close()
            print("Disconnected from the database.")


    def execute_query(self, sql_query, params=None):
        if not self.connection or not self.connection.is_connected():
            print("Not connected to the database. Please connect first.")
            return None

        cursor = None
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(sql_query, params)
            if sql_query.strip().upper().startswith(("SELECT", "SHOW", "DESCRIBE")):
                result = cursor.fetchall()
            else:
                self.connection.commit()
                result = cursor.rowcount
            return result

        except mysql.connector.Error as err:
            print(f"Error executing query: {err}")
            return None

        finally:
            if cursor:
                cursor.close() 

    def create_book(self, book_data):
        try:
            cursor = self.connection.cursor()
            insert_query = """
                INSERT INTO cliperest_book
                (user_id, name, slug, rendered, version, category_id, modified, addEnd, coverImage, sharing,
                coverColor, dollarsGiven, privacy, type, created, coverHexColor, numLikers, description,
                tags, thumbnailImage, numClips, numViews, userLanguage, embed_code, thumbnailImageSmall,
                humanModified, coverV3, typeFilters)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, tuple(book_data.values()))
            self.connection.commit()
            book_id = cursor.lastrowid
            print(f"Book record inserted successfully with ID: {book_id}")
            return book_id
        except mysql.connector.Error as err:
            print(f"Error creating book: {err}")
            return None
    
    def SQL_queries(self):
        if self.connection and self.connection.is_connected():
            print("\n--- Interactive Query Executor ---")

            while True:
                query = input("Enter SQL query (or press ENTER to exit): ").strip()
                if not query:
                    break
                res = self.execute_query(query)
                print("-" * 10)
                if res is not None:
                    if isinstance(res, list):
                        if res:
                            for row in res:
                                print(row)
                        else:
                            print("Query executed successfully, no results to display.")
                    else:
                        print(f"Query executed successfully. Affected rows: {res}")
                else:
                    print("Query failed or returned no data.")
                print("-" * 10)
