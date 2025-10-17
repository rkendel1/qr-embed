import { useEffect, useState } from "react";

export default function QRPage({ token, session }) {
  const [approved, setApproved] = useState(false);

  const handleApprove = async () => {
    try {
      await fetch("/api/session/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setApproved(true);
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Approve Connection?</h2>
      {approved ? (
        <p>Approved! You can close this window.</p>
      ) : (
        <button onClick={handleApprove} style={{ padding: 10, fontSize: 16 }}>
          Approve
        </button>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const sessionModule = await import("../api/session/sessions");
  const { sessions } = sessionModule;
  const token = context.params.token;

  if (!sessions.get(token)) {
    return { notFound: true };
  }

  return { props: { token, session: sessions.get(token) } };
}
