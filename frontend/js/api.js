const BASE_URL = "http://127.0.0.1:5000";

// Helper function to show toast notifications
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.innerHTML = `
    <strong>${isError ? '❌ Error' : '✅ Success'}</strong>
    <p style="margin-top: 4px;">${message}</p>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function parseResponse(res, showSuccessToast = false, successMessage = '') {
  const raw = await res.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: `Request failed (${res.status})` };
    }
  }

  if (!res.ok) {
    const errorMsg = data.error || `Request failed (${res.status})`;
    showToast(errorMsg, true);
    throw new Error(errorMsg);
  }

  if (showSuccessToast && successMessage) {
    showToast(successMessage, false);
  }

  return data;
}

export async function addUser(payload) {
  const res = await fetch(`${BASE_URL}/add_user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse(res, true, `User ${payload.user_id} created successfully!`);
}

export async function addMovie(payload) {
  const res = await fetch(`${BASE_URL}/add_movie`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse(res, true, `Movie "${payload.title}" added to catalog!`);
}

export async function linkUserMovie(payload) {
  const res = await fetch(`${BASE_URL}/link_user_movie`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse(res, true, `User activity recorded successfully!`);
}

export async function getUserInsights(userId) {
  const res = await fetch(`${BASE_URL}/user_insights/${encodeURIComponent(userId)}`);
  return parseResponse(res);
}

export async function getRecommendations(userId) {
  const res = await fetch(`${BASE_URL}/recommend/${encodeURIComponent(userId)}`);
  return parseResponse(res);
}

export async function getSimilarUsers(userId) {
  const res = await fetch(`${BASE_URL}/similar_users/${encodeURIComponent(userId)}`);
  return parseResponse(res);
}

export async function getGraph() {
  const res = await fetch(`${BASE_URL}/graph`);
  return parseResponse(res);
}

export async function importCsv(file) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/import_csv`, {
    method: "POST",
    body: form
  });
  return parseResponse(res, true, `CSV imported successfully!`);
}