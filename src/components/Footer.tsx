import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          {/* Logo & Description */}
          <div className="max-w-sm">
            <a href="/" className="flex items-center gap-2 mb-4">
              <img
                src="/atria-logo.png"
                alt="Atria logo"
                className="h-9 w-9"
              />
              <span className="font-display font-bold text-xl">Atria</span>
            </a>
            <p className="text-sm text-background/60 mb-6">
              Real-time ER tracking and optimization. Transform movement data 
              into actionable insights for better patient care.
            </p>
            <Button variant="outline" className="bg-transparent border-background/20 text-background hover:bg-background/10">
              Request Access
            </Button>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h4 className="font-medium text-sm mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#demo" className="text-sm text-background/60 hover:text-background transition-colors">Demo</a></li>
                <li><a href="#workflow" className="text-sm text-background/60 hover:text-background transition-colors">How It Works</a></li>
                <li><a href="#stats" className="text-sm text-background/60 hover:text-background transition-colors">Results</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-background/60 hover:text-background transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm text-background/60 hover:text-background transition-colors">API Reference</a></li>
                <li><a href="#" className="text-sm text-background/60 hover:text-background transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-background/60 hover:text-background transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-background/60 hover:text-background transition-colors">Contact</a></li>
                <li><a href="#" className="text-sm text-background/60 hover:text-background transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/60">
            © 2026 Atria. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-background/60 hover:text-background transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm text-background/60 hover:text-background transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
