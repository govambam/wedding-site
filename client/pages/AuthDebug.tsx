import { useAuth } from "@/context/AuthContext";

export default function AuthDebug() {
  const { isAuthenticated, isLoading, userData, error } = useAuth();

  return (
    <div style={{
      padding: "2rem",
      fontFamily: "monospace",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      <h1 style={{ marginBottom: "2rem" }}>Auth Debug Info</h1>

      <div style={{
        backgroundColor: "#f5f5f5",
        padding: "1rem",
        marginBottom: "1rem",
        borderRadius: "4px"
      }}>
        <h3>Auth State:</h3>
        <pre>{JSON.stringify({
          isAuthenticated,
          isLoading,
          hasUserData: !!userData,
          hasError: !!error
        }, null, 2)}</pre>
      </div>

      {error && (
        <div style={{
          backgroundColor: "#ffebee",
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "4px",
          color: "#c62828"
        }}>
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      )}

      {userData && (
        <div style={{
          backgroundColor: "#e8f5e9",
          padding: "1rem",
          marginBottom: "1rem",
          borderRadius: "4px"
        }}>
          <h3>User Data:</h3>
          <pre style={{ fontSize: "0.85rem", overflow: "auto" }}>
            {JSON.stringify(userData, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        backgroundColor: "#fff3e0",
        padding: "1rem",
        borderRadius: "4px"
      }}>
        <h3>localStorage:</h3>
        <pre style={{ fontSize: "0.85rem", overflow: "auto" }}>
          {localStorage.getItem("wedding_user_data") || "No cached data"}
        </pre>
      </div>
    </div>
  );
}
