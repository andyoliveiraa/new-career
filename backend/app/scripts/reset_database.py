import os
import json
import shutil

def reset_all_data():
    print("--> Reinicializando completamente a base de dados...")
    
    # 1. Reset local_firestore.json
    firestore_path = "storage/local_firestore.json"
    os.makedirs("storage", exist_ok=True)
    clean_store = {
        "users": {},
        "user_data": {}
    }
    with open(firestore_path, "w", encoding="utf-8") as f:
        json.dump(clean_store, f, indent=2, ensure_ascii=False)
    print("✅ 'storage/local_firestore.json' reinicializado a frio.")

    # 2. Reset SQLite database if exists
    sqlite_db = "new_career.db"
    if os.path.exists(sqlite_db):
        try:
            os.remove(sqlite_db)
            print("✅ 'new_career.db' removido para arranque limpo.")
        except Exception as e:
            print(f"⚠️ Aviso ao remover new_career.db: {e}")

    # 3. Clean user storage directories except source/backups
    users_storage = "storage/users"
    if os.path.exists(users_storage):
        try:
            shutil.rmtree(users_storage)
            print("✅ 'storage/users' limpo.")
        except Exception as e:
            print(f"⚠️ Aviso ao limpar storage/users: {e}")

    print("\n Base de dados totalmente zerada e pronta para novos utilizadores!")

if __name__ == "__main__":
    reset_all_data()
