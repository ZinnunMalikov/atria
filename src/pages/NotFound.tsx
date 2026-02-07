import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 turing-bg" />
        <div className="absolute inset-0 turing-grid opacity-35" />
        <div className="absolute inset-0 turing-lines turing-fade opacity-50" />
      </div>
      <div className="relative text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Page not found
        </p>
        <h1 className="mt-3 text-5xl font-semibold text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          We couldn’t find that route. Head back to the main console.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full border border-border/60 bg-background/80 px-5 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
