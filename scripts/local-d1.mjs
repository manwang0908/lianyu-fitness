import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function localD1(filename=':memory:') {
  const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON');
  const wrap=(sql,args=[])=>({sql,args,bind(...values){return wrap(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}});
  return {sqlite,prepare:sql=>wrap(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close(){sqlite.close();}};
}
export function migrateLocal(db,folder) {
  if(folder instanceof URL)folder=fileURLToPath(folder);
  // Development only. Production applies the generated migrations through Sites.
  db.sqlite.exec('CREATE TABLE IF NOT EXISTS __local_migrations (name TEXT PRIMARY KEY)');
  for(const name of readdirSync(folder).filter(n=>n.endsWith('.sql')).sort()){
    if(db.sqlite.prepare('SELECT 1 FROM __local_migrations WHERE name=?').get(name))continue;
    db.sqlite.exec('BEGIN');try{db.sqlite.exec(readFileSync(path.join(folder,name),'utf8'));db.sqlite.prepare('INSERT INTO __local_migrations VALUES (?)').run(name);db.sqlite.exec('COMMIT');}catch(e){db.sqlite.exec('ROLLBACK');throw e;}
  }
}
