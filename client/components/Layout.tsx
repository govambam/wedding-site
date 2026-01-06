import Navigation from "./Navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="layout-wrapper">
      <Navigation />
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}

// Add persistent layout styles
const layoutStyles = `
  .layout-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: #ffffff;
    font-family: "orpheuspro", serif;
  }

  .layout-main {
    flex: 1;
  }
`;

// Inject styles
const style = document.createElement('style');
style.textContent = layoutStyles;
document.head.appendChild(style);
