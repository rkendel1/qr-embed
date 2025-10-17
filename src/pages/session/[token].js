import { useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const { token } = context.params;

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !session) {
    console.error("Error fetching session:", error);
    return { notFound: true };
  }

  return { props: { token, session } };
}