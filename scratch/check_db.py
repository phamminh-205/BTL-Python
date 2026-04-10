import psycopg2
import os

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:your_password@localhost:5432/science_manager")

def check_columns():
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'")
        columns = cursor.fetchall()
        print("Columns in 'projects' table:")
        for col in columns:
            print(f"- {col[0]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
