"""Ensayo local con dos bases nuevas y datos ficticios; nunca restaura sobre la base de entrada."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import secrets
from uuid import UUID, uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from reservas.config import Settings
from reservas.store import Store, initialize, DEMO_EVENT

TABLES = ('events', 'reservations', 'outbox', 'notification_deliveries')

def snapshot(url):
    with psycopg.connect(url, options='-c search_path=recovery') as conn:
        data = {}
        for table in TABLES:
            rows = conn.execute(sql.SQL('SELECT * FROM {} ORDER BY 1').format(sql.Identifier(table))).fetchall()
            data[table] = rows
        encoded = json.dumps(data, default=str, sort_keys=True, separators=(',', ':')).encode()
        event = conn.execute('SELECT capacity, available FROM events').fetchone()
        sold = conn.execute("SELECT COALESCE(sum(quantity),0) FROM reservations WHERE status='confirmed'").fetchone()[0]
        pending = conn.execute('SELECT count(*) FROM outbox WHERE processed_at IS NULL').fetchone()[0]
        if event[0] != event[1] + sold:
            raise RuntimeError('Invariante de inventario incumplida')
        return {'sha256_rows':hashlib.sha256(encoded).hexdigest(), 'counts':{t:len(data[t]) for t in TABLES},
                'capacity':event[0], 'available':event[1], 'confirmed_quantity':sold, 'pending_outbox':pending}

def run(pg_bin, evidence):
    admin_url = os.environ['LAB_DATABASE_URL']
    info = conninfo_to_dict(admin_url)
    if info.get('host') != '127.0.0.1' or info.get('hostaddr') not in (None, '127.0.0.1') or info.get('service'):
        raise ValueError('Usar PostgreSQL de laboratorio en 127.0.0.1, sin service ni otro hostaddr')
    evidence.mkdir(parents=True, exist_ok=False)
    token = uuid4().hex
    names = ['seminario_recovery_source_'+token, 'seminario_recovery_target_'+token]
    urls = [make_conninfo(admin_url, dbname=name) for name in names]
    created = []
    owner = UUID('10000000-0000-0000-0000-000000000001')
    client_keys={secrets.token_hex(32):str(owner)}
    dump = evidence/'synthetic-backup.dump'
    flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    def command(tool, args, db_url=None):
        exe = pg_bin/(tool+('.exe' if os.name=='nt' else ''))
        env = os.environ.copy()
        if db_url:
            ci = conninfo_to_dict(db_url)
            for key, variable in [('host','PGHOST'),('port','PGPORT'),('user','PGUSER'),('password','PGPASSWORD'),('dbname','PGDATABASE')]:
                if key in ci:env[variable]=ci[key]
            env['PGCONNECT_TIMEOUT']='5'
        result = subprocess.run([str(exe),*args], env=env, capture_output=True, text=True, creationflags=flags)
        if result.returncode:
            raise RuntimeError(tool+' falló; consultar el entorno privado de laboratorio')
        return result.stdout.strip()
    try:
        with psycopg.connect(admin_url, autocommit=True) as admin:
            for name in names:
                admin.execute(sql.SQL('CREATE DATABASE {} TEMPLATE template0').format(sql.Identifier(name)))
                created.append(name)
        config = Settings(urls[0], client_keys, schema='recovery')
        with psycopg.connect(urls[0], autocommit=True) as conn:conn.execute('CREATE SCHEMA recovery')
        initialize(config, capacity=100)
        store = Store(config);store.open()
        try:
            first = None
            for n in range(1,11):
                reservation, new = store.reserve(owner, 'recovery-'+str(n), DEMO_EVENT, n)
                if not new:raise RuntimeError('Reserva semilla repetida')
                if n==1:first=reservation
            if store.process_batch(limit=4)!=4:raise RuntimeError('No se procesaron cuatro eventos')
            before = snapshot(urls[0])
            start = time.perf_counter()
            command('pg_dump', ['--format=custom','--no-acl','--file='+str(dump)], urls[0])
            dump_seconds = time.perf_counter()-start
            store.reserve(owner,'post-backup',DEMO_EVENT,3)
            source_later=snapshot(urls[0])
        finally:store.close()
        start=time.perf_counter()
        command('pg_restore',['--exit-on-error','--no-owner','--no-acl','--dbname='+names[1],str(dump)],urls[1])
        restore_seconds=time.perf_counter()-start
        restored=snapshot(urls[1])
        if before != restored:raise RuntimeError('La restauración difiere del estado respaldado')
        restored_store=Store(Settings(urls[1],client_keys,schema='recovery'));restored_store.open()
        try:
            replay,new=restored_store.reserve(owner,'recovery-1',DEMO_EVENT,1)
            if new or replay!=first:raise RuntimeError('Idempotencia no conservada')
            if snapshot(urls[1])!=restored:raise RuntimeError('Reintento alteró datos')
            processed=restored_store.process_batch()
            repeated=restored_store.process_batch()
            if processed!=6 or repeated!=0:raise RuntimeError('Procesamiento outbox incorrecto')
            after_worker=snapshot(urls[1])
            if after_worker['counts']['notification_deliveries']!=10:raise RuntimeError('Recepciones inconsistentes')
            _,new=restored_store.reserve(owner,'new-after-restore',DEMO_EVENT,2)
            if not new:raise RuntimeError('Nueva reserva no creada')
            final=snapshot(urls[1])
        finally:restored_store.close()
        result={'status':'pass','scope':'PostgreSQL local nativo; dos bases temporales; Store directo, sin HTTP ni Kubernetes',
                'pg_dump':command('pg_dump',['--version']), 'pg_restore':command('pg_restore',['--version']),
                'backup_sha256':hashlib.sha256(dump.read_bytes()).hexdigest(), 'backup_bytes':dump.stat().st_size,
                'dump_seconds':round(dump_seconds,4),'restore_command_seconds':round(restore_seconds,4),
                'before_backup':before,'source_after_backup_write':source_later,'restored':restored,
                'idempotent_replay_preserved':True,'outbox_processed_after_restore':processed,
                'outbox_second_pass':repeated,'after_worker':after_worker,'after_new_reservation':final,
                'post_backup_write_absent_in_target':restored['counts']['reservations']==10 and source_later['counts']['reservations']==11}
        return result
    finally:
        with psycopg.connect(admin_url,autocommit=True) as admin:
            for name in reversed(created):
                admin.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(name)))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pg-bin',type=Path,required=True)
    parser.add_argument('--evidence-dir',type=Path,required=True)
    args=parser.parse_args()
    result=run(args.pg_bin,args.evidence_dir)
    result['temporary_databases_removed']=True
    (args.evidence_dir/'result.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result))
