import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuantity } from '../src/reservation/quantity.ts';

test('quantity accepts boundaries only when stock permits', () => {
  assert.deepEqual(validateQuantity('1', 1), { ok:true, value:1 });
  assert.deepEqual(validateQuantity('100', 100), { ok:true, value:100 });
  assert.deepEqual(validateQuantity('23', 24), { ok:true, value:23 });
});
test('quantity rejects ambiguous formats and non-string values without coercion', () => {
  for (const input of ['0','101','1.5','1,5','1.0','1e2','+1','-1','01',' 1','1 ','','true','false','abc','١',true,false,1,100,null,undefined,{},[]]) {
    assert.deepEqual(validateQuantity(input, 1000), { ok:false, reason:'invalid' });
  }
});
test('quantity blocks insufficient or unusable availability', () => {
  assert.deepEqual(validateQuantity('100', 99), { ok:false, reason:'insufficient' });
  assert.deepEqual(validateQuantity('1', 0), { ok:false, reason:'insufficient' });
  for (const available of [-1, 2.5, NaN, Infinity]) assert.deepEqual(validateQuantity('1', available), { ok:false, reason:'unavailable' });
});
