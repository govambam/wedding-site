export default function Wedding() {
  return (
    <div className="wedding-wrapper">
      <div className="wedding-container">
        <h1 className="wedding-title">Wedding Details</h1>

        <p className="wedding-intro">
          The wedding will be held on Thursday, January 7, 2027. We'll start
          with a nonsectarian ceremony, then move to the hotel for the
          reception.
        </p>

        <div className="wedding-divider"></div>

        <p className="wedding-dress-code">
          Dress code will be black tie optional.
        </p>

        <div className="wedding-events-grid">
          {/* Ceremony Column */}
          <div className="wedding-event-column">
            <h2 className="wedding-event-heading">Ceremony</h2>

            <div className="wedding-event-time">3:00PM - 4:00PM</div>

            <h3 className="wedding-venue-name">Ruinas De Santa Clara</h3>

            <p className="wedding-address">
              2nd Avenue North and 2nd Street East, Antigua
              <br />
              Guatemala
            </p>
          </div>

          {/* Reception Column */}
          <div className="wedding-event-column">
            <h2 className="wedding-event-heading">Reception</h2>

            <div className="wedding-event-time">5:00PM - 10:00PM</div>

            <h3 className="wedding-venue-name">Villa Bokeh</h3>

            <p className="wedding-address">
              San Pedro Panorama, Sacatepéquez, Lote C3,
              <br />
              Entrada a Finca San Nicolás, Guatemala
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .wedding-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .wedding-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .wedding-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 3rem 0 2rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .wedding-intro {
          font-size: 1.125rem;
          line-height: 1.8;
          color: #333333;
          margin: 2rem auto;
          max-width: 600px;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .wedding-divider {
          width: 200px;
          height: 1px;
          background-color: #d5d5d5;
          margin: 2rem auto;
        }

        .wedding-dress-code {
          font-size: 1rem;
          line-height: 1.6;
          color: #666666;
          margin: 2rem auto;
          max-width: 600px;
          text-align: center;
          font-family: "orpheuspro", serif;
          font-style: italic;
        }

        .wedding-events-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin: 3rem auto;
          max-width: 700px;
        }

        .wedding-event-column {
          text-align: center;
        }

        .wedding-event-heading {
          font-size: 0.875rem;
          font-weight: 400;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #000000;
          margin: 0 0 1.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .wedding-event-time {
          font-size: 1.25rem;
          font-weight: 400;
          color: #000000;
          margin: 0 0 1.5rem 0;
          font-family: "orpheuspro", serif;
          letter-spacing: 0.01em;
        }

        .wedding-venue-name {
          font-size: 1.125rem;
          font-weight: 400;
          color: #000000;
          margin: 1.5rem 0 1rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .wedding-address {
          font-size: 1rem;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        @media (max-width: 768px) {
          .wedding-wrapper {
            padding: 1rem 0.75rem;
          }

          .wedding-title {
            font-size: 2rem;
            margin: 2rem 0 1.5rem 0;
          }

          .wedding-intro {
            font-size: 1rem;
            margin: 1.5rem auto;
          }

          .wedding-divider {
            margin: 1.5rem auto;
          }

          .wedding-dress-code {
            font-size: 0.95rem;
            margin: 1.5rem auto;
          }

          .wedding-events-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
            margin: 2rem auto;
          }

          .wedding-event-heading {
            font-size: 0.8rem;
            margin-bottom: 1rem;
          }

          .wedding-event-time {
            font-size: 1.1rem;
            margin-bottom: 1rem;
          }

          .wedding-venue-name {
            font-size: 1rem;
            margin: 1rem 0 0.75rem 0;
          }

          .wedding-address {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}
