const fs = require('fs');

const APP_USER = fs.readFileSync('/run/secrets/mongo_app_user.txt', 'utf8').trim();
const APP_PWD  = fs.readFileSync('/run/secrets/mongo_app_pwd.txt',  'utf8').trim();

const roles = [
  { role: 'readWrite', db: 'appdb' },
  { role: 'readWrite', db: 'scoresdb' }
];

const admin = db.getSiblingDB('admin');
const info = admin.runCommand({ usersInfo: { user: APP_USER, db: 'admin' } });

if (!info.users || info.users.length === 0) {
  print(`>>> Creando usuario '${APP_USER}' en 'admin' con roles en appbd y scoresdb...`);
  admin.createUser({ user: APP_USER, pwd: APP_PWD, roles });
} 
else {
  print(`>>> Usuario '${APP_USER}' ya existe en 'admin'; actualizando roles/contraseña...`);
  admin.updateUser(APP_USER, { pwd: APP_PWD, roles });
}