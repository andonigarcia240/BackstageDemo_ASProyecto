#!/usr/bin/env bash

APP_PWD=$(tr -d '\r\n' < secrets/mongo_app_pwd.txt)
APP_USR=$(tr -d '\r\n' < secrets/mongo_app_user.txt)
ROOT_PWD=$(tr -d '\r\n' < secrets/mongo_root_pwd.txt)
ROOT_USR=$(tr -d '\r\n' < secrets/mongo_root_user.txt)

cat > .env <<EOF
APP_USER=$APP_USR
APP_PWD=$APP_PWD
MONGO_INITDB_ROOT_USERNAME=$ROOT_USR
MONGO_INITDB_ROOT_PASSWORD=$ROOT_PWD
EOF
