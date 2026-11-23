import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

def sync_to_cloud():
    cred_path = "firebase-credentials.json"
    if not os.path.exists(cred_path):
        print(f"ERRO: {cred_path} não encontrado!")
        return

    print(f"--> Inicializando Firebase com certificado {cred_path}...")
    # Initialize firebase app if not already initialized
    try:
        app = firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(cred_path)
        app = firebase_admin.initialize_app(cred)

    db = firestore.client()
    print("--> Conexão estabelecida com Firestore!")

    local_store_path = "storage/local_firestore.json"
    if not os.path.exists(local_store_path):
        print(f"ERRO: {local_store_path} não encontrado!")
        return

    with open(local_store_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Sync Profile
    profiles = data.get("profiles", {})
    for prof_id, prof_data in profiles.items():
        print(f"--> Sincronizando perfil '{prof_id}'...")
        db.collection("profiles").document(prof_id).set(prof_data, merge=True)
    print(f"✅ {len(profiles)} perfil(is) sincronizado(s) no Firestore!")

    # 2. Sync Jobs (in batches)
    jobs = data.get("jobs", {})
    batch = db.batch()
    batch_count = 0
    total_jobs = 0

    for job_id, job_data in jobs.items():
        doc_ref = db.collection("jobs").document(str(job_id))
        batch.set(doc_ref, job_data, merge=True)
        batch_count += 1
        total_jobs += 1
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()
    print(f"✅ {total_jobs} vagas sincronizadas no Firestore!")

    # 3. Sync Applications
    applications = data.get("applications", {})
    batch = db.batch()
    batch_count = 0
    total_apps = 0

    for app_id, app_data in applications.items():
        doc_ref = db.collection("applications").document(str(app_id))
        batch.set(doc_ref, app_data, merge=True)
        batch_count += 1
        total_apps += 1
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()
    print(f"✅ {total_apps} candidaturas sincronizadas no Firestore!")

    # 4. Sync Scan History
    scans = data.get("scan_history", {})
    for scan_id, scan_data in scans.items():
        db.collection("scan_history").document(str(scan_id)).set(scan_data, merge=True)
    print(f"✅ {len(scans)} varreduras sincronizadas no Firestore!")

    # Verify by reading back 1 job and profile
    test_prof = db.collection("profiles").document("master_profile").get()
    if test_prof.exists:
        prof_dict = test_prof.to_dict()
        print(f" Verificação Cloud: Perfil '{prof_dict.get('full_name')}' carregado com sucesso da Cloud!")

    test_jobs = list(db.collection("jobs").limit(3).stream())
    print(f" Verificação Cloud: {len(test_jobs)} vagas de teste lidas com sucesso da Cloud!")

    print("\n Sincronização com o Firebase Firestore (projeto: new-career-9289e) concluída com 100% de sucesso!")

if __name__ == "__main__":
    sync_to_cloud()
