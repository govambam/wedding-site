export default function Atitlan() {
  return (
    <div className="page-content-wrapper">
      <div className="page-content">
        <h1 className="page-title">Lake Atitlan</h1>
        <p className="page-placeholder">
          This page will contain information about our optional Lake Atitlan excursion and activities for invited guests.
        </p>
        <p className="page-prompt">
          Continue prompting to fill in this page content.
        </p>
      </div>
      <style>{`
        .page-content-wrapper {
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
          font-family: "orpheuspro", serif;
        }

        .page-placeholder {
          font-size: 1rem;
          line-height: 1.8;
          color: #666666;
          margin: 0 0 1rem 0;
          font-family: "orpheuspro", serif;
        }

        .page-prompt {
          font-size: 0.95rem;
          color: #999999;
          font-style: italic;
          font-family: "orpheuspro", serif;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 2rem;
          }

          .page-content-wrapper {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
