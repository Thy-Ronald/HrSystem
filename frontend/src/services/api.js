const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function submitContract(payload) {
  const res = await fetch(`${API_BASE}/api/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Unable to submit contract');
  }
  return res.json();
}

export async function fetchGithubProfile(username) {
  const res = await fetch(`${API_BASE}/api/github/${username}`);
  if (!res.ok) {
    const errText = res.status === 404 ? 'User not found' : 'Unable to fetch data';
    throw new Error(errText);
  }
  return res.json();
}

export async function fetchContracts() {
  const res = await fetch(`${API_BASE}/api/contracts`);
  if (!res.ok) {
    throw new Error('Unable to load contracts');
  }
  return res.json();
}
