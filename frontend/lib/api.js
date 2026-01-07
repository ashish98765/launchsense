// frontend/lib/api.js

export async function submitDecision(payload) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/decision`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Decision API failed");
  }

  return data;
}
