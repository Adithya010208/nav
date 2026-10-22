const assert=require('node:assert/strict');const {loginDiagnostic}=require('./login-diagnostics.cjs');
const secret='fixture-sensitive-code';const d=loginDiagnostic({url:'https://auth.openai.com/log-in?code='+secret+'#'+secret,statusCode:403,resourceType:'script',requestHeaders:{Authorization:secret},error:'message '+secret});
assert.deepEqual(d,{host:'auth.openai.com',resource:'script',httpStatus:403});assert.equal(JSON.stringify(d).includes(secret),false);
assert.equal(loginDiagnostic({url:'https://other.invalid/?token='+secret,statusCode:500}),null);
assert.equal(loginDiagnostic({url:'https://auth.openai.com',statusCode:200}),null);
assert.deepEqual(loginDiagnostic({url:'https://auth.openai.com',error:'net::ERR_TIMED_OUT',resourceType:'xhr'}),{host:'auth.openai.com',resource:'xhr',networkError:'net::ERR_TIMED_OUT'});
console.log('Login diagnostics checks passed: fixed host allowlist, error/status-only capture, query/fragment/header redaction and successful-request exclusion.');
