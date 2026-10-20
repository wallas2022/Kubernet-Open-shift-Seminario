import json
import urllib.request
import urllib.error

def call(path, body=None, key='S17-LECTOR', operation=None):
    headers={'X-Api-Key':key}
    if body is not None: headers['Content-Type']='application/json'
    if operation: headers['Idempotency-Key']=operation
    req=urllib.request.Request('http://127.0.0.1:8080'+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
    try:
        with urllib.request.urlopen(req,timeout=5) as response: return response.status,json.load(response)
    except urllib.error.HTTPError as response: return response.code,json.load(response)

checks=[]
def check(ok,name):
    assert ok,name
    checks.append(name)
check(call('/_fixture',{'mode':'reset'})[0]==200,'fixture-reset')
check(call('/api/catalogo',key='wrong')[0]==401,'invalid-test-key')
status,catalog=call('/api/catalogo');check(status==200 and catalog['events'][0]['available']==25,'catalog-initial')
payload={'event_id':catalog['events'][0]['id'],'quantity':2}
status,first=call('/api/reservas',payload,operation='s17-reader-smoke-a');check(status==201,'create-fixture-only')
status,repeated=call('/api/reservas',payload,operation='s17-reader-smoke-a');check(status==200 and repeated==first,'replay-same-fixture')
check(call('/_fixture',{'mode':'lose-next'})[0]==200,'arm-lost-result')
check(call('/api/reservas',payload,operation='s17-reader-smoke-b')[0]==503,'uncertain-result')
status,recovered=call('/api/reservas',payload,operation='s17-reader-smoke-b');check(status==200 and recovered['id']!=first['id'],'recover-original-fixture')
check(call('/_fixture')[1]['reservations']==2,'exactly-two-fake-records')
check(call('/_fixture',{'mode':'reset'})[0]==200 and call('/_fixture')[1]['reservations']==0,'fixture-left-empty')
print(json.dumps({'sprint':'S17','mode':'volatile-local-fixture','passed':True,'checks':len(checks),'results':checks,'realBusiness':False}))
