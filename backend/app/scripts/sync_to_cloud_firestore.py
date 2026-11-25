import json
import os
import firebase_admin
from firebase_admin import credentials, firestore
from backend.app.config import settings


def _commit_batches(db, ops):
    batch = db.batch()
    count = 0
    for ref, data in ops:
        batch.set(ref, data, merge=True)
        count += 1
        if count >= 400:
            batch.commit()
            batch = db.batch()
            count = 0
    if count > 0:
        batch.commit()


def sync_to_cloud():
    cred_path = settings.FIREBASE_CREDENTIALS_PATH or "firebase-credentials.json"
    if not os.path.exists(cred_path):
        print(f"ERRO: {cred_path} não encontrado!")
        return

    print(f"--> Inicializando Firebase com certificado {cred_path}...")
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    local_store_path = os.path.join(settings.STORAGE_DIR, "local_firestore.json")
    if not os.path.exists(local_store_path):
        print(f"ERRO: {local_store_path} não encontrado!")
        return

    with open(local_store_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    users = data.get("users", {})
    ops = []
    for user_id, user_doc in users.items():
        ops.append((db.collection("users").document(str(user_id)), user_doc))

    user_data = data.get("user_data", {})
    for user_id, partition in user_data.items():
        user_ref = db.collection("users").document(str(user_id))

        profile = partition.get("profile")
        if profile:
            ops.append((user_ref.collection("profile").document("master"), profile))

        user_settings = partition.get("settings")
        if user_settings:
            ops.append((user_ref.collection("settings").document("general"), user_settings))

        for subcol in ("jobs", "applications", "scan_history", "cv_templates"):
            items = partition.get(subcol, {})
            for doc_id, doc_data in items.items():
                ops.append((user_ref.collection(subcol).document(str(doc_id)), doc_data))

    _commit_batches(db, ops)
    print(f"Sincronização multi-tenant concluída ({len(users)} utilizadores, {len(ops)} documentos).")


if __name__ == "__main__":
    sync_to_cloud()
