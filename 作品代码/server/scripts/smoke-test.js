/**
 * Minimal smoke test for backend APIs.
 *
 * Usage:
 *   node scripts/smoke-test.js
 *
 * Env:
 *   BASE_URL=http://127.0.0.1:3000
 *   JUDGE_PASSWORD=123
 */

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function http(method, path, body, token) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${method} ${path} -> invalid JSON (${resp.status}): ${text.slice(0, 200)}`);
  }

  if (!resp.ok) {
    throw new Error(`${method} ${path} -> HTTP ${resp.status}: ${json.message || text.slice(0, 200)}`);
  }

  if (json && typeof json === 'object' && 'code' in json && json.code !== 200) {
    throw new Error(`${method} ${path} -> code=${json.code}: ${json.message || 'unknown error'}`);
  }

  return json.data;
}

async function main() {
  const results = [];

  const health = await http('GET', '/api/health');
  results.push(['/api/health', health.status === 'ok']);

  const demo = await http('GET', '/api/demo/status');
  results.push(['/api/demo/status', typeof demo.demoMode === 'boolean']);

  const login = await http('POST', '/api/login', {
    phone: process.env.JUDGE_PHONE || '13800138001',
    password: process.env.JUDGE_PASSWORD || '123'
  });
  const token = login.token;
  results.push(['judge login', Boolean(token)]);

  const patients = await http('GET', '/api/patients?page=1&pageSize=1', null, token);
  results.push(['/api/patients', Array.isArray(patients.list)]);

  const coze = await http('GET', '/api/ai/coze/status');
  results.push(['/api/ai/coze/status', typeof coze === 'object']);

  const cozeStatus = await http('GET', '/api/coze/status');
  results.push([
    '/api/coze/status',
    Boolean(cozeStatus && cozeStatus.coze && Array.isArray(cozeStatus.availableEndpoints))
  ]);
  const publicApiReadonly = cozeStatus.publicApiReadonly === true;

  const cozeOverview = await http('GET', '/api/coze/overview');
  results.push([
    '/api/coze/overview',
    Boolean(cozeOverview && cozeOverview.stats && Array.isArray(cozeOverview.recentAlerts))
  ]);

  const cozePatients = await http('GET', '/api/coze/patients?page=1&pageSize=3');
  results.push(['/api/coze/patients', Array.isArray(cozePatients.list)]);

  const cozeSummary = await http('GET', '/api/coze/patient/1/summary');
  results.push([
    '/api/coze/patient/:id/summary',
    Boolean(cozeSummary && cozeSummary.patient && cozeSummary.latestVitals)
  ]);

  if (publicApiReadonly) {
    let writeBlocked = false;
    try {
      await http('POST', '/api/coze/health-data', {
        patientId: 1,
        type: 'blood_sugar',
        value: 8.2
      });
    } catch {
      writeBlocked = true;
    }
    results.push(['/api/coze writes blocked in public read-only mode', writeBlocked]);
  } else {
    const cozeSugar = await http('POST', '/api/coze/health-data', {
      patientId: 1,
      type: 'blood_sugar',
      value: 8.2,
      mealPeriod: 'fasting',
      recordTime: '2026-04-29 08:20',
      source: 'smoke-test',
      notes: 'Coze smoke sugar'
    });
    results.push(['/api/coze/health-data sugar', Boolean(cozeSugar && cozeSugar.saved)]);

    const cozePressure = await http('POST', '/api/coze/health-data', {
      patientId: 1,
      type: 'blood_pressure',
      systolic: 152,
      diastolic: 96,
      heartRate: 82,
      recordTime: '2026-04-29 08:30',
      source: 'smoke-test',
      notes: 'Coze smoke pressure'
    });
    results.push(['/api/coze/health-data pressure', Boolean(cozePressure && cozePressure.saved)]);

    const cozeAlert = await http('POST', '/api/coze/alerts', {
      patientId: 1,
      level: 'medium',
      type: 'smoke_test',
      title: '接口自测预警',
      content: 'Coze 写入预警接口自测',
      source: 'smoke-test'
    });
    results.push(['/api/coze/alerts', Boolean(cozeAlert && cozeAlert.saved)]);

    const cozeFollowup = await http('POST', '/api/coze/followup-result', {
      patientId: 1,
      status: 'completed',
      result: '接口自测完成',
      notes: 'Coze 回访结果接口自测',
      source: 'smoke-test'
    });
    results.push(['/api/coze/followup-result', Boolean(cozeFollowup && cozeFollowup.saved)]);

    const cozeCallback = await http('POST', '/api/coze/workflow-callback', {
      workflowId: 'smoke-workflow',
      runId: `smoke-${Date.now()}`,
      patientId: 1,
      workflowType: 'smoke_test',
      status: 'success',
      input: { from: 'smoke-test' },
      output: { ok: true }
    });
    results.push(['/api/coze/workflow-callback', Boolean(cozeCallback && cozeCallback.saved)]);
  }

  const chat = await http('POST', '/api/ai/chat', {
    message: '你好，请给我一句慢病管理建议',
    agentType: 'doctor',
    patientId: 1
  }, token);
  results.push(['/api/ai/chat', Boolean(chat && (chat.reply || chat.response || chat.answer))]);

  const consults = await http('GET', '/api/ai/consultations?patient_id=1', null, token);
  results.push(['/api/ai/consultations', Array.isArray(consults)]);

  const report = await http('GET', '/api/ai/report/1', null, token);
  results.push([
    '/api/ai/report/:patientId',
    Boolean(
      report &&
        report.patient &&
        typeof report.summary === 'string' &&
        report.bloodSugar &&
        report.bloodPressure
    )
  ]);

  let deleteBlocked = false;
  try {
    await http('DELETE', '/api/patients/1', null, token);
  } catch {
    deleteBlocked = true;
  }
  results.push(['judge delete patient blocked', deleteBlocked]);

  const failed = results.filter(([, ok]) => !ok);
  for (const [name, ok] of results) {
    console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
  }

  if (failed.length) {
    process.exitCode = 1;
    return;
  }

  console.log('Smoke test passed.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exitCode = 1;
});
