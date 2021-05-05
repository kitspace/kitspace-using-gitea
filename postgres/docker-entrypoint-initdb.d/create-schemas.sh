#!/bin/bash

set -eu -o pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" "$POSTGRES_DB" <<-EOSQL
	CREATE ROLE kitspace;
	CREATE SCHEMA AUTHORIZATION kitspace;
	CREATE USER gitea WITH PASSWORD '$GITEA_POSTGRES_PASSWORD' IN ROLE kitspace;
	CREATE USER orders WITH PASSWORD '$ORDERS_POSTGRES_PASSWORD';
	CREATE SCHEMA AUTHORIZATION gitea;
	CREATE SCHEMA AUTHORIZATION orders;
EOSQL
