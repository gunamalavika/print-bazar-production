async function main() {
  // 1. Login as operations
  const opRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'operations@printbazzar.com', password: 'Admin@12345' }),
  });
  const opData = await opRes.json();
  console.log('Operations Login Status:', opRes.status, 'User:', opData.user?.email, opData.user?.role);

  // 2. Login as designer (Priya)
  const priyaRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.n@printbazzar.com', password: 'Admin@12345' }),
  });
  const priyaData = await priyaRes.json();
  console.log('Priya Login Status:', priyaRes.status, 'User:', priyaData.user?.email, priyaData.user?.role);

  // 3. Test assign with NO token
  const noTokenRes = await fetch('http://localhost:4000/api/v1/operations/orders/PB-20261029-0007/design-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designerId: '7df37587-452f-48ed-985b-53520ba97877' }),
  });
  const noTokenJson = await noTokenRes.json();
  console.log('No Token Assign Response:', noTokenRes.status, noTokenJson);

  // 4. Test assign with Priya token (DESIGNER_PREPRESS)
  const priyaAssignRes = await fetch('http://localhost:4000/api/v1/operations/orders/PB-20261029-0007/design-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${priyaData.accessToken}` },
    body: JSON.stringify({ designerId: '7df37587-452f-48ed-985b-53520ba97877' }),
  });
  const priyaAssignJson = await priyaAssignRes.json();
  console.log('Priya Token Assign Response:', priyaAssignRes.status, priyaAssignJson);

  // 5. Test assign with Operations token
  const opAssignRes = await fetch('http://localhost:4000/api/v1/operations/orders/PB-20261029-0007/design-assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opData.accessToken}` },
    body: JSON.stringify({ designerId: '7df37587-452f-48ed-985b-53520ba97877' }),
  });
  const opAssignJson = await opAssignRes.json();
  console.log('Operations Token Assign Response:', opAssignRes.status, opAssignJson);
}

main().catch(console.error);
