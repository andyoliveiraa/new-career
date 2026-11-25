import argparse
import asyncio
import os
import sys

from backend.app.firebase import firebase_manager
from backend.app.services.career_ops_importer import CareerOpsImporter


async def run_import(directory: str, email: str) -> None:
    if not os.path.isdir(directory):
        print(f"ERRO: Diretório não encontrado: {directory}")
        sys.exit(1)

    user = await firebase_manager.get_user_by_email(email)
    if not user:
        print(f"ERRO: Utilizador com email '{email}' não encontrado. Registe a conta primeiro na aplicação.")
        sys.exit(1)

    result = await CareerOpsImporter.import_from_directory(directory, user["id"])
    print(f"--> Sucesso! {result['jobs_count']} vagas/candidaturas importadas para {user['email']}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Importar workspace Career-Ops para um utilizador New Career.")
    parser.add_argument("--dir", default=os.getenv("CAREER_OPS_DIR", "./storage/career_ops_source"), help="Caminho da pasta Career-Ops")
    parser.add_argument("--email", required=True, help="Email do utilizador destino")
    args = parser.parse_args()
    asyncio.run(run_import(args.dir, args.email))


if __name__ == "__main__":
    main()
