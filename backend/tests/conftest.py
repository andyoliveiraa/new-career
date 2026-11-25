import atexit
import os
import shutil
import tempfile

# Force isolated local test storage and disable live Cloud Firestore during pytest runs
_TEST_TMP_DIR = tempfile.mkdtemp(prefix="new_career_pytest_")
os.environ["USE_FIREBASE"] = "false"
os.environ["STORAGE_DIR"] = os.path.join(_TEST_TMP_DIR, "storage")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.join(_TEST_TMP_DIR, 'test_new_career.db')}"


def _cleanup_test_dir() -> None:
    shutil.rmtree(_TEST_TMP_DIR, ignore_errors=True)


atexit.register(_cleanup_test_dir)
