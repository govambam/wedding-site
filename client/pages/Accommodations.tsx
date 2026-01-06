import Navigation from "@/components/Navigation";

export default function Accommodations() {
  return (
    <div className="page-wrapper">
      <Navigation />
      <main className="page-main">
        <div className="page-content">
          <h1 className="page-title">Accommodations</h1>
          <p className="page-placeholder">
            This page will contain hotel recommendations, room blocks, and accommodation details for the wedding weekend.
          </p>
          <p className="page-prompt">
            Continue prompting to fill in this page content.
          </p>
        </div>
      </main>
      <style>{`
        .page-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #ffffff;
          font-family: "orpheuspro", serif;
        }

        .page-main {
          flex: 1;
          padding: 4rem 2rem;
        }

        .page-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .page-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.02em;
        }

        .page-placeholder {
          font-size: 1rem;
          line-height: 1.8;
          color: #666666;
          margin: 0 0 1rem 0;
        }

        .page-prompt {
          font-size: 0.95rem;
          color: #999999;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 2rem;
          }

          .page-main {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
