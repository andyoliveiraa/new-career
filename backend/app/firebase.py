import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore
from backend.app.config import settings

logger = logging.getLogger(__name__)

class FirebaseManager:
    _instance = None
    _db = None
    _is_live = False
    _local_store_path = "./storage/local_firestore.json"
    _local_data: Dict[str, Dict[str, Any]] = {
        "jobs": {},
        "applications": {},
        "profiles": {},
        "scan_history": {}
    }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = FirebaseManager()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        # 0. Always load local persistent store first so cached and seeded jobs/profile are immediately ready
        self._load_local_store()

        # 1. Check if Firebase credentials JSON exists
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self._db = firestore.client()
                self._is_live = True
                logger.info(f"Firebase Firestore conectado com sucesso via certificado: {cred_path}")
                return
            except Exception as e:
                logger.warning(f"Falha ao conectar ao Firebase com certificado {cred_path}: {e}")

        # 2. Check for GOOGLE_APPLICATION_CREDENTIALS or default app credentials
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or settings.FIREBASE_PROJECT_ID:
            try:
                options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, options)
                self._db = firestore.client()
                self._is_live = True
                logger.info("Firebase Firestore conectado via ApplicationDefault")
                return
            except Exception as e:
                logger.warning(f"Falha ao conectar ao Firebase via ApplicationDefault: {e}")

        # 3. Local persistent fallback store (offline / developer mode)
        logger.info("Firebase rodando em modo Local Firestore (armazenamento persistente em storage/local_firestore.json). Para conectar à nuvem Firebase, insira seu ficheiro 'firebase-credentials.json'.")

    def _load_local_store(self):
        os.makedirs(os.path.dirname(self._local_store_path), exist_ok=True)
        if os.path.exists(self._local_store_path):
            try:
                with open(self._local_store_path, "r", encoding="utf-8") as f:
                    self._local_data = json.load(f)
            except Exception as e:
                logger.warning(f"Erro ao carregar store local Firestore: {e}")

    def _save_local_store(self):
        try:
            with open(self._local_store_path, "w", encoding="utf-8") as f:
                json.dump(self._local_data, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            logger.warning(f"Erro ao persistir store local Firestore: {e}")

    # ==================== JOBS ====================
    async def save_job(self, job_dict: Dict[str, Any]) -> Dict[str, Any]:
        job_key = job_dict.get("job_key") or str(job_dict.get("id"))
        doc_id = str(job_dict.get("id") or job_key)
        
        now = datetime.now(timezone.utc).isoformat()
        job_dict["updated_at"] = now
        if not job_dict.get("created_at"):
            job_dict["created_at"] = now

        if self._is_live and self._db:
            try:
                self._db.collection("jobs").document(doc_id).set(job_dict, merge=True)
            except Exception as e:
                logger.error(f"Erro ao salvar job no Firestore: {e}")

        # Update local cache/store
        self._local_data["jobs"][doc_id] = job_dict
        self._save_local_store()
        return job_dict

    async def get_job(self, job_id: int) -> Optional[Dict[str, Any]]:
        doc_id = str(job_id)
        if self._is_live and self._db:
            try:
                doc = self._db.collection("jobs").document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Erro ao obter job no Firestore: {e}")

        return self._local_data["jobs"].get(doc_id)

    async def list_jobs(self, query: str = None, location: str = None, source: str = None,
                        status: str = None, liveness: str = None, is_remote: bool = None,
                        limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        all_jobs = list(self._local_data["jobs"].values())
        
        # Pull live if available and empty
        if self._is_live and self._db and not all_jobs:
            try:
                docs = self._db.collection("jobs").stream()
                all_jobs = [d.to_dict() for d in docs]
                self._local_data["jobs"] = {str(j.get("id")): j for j in all_jobs}
            except Exception as e:
                logger.error(f"Erro ao listar jobs do Firestore: {e}")

        # Filter in memory
        filtered = []
        for j in all_jobs:
            if query:
                q_lower = query.lower()
                text = f"{j.get('title', '')} {j.get('company', '')} {j.get('description', '')}".lower()
                if q_lower not in text:
                    continue
            if location and location.lower() not in (j.get("location") or "").lower():
                continue
            if source and j.get("source") != source:
                continue
            if liveness and j.get("liveness_status") != liveness:
                continue
            if is_remote is not None and j.get("is_remote") != is_remote:
                continue
            if status and j.get("application_status") != status:
                continue
            filtered.append(j)

        # Sort by created_at desc
        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return filtered[offset : offset + limit]

    async def delete_job(self, job_id: int) -> bool:
        doc_id = str(job_id)
        if self._is_live and self._db:
            try:
                self._db.collection("jobs").document(doc_id).delete()
                self._db.collection("applications").document(doc_id).delete()
            except Exception as e:
                logger.error(f"Erro ao deletar job do Firestore: {e}")

        self._local_data["jobs"].pop(doc_id, None)
        self._local_data["applications"].pop(doc_id, None)
        self._save_local_store()
        return True

    # ==================== APPLICATIONS ====================
    async def save_application(self, job_id: int, app_dict: Dict[str, Any]) -> Dict[str, Any]:
        doc_id = str(job_id)
        now = datetime.now(timezone.utc).isoformat()
        app_dict["job_id"] = job_id
        app_dict["updated_at"] = now
        if not app_dict.get("created_at"):
            app_dict["created_at"] = now

        if self._is_live and self._db:
            try:
                self._db.collection("applications").document(doc_id).set(app_dict, merge=True)
            except Exception as e:
                logger.error(f"Erro ao salvar candidatura no Firestore: {e}")

        self._local_data["applications"][doc_id] = app_dict
        
        # Also update application_status on linked job
        if doc_id in self._local_data["jobs"]:
            self._local_data["jobs"][doc_id]["application_status"] = app_dict.get("status")
            if app_dict.get("match_score"):
                self._local_data["jobs"][doc_id]["match_score"] = app_dict.get("match_score")

        self._save_local_store()
        return app_dict

    async def get_application(self, job_id: int) -> Optional[Dict[str, Any]]:
        doc_id = str(job_id)
        if self._is_live and self._db:
            try:
                doc = self._db.collection("applications").document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Erro ao obter candidatura do Firestore: {e}")

        return self._local_data["applications"].get(doc_id)

    async def get_stats(self) -> Dict[str, int]:
        all_apps = list(self._local_data["applications"].values())
        counts = {
            "total_jobs": len(self._local_data["jobs"]),
            "disponivel": 0,
            "avaliada": 0,
            "em_preparacao": 0,
            "candidatado": 0,
            "entrevista": 0,
            "positiva": 0,
            "negativa": 0,
            "descartada": 0
        }
        for a in all_apps:
            st = a.get("status", "disponivel")
            if st in counts:
                counts[st] += 1
        return counts

    # ==================== PROFILE ====================
    async def get_profile(self) -> Dict[str, Any]:
        if self._is_live and self._db:
            try:
                doc = self._db.collection("profiles").document("master_profile").get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Erro ao obter perfil do Firestore: {e}")

        return self._local_data["profiles"].get("master_profile", {})

    async def save_profile(self, profile_dict: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        profile_dict["updated_at"] = now
        
        if self._is_live and self._db:
            try:
                self._db.collection("profiles").document("master_profile").set(profile_dict, merge=True)
            except Exception as e:
                logger.error(f"Erro ao salvar perfil no Firestore: {e}")

        self._local_data["profiles"]["master_profile"] = profile_dict
        self._save_local_store()
        return profile_dict

    # ==================== SCAN HISTORY ====================
    async def add_scan_history(self, scan_dict: Dict[str, Any]) -> Dict[str, Any]:
        scan_id = str(len(self._local_data["scan_history"]) + 1)
        now = datetime.now(timezone.utc).isoformat()
        scan_dict["id"] = int(scan_id)
        scan_dict["executed_at"] = now

        if self._is_live and self._db:
            try:
                self._db.collection("scan_history").document(scan_id).set(scan_dict)
            except Exception as e:
                logger.error(f"Erro ao salvar scan history no Firestore: {e}")

        self._local_data["scan_history"][scan_id] = scan_dict
        self._save_local_store()
        return scan_dict

    async def get_scan_history(self, limit: int = 15) -> List[Dict[str, Any]]:
        history = list(self._local_data["scan_history"].values())
        history.sort(key=lambda x: x.get("executed_at", ""), reverse=True)
        return history[:limit]

firebase_manager = FirebaseManager.get_instance()
