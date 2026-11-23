import os
import json
import logging
import uuid
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
    _local_data: Dict[str, Any] = {
        "users": {},
        "user_data": {}
    }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = FirebaseManager()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        # 0. Always load local persistent store first
        self._load_local_store()

        # 1. Check if Firebase credentials JSON exists
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if cred_path and os.path.exists(cred_path):
            try:
                try:
                    firebase_admin.get_app()
                except ValueError:
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
                try:
                    firebase_admin.get_app()
                except ValueError:
                    options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
                    cred = credentials.ApplicationDefault()
                    firebase_admin.initialize_app(cred, options)

                self._db = firestore.client()
                self._is_live = True
                logger.info("Firebase Firestore conectado via ApplicationDefault")
                return
            except Exception as e:
                logger.warning(f"Falha ao conectar ao Firebase via ApplicationDefault: {e}")

        # 3. Local persistent fallback store
        logger.info("Firebase rodando em modo Local Firestore (armazenamento persistente em storage/local_firestore.json).")

    def _load_local_store(self):
        os.makedirs(os.path.dirname(self._local_store_path), exist_ok=True)
        if os.path.exists(self._local_store_path):
            try:
                with open(self._local_store_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._local_data = {
                        "users": data.get("users", {}),
                        "user_data": data.get("user_data", {})
                    }
            except Exception as e:
                logger.warning(f"Erro ao carregar store local Firestore: {e}")

    def _save_local_store(self):
        try:
            with open(self._local_store_path, "w", encoding="utf-8") as f:
                json.dump(self._local_data, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            logger.warning(f"Erro ao persistir store local Firestore: {e}")

    def _get_user_partition(self, user_id: str) -> Dict[str, Any]:
        if "user_data" not in self._local_data:
            self._local_data["user_data"] = {}
        if user_id not in self._local_data["user_data"]:
            self._local_data["user_data"][user_id] = {
                "profile": {},
                "jobs": {},
                "applications": {},
                "scan_history": {},
                "cv_templates": {}
            }
        partition = self._local_data["user_data"][user_id]
        if "cv_templates" not in partition:
            partition["cv_templates"] = {}
        return partition

    # ==================== USERS & AUTH ====================
    async def create_user(self, email: str, password_hash: str, full_name: str) -> Dict[str, Any]:
        email_clean = email.strip().lower()
        # Check if email already exists
        for u in self._local_data["users"].values():
            if u.get("email", "").lower() == email_clean:
                raise ValueError("Este email já se encontra registado.")

        user_id = uuid.uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        user_doc = {
            "id": user_id,
            "email": email_clean,
            "password_hash": password_hash,
            "full_name": full_name.strip(),
            "has_completed_onboarding": False,
            "created_at": now,
            "updated_at": now
        }

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).set(user_doc)
            except Exception as e:
                logger.warning(f"Aviso ao salvar user no Firestore Cloud: {e}")

        self._local_data["users"][user_id] = user_doc
        self._get_user_partition(user_id)  # initialize partition
        self._save_local_store()
        return user_doc

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        email_clean = email.strip().lower()
        if self._is_live and self._db:
            try:
                query = self._db.collection("users").where("email", "==", email_clean).limit(1).stream()
                for doc in query:
                    user_dict = doc.to_dict()
                    self._local_data["users"][user_dict["id"]] = user_dict
                    return user_dict
            except Exception as e:
                logger.warning(f"Aviso ao buscar user por email no Firestore Cloud: {e}")

        for u in self._local_data["users"].values():
            if u.get("email", "").lower() == email_clean:
                return u
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self._is_live and self._db:
            try:
                doc = self._db.collection("users").document(user_id).get()
                if doc.exists:
                    user_dict = doc.to_dict()
                    self._local_data["users"][user_id] = user_dict
                    return user_dict
            except Exception as e:
                logger.warning(f"Aviso ao buscar user por id no Firestore Cloud: {e}")

        return self._local_data["users"].get(user_id)

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        user.update(updates)

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).set(user, merge=True)
            except Exception as e:
                logger.warning(f"Aviso ao atualizar user no Firestore Cloud: {e}")

        self._local_data["users"][user_id] = user
        self._save_local_store()
        return user

    # ==================== PROFILE ====================
    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        if self._is_live and self._db:
            try:
                doc = self._db.collection("users").document(user_id).collection("profile").document("master").get()
                if doc.exists:
                    prof = doc.to_dict()
                    partition["profile"] = prof
                    return prof
            except Exception as e:
                logger.warning(f"Aviso ao obter perfil no Firestore Cloud: {e}")

        return partition.get("profile", {})

    async def save_profile(self, user_id: str, profile_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        now = datetime.now(timezone.utc).isoformat()
        profile_dict["updated_at"] = now
        profile_dict["user_id"] = user_id

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).collection("profile").document("master").set(profile_dict, merge=True)
            except Exception as e:
                logger.warning(f"Aviso ao salvar perfil no Firestore Cloud: {e}")

        partition["profile"] = profile_dict
        self._save_local_store()
        return profile_dict

    # ==================== JOBS ====================
    async def save_job(self, user_id: str, job_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        job_key = job_dict.get("job_key") or str(job_dict.get("id"))
        doc_id = str(job_dict.get("id") or job_key)

        now = datetime.now(timezone.utc).isoformat()
        job_dict["updated_at"] = now
        job_dict["user_id"] = user_id
        if not job_dict.get("created_at"):
            job_dict["created_at"] = now

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).collection("jobs").document(doc_id).set(job_dict, merge=True)
            except Exception as e:
                logger.warning(f"Aviso ao salvar job no Firestore Cloud: {e}")

        partition["jobs"][doc_id] = job_dict
        self._save_local_store()
        return job_dict

    async def get_job(self, user_id: str, job_id: int) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)

        if self._is_live and self._db:
            try:
                doc = self._db.collection("users").document(user_id).collection("jobs").document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.warning(f"Aviso ao obter job no Firestore Cloud: {e}")

        return partition["jobs"].get(doc_id)

    async def list_jobs(self, user_id: str, query: str = None, location: str = None, source: str = None,
                        status: str = None, liveness: str = None, is_remote: bool = None,
                        limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        all_jobs = list(partition["jobs"].values())

        # Pull live if available and empty
        if self._is_live and self._db and not all_jobs:
            try:
                docs = self._db.collection("users").document(user_id).collection("jobs").stream()
                live_jobs = [d.to_dict() for d in docs]
                if live_jobs:
                    all_jobs = live_jobs
                    partition["jobs"] = {str(j.get("id")): j for j in all_jobs}
            except Exception as e:
                logger.warning(f"Aviso ao listar jobs no Firestore Cloud: {e}")

        # In-memory filtering
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

        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return filtered[offset : offset + limit]

    async def delete_job(self, user_id: str, job_id: int) -> bool:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).collection("jobs").document(doc_id).delete()
                self._db.collection("users").document(user_id).collection("applications").document(doc_id).delete()
            except Exception as e:
                logger.warning(f"Aviso ao deletar job no Firestore Cloud: {e}")

        partition["jobs"].pop(doc_id, None)
        partition["applications"].pop(doc_id, None)
        self._save_local_store()
        return True

    # ==================== APPLICATIONS ====================
    async def save_application(self, user_id: str, job_id: int, app_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)
        now = datetime.now(timezone.utc).isoformat()
        app_dict["job_id"] = job_id
        app_dict["user_id"] = user_id
        app_dict["updated_at"] = now
        if not app_dict.get("created_at"):
            app_dict["created_at"] = now

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).collection("applications").document(doc_id).set(app_dict, merge=True)
            except Exception as e:
                logger.warning(f"Aviso ao salvar candidatura no Firestore Cloud: {e}")

        partition["applications"][doc_id] = app_dict

        # Also update linked job status
        if doc_id in partition["jobs"]:
            partition["jobs"][doc_id]["application_status"] = app_dict.get("status")
            if app_dict.get("match_score"):
                partition["jobs"][doc_id]["match_score"] = app_dict.get("match_score")

        self._save_local_store()
        return app_dict

    async def get_application(self, user_id: str, job_id: int) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)

        if self._is_live and self._db:
            try:
                doc = self._db.collection("users").document(user_id).collection("applications").document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.warning(f"Aviso ao obter candidatura no Firestore Cloud: {e}")

        return partition["applications"].get(doc_id)

    async def get_stats(self, user_id: str) -> Dict[str, int]:
        partition = self._get_user_partition(user_id)
        all_apps = list(partition["applications"].values())
        counts = {
            "total_jobs": len(partition["jobs"]),
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

    # ==================== SCAN HISTORY ====================
    async def add_scan_history(self, user_id: str, scan_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        scan_id = str(len(partition["scan_history"]) + 1)
        now = datetime.now(timezone.utc).isoformat()
        scan_dict["id"] = int(scan_id)
        scan_dict["user_id"] = user_id
        scan_dict["executed_at"] = now

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).collection("scan_history").document(scan_id).set(scan_dict)
            except Exception as e:
                logger.warning(f"Aviso ao salvar scan history no Firestore Cloud: {e}")

        partition["scan_history"][scan_id] = scan_dict
        self._save_local_store()
        return scan_dict

    async def get_scan_history(self, user_id: str, limit: int = 15) -> List[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        history = list(partition["scan_history"].values())
        history.sort(key=lambda x: x.get("executed_at", ""), reverse=True)
        return history[:limit]

    # ==================== CV TEMPLATES ====================
    async def list_cv_templates(self, user_id: str) -> List[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        if "cv_templates" not in partition:
            partition["cv_templates"] = {}

        if self._is_live and self._db:
            try:
                docs = self._db.collection("users").document(user_id).collection("cv_templates").stream()
                for doc in docs:
                    t = doc.to_dict()
                    partition["cv_templates"][t["id"]] = t
            except Exception as e:
                logger.warning(f"Aviso ao listar cv_templates no Firestore Cloud: {e}")

        # If user has no templates, auto-seed defaults
        if not partition["cv_templates"]:
            await self._seed_default_templates(user_id)

        templates = list(partition["cv_templates"].values())
        templates.sort(key=lambda x: (not x.get("is_default", False), x.get("created_at", "")))
        return templates

    async def get_cv_template(self, user_id: str, template_id: str) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        if "cv_templates" not in partition:
            partition["cv_templates"] = {}

        if self._is_live and self._db:
            try:
                doc = self._db.collection("users").document(user_id).collection("cv_templates").document(template_id).get()
                if doc.exists:
                    t = doc.to_dict()
                    partition["cv_templates"][t["id"]] = t
                    return t
            except Exception as e:
                logger.warning(f"Aviso ao obter cv_template no Firestore Cloud: {e}")

        if not partition["cv_templates"]:
            await self._seed_default_templates(user_id)

        return partition["cv_templates"].get(template_id)

    async def save_cv_template(self, user_id: str, template_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        if "cv_templates" not in partition:
            partition["cv_templates"] = {}

        now = datetime.now(timezone.utc).isoformat()
        t_id = template_dict.get("id") or f"tpl_{uuid.uuid4().hex[:8]}"
        template_dict["id"] = t_id
        template_dict["user_id"] = user_id
        template_dict["updated_at"] = now
        if not template_dict.get("created_at"):
            template_dict["created_at"] = now

        # If this template is set as default, unset default on all other templates
        if template_dict.get("is_default"):
            for other_id, other_t in partition["cv_templates"].items():
                if other_id != t_id and other_t.get("is_default"):
                    other_t["is_default"] = False
                    if self._is_live and self._db:
                        try:
                            self._db.collection("users").document(user_id).collection("cv_templates").document(other_id).update({"is_default": False})
                        except Exception:
                            pass

        if self._is_live and self._db:
            try:
                self._db.collection("users").document(user_id).collection("cv_templates").document(t_id).set(template_dict, merge=True)
            except Exception as e:
                logger.warning(f"Aviso ao salvar cv_template no Firestore Cloud: {e}")

        partition["cv_templates"][t_id] = template_dict
        self._save_local_store()
        return template_dict

    async def delete_cv_template(self, user_id: str, template_id: str) -> bool:
        partition = self._get_user_partition(user_id)
        if "cv_templates" not in partition:
            return False

        if template_id in partition["cv_templates"]:
            del partition["cv_templates"][template_id]

            if self._is_live and self._db:
                try:
                    self._db.collection("users").document(user_id).collection("cv_templates").document(template_id).delete()
                except Exception as e:
                    logger.warning(f"Aviso ao apagar cv_template no Firestore Cloud: {e}")

            self._save_local_store()
            return True
        return False

    async def _seed_default_templates(self, user_id: str):
        default_templates = [
            {
                "id": "tpl_classic_ats",
                "name": "ATS Clássico (Alta Compatibilidade)",
                "layout": "classic_ats",
                "has_photo": False,
                "photo_url": None,
                "accent_color": "#1e293b",
                "font_family": "Inter",
                "font_heading": "Inter",
                "font_size_scale": "normal",
                "blocks_order": ["summary", "skills", "experiences", "educations", "certifications", "projects", "languages"],
                "block_visibility": {
                    "summary": True, "skills": True, "experiences": True,
                    "educations": True, "certifications": True, "projects": True, "languages": True
                },
                "is_default": True
            },
            {
                "id": "tpl_modern_split",
                "name": "Executivo Moderno (Duas Colunas)",
                "layout": "modern_split",
                "has_photo": False,
                "photo_url": None,
                "accent_color": "#2563eb",
                "font_family": "DM Sans",
                "font_heading": "Space Grotesk",
                "font_size_scale": "normal",
                "blocks_order": ["summary", "skills", "experiences", "educations", "certifications", "projects", "languages"],
                "block_visibility": {
                    "summary": True, "skills": True, "experiences": True,
                    "educations": True, "certifications": True, "projects": True, "languages": True
                },
                "is_default": False
            },
            {
                "id": "tpl_tech_minimal",
                "name": "Tech Minimal (Engenharia & Tech)",
                "layout": "tech_minimal",
                "has_photo": False,
                "photo_url": None,
                "accent_color": "#0f766e",
                "font_family": "Space Grotesk",
                "font_heading": "Space Grotesk",
                "font_size_scale": "compact",
                "blocks_order": ["summary", "skills", "experiences", "projects", "educations", "certifications", "languages"],
                "block_visibility": {
                    "summary": True, "skills": True, "experiences": True,
                    "educations": True, "certifications": True, "projects": True, "languages": True
                },
                "is_default": False
            },
            {
                "id": "tpl_compact_executive",
                "name": "Compacto Simétrico",
                "layout": "compact_executive",
                "has_photo": False,
                "photo_url": None,
                "accent_color": "#4f46e5",
                "font_family": "Plus Jakarta Sans",
                "font_heading": "Plus Jakarta Sans",
                "font_size_scale": "normal",
                "blocks_order": ["summary", "skills", "experiences", "educations", "certifications", "projects", "languages"],
                "block_visibility": {
                    "summary": True, "skills": True, "experiences": True,
                    "educations": True, "certifications": True, "projects": True, "languages": True
                },
                "is_default": False
            }
        ]

        partition = self._get_user_partition(user_id)
        if "cv_templates" not in partition:
            partition["cv_templates"] = {}

        now = datetime.now(timezone.utc).isoformat()
        for t in default_templates:
            t["user_id"] = user_id
            t["created_at"] = now
            t["updated_at"] = now
            partition["cv_templates"][t["id"]] = t
            if self._is_live and self._db:
                try:
                    self._db.collection("users").document(user_id).collection("cv_templates").document(t["id"]).set(t)
                except Exception:
                    pass

        self._save_local_store()

firebase_manager = FirebaseManager.get_instance()
