import asyncio
import json
import logging
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore

from backend.app.config import settings

logger = logging.getLogger(__name__)


class FirebaseManager:
    _instance = None
    _db = None
    _is_live = False
    _local_data: Dict[str, Any] = {
        "users": {},
        "user_data": {}
    }

    def __init__(self):
        self._lock = threading.RLock()
        self._local_store_path = os.path.join(settings.STORAGE_DIR, "local_firestore.json")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = FirebaseManager()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._load_local_store()

        if not settings.USE_FIREBASE:
            logger.info("USE_FIREBASE=false — operando em modo Local Firestore.")
            return

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

        logger.info("Firebase rodando em modo Local Firestore (armazenamento persistente local).")

    def _load_local_store(self):
        with self._lock:
            store_dir = os.path.dirname(self._local_store_path) or "."
            os.makedirs(store_dir, exist_ok=True)
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
        with self._lock:
            store_dir = os.path.dirname(self._local_store_path) or "."
            os.makedirs(store_dir, exist_ok=True)
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w",
                    encoding="utf-8",
                    dir=store_dir,
                    prefix=".local_firestore_",
                    suffix=".tmp",
                    delete=False
                ) as tmp:
                    tmp_path = tmp.name
                    json.dump(self._local_data, tmp, indent=2, ensure_ascii=False, default=str)
                os.replace(tmp_path, self._local_store_path)
            except Exception as e:
                logger.warning(f"Erro ao persistir store local Firestore: {e}")
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass

    def _get_user_partition(self, user_id: str) -> Dict[str, Any]:
        with self._lock:
            if "user_data" not in self._local_data:
                self._local_data["user_data"] = {}
            if user_id not in self._local_data["user_data"]:
                self._local_data["user_data"][user_id] = {
                    "profile": {},
                    "jobs": {},
                    "applications": {},
                    "scan_history": {},
                    "cv_templates": {},
                    "settings": {}
                }
            partition = self._local_data["user_data"][user_id]
            for key in ("profile", "jobs", "applications", "scan_history", "cv_templates", "settings"):
                if key not in partition:
                    partition[key] = {}
            return partition

    async def _run_cloud(self, fn, *args, **kwargs):
        return await asyncio.to_thread(fn, *args, **kwargs)

    # ==================== USERS & AUTH ====================
    async def create_user(self, email: str, password_hash: str, full_name: str) -> Dict[str, Any]:
        email_clean = email.strip().lower()
        existing = await self.get_user_by_email(email_clean)
        if existing:
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
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).set(user_doc)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar user no Firestore Cloud: {e}")

        with self._lock:
            self._local_data["users"][user_id] = user_doc
            self._get_user_partition(user_id)
            self._save_local_store()
        return user_doc

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        email_clean = email.strip().lower()
        if self._is_live and self._db:
            try:
                def _fetch():
                    query = self._db.collection("users").where("email", "==", email_clean).limit(1).stream()
                    for doc in query:
                        return doc.to_dict()
                    return None

                user_dict = await self._run_cloud(_fetch)
                if user_dict:
                    with self._lock:
                        self._local_data["users"][user_dict["id"]] = user_dict
                    return user_dict
            except Exception as e:
                logger.warning(f"Aviso ao buscar user por email no Firestore Cloud: {e}")

        with self._lock:
            for u in self._local_data["users"].values():
                if u.get("email", "").lower() == email_clean:
                    return u
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self._is_live and self._db:
            try:
                doc = await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).get()
                )
                if doc.exists:
                    user_dict = doc.to_dict()
                    with self._lock:
                        self._local_data["users"][user_id] = user_dict
                    return user_dict
            except Exception as e:
                logger.warning(f"Aviso ao buscar user por id no Firestore Cloud: {e}")

        with self._lock:
            return self._local_data["users"].get(user_id)

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        updates = dict(updates)
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        user.update(updates)

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).set(user, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao atualizar user no Firestore Cloud: {e}")

        with self._lock:
            self._local_data["users"][user_id] = user
            self._save_local_store()
        return user

    # ==================== PROFILE ====================
    async def get_profile(self, user_id: str) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        if self._is_live and self._db:
            try:
                doc = await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("profile").document("master").get()
                )
                if doc.exists:
                    prof = doc.to_dict()
                    with self._lock:
                        partition["profile"] = prof
                    return prof
            except Exception as e:
                logger.warning(f"Aviso ao obter perfil no Firestore Cloud: {e}")

        with self._lock:
            return dict(partition.get("profile", {}))

    async def save_profile(self, user_id: str, profile_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        now = datetime.now(timezone.utc).isoformat()
        profile_copy = dict(profile_dict)
        profile_copy["updated_at"] = now
        profile_copy["user_id"] = user_id

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("profile").document("master").set(profile_copy, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar perfil no Firestore Cloud: {e}")

        with self._lock:
            partition["profile"] = profile_copy
            self._save_local_store()
        return profile_copy

    # ==================== JOBS ====================
    def allocate_next_job_id(self, user_id: str) -> int:
        with self._lock:
            partition = self._get_user_partition(user_id)
            existing_ids = []
            for k, j in partition["jobs"].items():
                try:
                    existing_ids.append(int(j.get("id", k)))
                except (TypeError, ValueError):
                    pass
            return max(existing_ids, default=0) + 1

    async def save_job(self, user_id: str, job_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        job_copy = dict(job_dict)
        job_key = job_copy.get("job_key") or str(job_copy.get("id"))
        doc_id = str(job_copy.get("id") or job_key)

        now = datetime.now(timezone.utc).isoformat()
        job_copy["updated_at"] = now
        job_copy["user_id"] = user_id
        if not job_copy.get("created_at"):
            job_copy["created_at"] = now

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("jobs").document(doc_id).set(job_copy, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar job no Firestore Cloud: {e}")

        with self._lock:
            partition["jobs"][doc_id] = job_copy
            self._save_local_store()
        return job_copy

    async def get_job(self, user_id: str, job_id: int) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)

        if self._is_live and self._db:
            try:
                doc = await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("jobs").document(doc_id).get()
                )
                if doc.exists:
                    data = doc.to_dict()
                    with self._lock:
                        partition["jobs"][doc_id] = data
                    return data
            except Exception as e:
                logger.warning(f"Aviso ao obter job no Firestore Cloud: {e}")

        with self._lock:
            job = partition["jobs"].get(doc_id)
            return dict(job) if job else None

    async def list_jobs(
        self,
        user_id: str,
        query: Optional[str] = None,
        location: Optional[str] = None,
        source: Optional[str] = None,
        status: Optional[str] = None,
        liveness: Optional[str] = None,
        is_remote: Optional[bool] = None,
        max_distance: Optional[float] = None,
        sort_by: str = "created_at",
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        with self._lock:
            all_jobs = [dict(j) for j in partition["jobs"].values()]

        if self._is_live and self._db and not all_jobs:
            try:
                def _fetch_all():
                    docs = self._db.collection("users").document(user_id).collection("jobs").stream()
                    return [d.to_dict() for d in docs]

                live_jobs = await self._run_cloud(_fetch_all)
                if live_jobs:
                    all_jobs = live_jobs
                    with self._lock:
                        partition["jobs"] = {str(j.get("id")): j for j in all_jobs}
            except Exception as e:
                logger.warning(f"Aviso ao listar jobs no Firestore Cloud: {e}")

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
            if is_remote is not None and bool(j.get("is_remote")) != is_remote:
                continue
            if status and j.get("application_status") != status:
                continue
            if max_distance is not None:
                dist = j.get("distance_km")
                if dist is None or float(dist) > max_distance:
                    continue
            filtered.append(j)

        if sort_by == "match_score":
            filtered.sort(key=lambda x: (x.get("match_score") is not None, float(x.get("match_score") or 0)), reverse=True)
        elif sort_by == "distance_km":
            filtered.sort(key=lambda x: (x.get("distance_km") is None, float(x.get("distance_km") if x.get("distance_km") is not None else 999999)))
        else:
            filtered.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)

        return filtered[offset: offset + limit]

    async def delete_job(self, user_id: str, job_id: int) -> bool:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)

        if self._is_live and self._db:
            try:
                def _delete():
                    self._db.collection("users").document(user_id).collection("jobs").document(doc_id).delete()
                    self._db.collection("users").document(user_id).collection("applications").document(doc_id).delete()

                await self._run_cloud(_delete)
            except Exception as e:
                logger.warning(f"Aviso ao deletar job no Firestore Cloud: {e}")

        with self._lock:
            existed = doc_id in partition["jobs"] or doc_id in partition["applications"]
            partition["jobs"].pop(doc_id, None)
            partition["applications"].pop(doc_id, None)
            self._save_local_store()
        return existed

    # ==================== APPLICATIONS ====================
    async def save_application(self, user_id: str, job_id: int, app_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)
        now = datetime.now(timezone.utc).isoformat()
        app_copy = dict(app_dict)
        app_copy["job_id"] = job_id
        app_copy["user_id"] = user_id
        app_copy["updated_at"] = now
        if not app_copy.get("created_at"):
            app_copy["created_at"] = now

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("applications").document(doc_id).set(app_copy, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar candidatura no Firestore Cloud: {e}")

        with self._lock:
            partition["applications"][doc_id] = app_copy
            if doc_id in partition["jobs"]:
                partition["jobs"][doc_id]["application_status"] = app_copy.get("status")
                if app_copy.get("match_score") is not None:
                    partition["jobs"][doc_id]["match_score"] = app_copy.get("match_score")
                if self._is_live and self._db:
                    try:
                        job_updates = {"application_status": app_copy.get("status")}
                        if app_copy.get("match_score") is not None:
                            job_updates["match_score"] = app_copy.get("match_score")
                        await self._run_cloud(
                            lambda: self._db.collection("users").document(user_id).collection("jobs").document(doc_id).set(job_updates, merge=True)
                        )
                    except Exception:
                        pass
            self._save_local_store()
        return app_copy

    async def get_application(self, user_id: str, job_id: int) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        doc_id = str(job_id)

        if self._is_live and self._db:
            try:
                doc = await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("applications").document(doc_id).get()
                )
                if doc.exists:
                    data = doc.to_dict()
                    with self._lock:
                        partition["applications"][doc_id] = data
                    return data
            except Exception as e:
                logger.warning(f"Aviso ao obter candidatura no Firestore Cloud: {e}")

        with self._lock:
            app = partition["applications"].get(doc_id)
            return dict(app) if app else None

    async def list_applications(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        if self._is_live and self._db and not partition["applications"]:
            try:
                def _fetch():
                    return {d.id: d.to_dict() for d in self._db.collection("users").document(user_id).collection("applications").stream()}

                live_apps = await self._run_cloud(_fetch)
                with self._lock:
                    partition["applications"].update(live_apps)
            except Exception as e:
                logger.warning(f"Aviso ao listar candidaturas no Firestore Cloud: {e}")

        with self._lock:
            return {k: dict(v) for k, v in partition["applications"].items()}

    async def get_stats(self, user_id: str) -> Dict[str, int]:
        partition = self._get_user_partition(user_id)
        with self._lock:
            all_apps = list(partition["applications"].values())
            total_jobs = len(partition["jobs"])
        counts = {
            "total_jobs": total_jobs,
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
        with self._lock:
            existing_ids = []
            for k, v in partition["scan_history"].items():
                try:
                    existing_ids.append(int(v.get("id", k)))
                except (TypeError, ValueError):
                    pass
            next_id = max(existing_ids, default=0) + 1

        scan_id = str(next_id)
        now = datetime.now(timezone.utc).isoformat()
        scan_copy = dict(scan_dict)
        scan_copy["id"] = next_id
        scan_copy["user_id"] = user_id
        scan_copy["executed_at"] = scan_copy.get("executed_at") or now

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("scan_history").document(scan_id).set(scan_copy)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar scan history no Firestore Cloud: {e}")

        with self._lock:
            partition["scan_history"][scan_id] = scan_copy
            self._save_local_store()
        return scan_copy

    async def update_scan_history(self, user_id: str, scan_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        doc_id = str(scan_id)
        with self._lock:
            existing = partition["scan_history"].get(doc_id)
            if not existing:
                return None
            existing.update(updates)
            updated = dict(existing)

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("scan_history").document(doc_id).set(updated, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao atualizar scan history no Firestore Cloud: {e}")

        with self._lock:
            self._save_local_store()
        return updated

    async def get_scan_by_id(self, user_id: str, scan_id: int) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        with self._lock:
            rec = partition["scan_history"].get(str(scan_id))
            return dict(rec) if rec else None

    async def get_scan_history(self, user_id: str, limit: int = 15) -> List[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        if self._is_live and self._db and not partition["scan_history"]:
            try:
                def _fetch():
                    return [d.to_dict() for d in self._db.collection("users").document(user_id).collection("scan_history").stream()]

                live_history = await self._run_cloud(_fetch)
                with self._lock:
                    for h in live_history:
                        partition["scan_history"][str(h.get("id"))] = h
            except Exception as e:
                logger.warning(f"Aviso ao obter scan_history no Firestore Cloud: {e}")

        with self._lock:
            history = [dict(h) for h in partition["scan_history"].values()]
        history.sort(key=lambda x: str(x.get("executed_at", "")), reverse=True)
        return history[:limit]

    # ==================== CV TEMPLATES ====================
    async def list_cv_templates(self, user_id: str) -> List[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)
        if self._is_live and self._db:
            try:
                def _fetch():
                    return [doc.to_dict() for doc in self._db.collection("users").document(user_id).collection("cv_templates").stream()]

                docs = await self._run_cloud(_fetch)
                with self._lock:
                    for t in docs:
                        partition["cv_templates"][t["id"]] = t
            except Exception as e:
                logger.warning(f"Aviso ao listar cv_templates no Firestore Cloud: {e}")

        with self._lock:
            is_empty = not partition["cv_templates"]
        if is_empty:
            await self._seed_default_templates(user_id)

        with self._lock:
            templates = [dict(t) for t in partition["cv_templates"].values()]
        templates.sort(key=lambda x: (not x.get("is_default", False), str(x.get("created_at", ""))))
        return templates

    async def get_cv_template(self, user_id: str, template_id: str) -> Optional[Dict[str, Any]]:
        partition = self._get_user_partition(user_id)

        if self._is_live and self._db:
            try:
                doc = await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("cv_templates").document(template_id).get()
                )
                if doc.exists:
                    t = doc.to_dict()
                    with self._lock:
                        partition["cv_templates"][t["id"]] = t
                    return t
            except Exception as e:
                logger.warning(f"Aviso ao obter cv_template no Firestore Cloud: {e}")

        with self._lock:
            is_empty = not partition["cv_templates"]
        if is_empty:
            await self._seed_default_templates(user_id)

        with self._lock:
            tpl = partition["cv_templates"].get(template_id)
            return dict(tpl) if tpl else None

    async def save_cv_template(self, user_id: str, template_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        now = datetime.now(timezone.utc).isoformat()
        tpl_copy = dict(template_dict)
        t_id = tpl_copy.get("id") or f"tpl_{uuid.uuid4().hex[:8]}"
        tpl_copy["id"] = t_id
        tpl_copy["user_id"] = user_id
        tpl_copy["updated_at"] = now
        if not tpl_copy.get("created_at"):
            tpl_copy["created_at"] = now

        if tpl_copy.get("is_default"):
            with self._lock:
                other_defaults = [
                    other_id for other_id, other_t in partition["cv_templates"].items()
                    if other_id != t_id and other_t.get("is_default")
                ]
                for other_id in other_defaults:
                    partition["cv_templates"][other_id]["is_default"] = False

            if self._is_live and self._db:
                for other_id in other_defaults:
                    try:
                        await self._run_cloud(
                            lambda oid=other_id: self._db.collection("users").document(user_id).collection("cv_templates").document(oid).update({"is_default": False})
                        )
                    except Exception:
                        pass

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("cv_templates").document(t_id).set(tpl_copy, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar cv_template no Firestore Cloud: {e}")

        with self._lock:
            partition["cv_templates"][t_id] = tpl_copy
            self._save_local_store()
        return tpl_copy

    async def delete_cv_template(self, user_id: str, template_id: str) -> bool:
        partition = self._get_user_partition(user_id)
        with self._lock:
            if template_id not in partition["cv_templates"]:
                return False
            del partition["cv_templates"][template_id]

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("cv_templates").document(template_id).delete()
                )
            except Exception as e:
                logger.warning(f"Aviso ao apagar cv_template no Firestore Cloud: {e}")

        with self._lock:
            self._save_local_store()
        return True

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
        now = datetime.now(timezone.utc).isoformat()
        for t in default_templates:
            t["user_id"] = user_id
            t["created_at"] = now
            t["updated_at"] = now
            with self._lock:
                partition["cv_templates"][t["id"]] = t
            if self._is_live and self._db:
                try:
                    await self._run_cloud(
                        lambda tpl=t: self._db.collection("users").document(user_id).collection("cv_templates").document(tpl["id"]).set(tpl)
                    )
                except Exception:
                    pass

        self._save_local_store()

    # ==================== SETTINGS ====================
    async def get_user_settings(self, user_id: str) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        if self._is_live and self._db:
            try:
                doc = await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("settings").document("general").get()
                )
                if doc.exists:
                    st = doc.to_dict()
                    with self._lock:
                        partition["settings"] = st
                    return st
            except Exception as e:
                logger.warning(f"Aviso ao obter settings no Firestore Cloud: {e}")

        with self._lock:
            return dict(partition.get("settings", {}))

    async def save_user_settings(self, user_id: str, settings_dict: Dict[str, Any]) -> Dict[str, Any]:
        partition = self._get_user_partition(user_id)
        now = datetime.now(timezone.utc).isoformat()
        settings_copy = dict(settings_dict)
        settings_copy["user_id"] = user_id
        settings_copy["updated_at"] = now

        if self._is_live and self._db:
            try:
                await self._run_cloud(
                    lambda: self._db.collection("users").document(user_id).collection("settings").document("general").set(settings_copy, merge=True)
                )
            except Exception as e:
                logger.warning(f"Aviso ao salvar settings no Firestore Cloud: {e}")

        with self._lock:
            partition["settings"].update(settings_copy)
            self._save_local_store()
            return dict(partition["settings"])


firebase_manager = FirebaseManager.get_instance()
