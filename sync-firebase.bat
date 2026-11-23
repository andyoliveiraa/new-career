@echo off
echo ========================================================
echo  Sincronizando New Career com o Firebase Firestore
echo ========================================================
backend\.venv\Scripts\python.exe backend\app\scripts\sync_to_cloud_firestore.py
pause
